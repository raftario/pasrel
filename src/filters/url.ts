/**
 * Filters for extracting URLs
 * @packageDocumentation
 */

import { Filter, filter } from "../filter";
import { Request } from "..";

/** @internal */
export async function _urlFromRequest(request: Request): Promise<URL> {
    const url = request.url;
    if (url === undefined) {
        throw new Error("Missing URL");
    }
    return new URL(url, `http://${request.headers.host}`);
}

/**
 * Extracts the request URL
 */
export const url: Filter<[URL]> = filter(async (request) => [
    await _urlFromRequest(request),
]);
