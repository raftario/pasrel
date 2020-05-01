import * as fs from "fs";
import * as nodePath from "path";
import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Reply } from "..";
import { getType } from "mime";

function _exists(path: string): Promise<boolean> {
    return new Promise((res) => fs.exists(path, (e) => res(e)));
}

async function _readToReply(path: string, index: boolean): Promise<[Reply]> {
    if (!(await _exists(path))) {
        if (index) {
            path = nodePath.join(path, "index.html");
            if (!(await _exists(path))) {
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

export function file(path: string): Filter<[Reply]> {
    return filter(() => _readToReply(path, false));
}

export function directory(path: string, index = true): Filter<[Reply]> {
    return new Filter(async (request, depth) => {
        const relPath = request.pathSegments.slice(depth);
        const fullPath = nodePath.join(path, ...relPath);
        return {
            tuple: await _readToReply(fullPath, index),
            depth: depth + relPath.length,
        };
    }, 1);
}
