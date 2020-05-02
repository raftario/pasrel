/**
 * Filters for request headers extraction
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter, filter } from "../filter";

/**
 * Extracts an optional header
 *
 * @param name - Header name
 *
 * @returns Optional header value
 */
export function optional(name: string): Filter<[string | undefined]> {
    return filter(async (request) => [
        request.headers[name.toLowerCase()]?.toString(),
    ]);
}

/**
 * Extracts a required header
 *
 * @param name - Header name
 *
 * @returns Header value
 */
export function required(name: string): Filter<[string]> {
    return filter(async (request) => {
        const h = request.headers[name.toLowerCase()]?.toString();
        if (h !== undefined) {
            return [h];
        }
        throw reply.text(`Missing header "${name}"`, 400);
    });
}

/**
 * Checks that the request has the header with the provided name exactly matching the provided value
 *
 * @param name - Header name
 * @param value - Header value
 */
export function exact(name: string, value: string | undefined): Filter<[]> {
    return filter(async (request) => {
        const h = request.headers[name.toLowerCase()]?.toString();
        if (h === value) {
            return [];
        }
        throw reply.text(`Invalid header "${name}"`, 400);
    });
}
