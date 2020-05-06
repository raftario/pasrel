/**
 * Filters for serving static files
 * @packageDocumentation
 */

import * as fs from "fs";
import * as nodePath from "path";
import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Reply } from "..";
import { asError } from "../error";
import { getType } from "mime";

/** @internal */
function _stat(path: string): Promise<fs.Stats> {
    return new Promise((res, rej) =>
        fs.stat(path, (err, stats) => {
            if (err) {
                if (err.code === "ENOENT") {
                    rej(reply.status(404));
                } else {
                    rej(err);
                }
            }
            res(stats);
        })
    );
}

/** @internal */
async function _readToReply(path: string, index: boolean): Promise<[Reply]> {
    let stats = await _stat(path);
    if (!stats.isFile()) {
        if (index) {
            stats = await _stat(nodePath.join(path, "index.html"));
            if (!stats.isFile()) {
                throw reply.status(404);
            }
        } else {
            throw reply.status(404);
        }
    }

    const mime = getType(path) || undefined;
    const options: { encoding?: string } = {};
    const isText =
        mime?.startsWith("test") || mime === "application/javascript";
    if (isText) {
        options.encoding = "utf-8";
    }

    const data: Buffer | string = await new Promise((res, rej) => {
        fs.readFile(path, options, (err, data) => {
            if (err) {
                console.error(err);
                rej(reply.status(500));
            }
            res(data);
        });
    });

    if (isText) {
        return reply.text(data as string, 200, {
            "Content-Type": `${mime}; charset=utf-8`,
        });
    } else {
        const isMedia =
            mime?.startsWith("image") ||
            mime?.startsWith("video") ||
            mime?.startsWith("audio");

        return reply.raw(data, 200, {
            "Content-Type": mime,
            "Content-Disposition": `${
                isMedia ? "inline" : "attachment"
            }; filename="${nodePath.basename(path)}"`,
        });
    }
}

/**
 * Serves a static file
 *
 * @param path - Path to the file
 */
export function file(path: string): Filter<[Reply]> {
    return filter(() => _readToReply(path, false));
}

/**
 * Serves as static directory and its subdirectories
 *
 * @param path - Path to the directory
 * @param index - Whether to look for an `index.html` file in a directory when the directory itself is requested
 */
export function directory(path: string, index = true): Filter<[Reply]> {
    return new Filter(async (request, weight, depth) => {
        const relPath = request.pathSegments.slice(depth);
        const fullPath = nodePath.join(path, ...relPath);
        try {
            return {
                tuple: await _readToReply(fullPath, index),
                weight: weight + 1,
                depth: depth + relPath.length,
            };
        } catch (err) {
            throw asError(err, weight + 1);
        }
    });
}
