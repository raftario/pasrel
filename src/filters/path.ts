import * as reply from "../reply";
import { IntoFilter } from "../filter";
import { _urlFromRequest } from "./url";
import { withPriority } from "../error";

export type PathParams = { [key: string]: string };

export function params(path: string): IntoFilter<[PathParams]> {
    const segments = path.split("/").filter((s) => s !== "");

    return async (request): Promise<[PathParams]> => {
        const params: PathParams = {};
        const reqSegments = (await _urlFromRequest(request)).pathname
            .split("/")
            .filter((s) => s !== "");

        if (segments.length !== reqSegments.length) {
            throw withPriority(reply.status(404), 0.2);
        }

        for (const [i, segment] of segments.entries()) {
            if (segment.startsWith(":")) {
                params[segment.slice(1)] = reqSegments[i];
            } else if (segment !== reqSegments[i]) {
                throw withPriority(reply.status(404), 0.2);
            }
        }

        return [params];
    };
}

export function exact(path: string): IntoFilter<[]> {
    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }

    return async (request): Promise<[]> => {
        let reqPath = (await _urlFromRequest(request)).pathname;
        if (reqPath.endsWith("/")) {
            reqPath = reqPath.slice(0, -1);
        }

        if (path !== reqPath) {
            throw withPriority(reply.status(404), 0.2);
        }

        return [];
    };
}

export const root: IntoFilter<[]> = async (request) => {
    const path = (await _urlFromRequest(request)).pathname;
    if (path.length === 0 || path === "/") {
        return [];
    } else {
        throw withPriority(reply.status(404), 0.2);
    }
};

export const raw: IntoFilter<[string]> = async (request) => [
    (await _urlFromRequest(request)).pathname,
];
