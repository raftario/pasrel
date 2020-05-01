/**
 * Filters for checking request methods
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Request } from "..";

/** @internal */
async function _isMethod(request: Request, method: string): Promise<void> {
    if (request.method?.toUpperCase() !== method) {
        throw reply.status(405);
    }
}

/**
 * GET
 */
export const get: Filter<[]> = filter(async (request) => {
    const method = request.method?.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
        throw reply.status(405);
    }
    return [];
});
/**
 * HEAD
 */
export const head: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "HEAD");
    return [];
});
/**
 * POST
 */
export const post: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "POST");
    return [];
});
/**
 * PUT
 */
export const put: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "PUT");
    return [];
});
/**
 * DELETE
 */
export const del: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "DELETE");
    return [];
});
/**
 * CONNECT
 */
export const connect: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "CONNECT");
    return [];
});
/**
 * OPTIONS
 */
export const options: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "OPTIONS");
    return [];
});
/**
 * TRACE
 */
export const trace: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "TRACE");
    return [];
});
/**
 * PATCH
 */
export const patch: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "PATCH");
    return [];
});

/**
 * Extracts the request method
 */
export const extract: Filter<[string]> = filter(async (request) => [
    request.method?.toUpperCase() || "",
]);

/**
 * Checks if the request method matches the provided method
 *
 * @param method - Method to match
 */
export function custom(method: string): Filter<[]> {
    return filter(async (request) => {
        await _isMethod(request, method.toUpperCase());
        return [];
    });
}
