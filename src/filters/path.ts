/**
 * Filters for handling paths and routing
 *
 * They should generally come first whenever possible to prevent weird errors
 *
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter as FilterType, IsInstanceOf, Tuple } from "../types";
import { Filter } from "../filter";
import { any } from "..";

/**
 * Matches an exact path segment
 * @param literal - Segment to match
 */
export function segment(literal: string): Filter<[]> {
    return new Filter(async (request, depth) => {
        if (depth >= request.pathSegments.length) {
            throw reply.status(404);
        }
        if (request.pathSegments[depth] !== literal) {
            throw reply.status(404);
        }
        return { tuple: [], depth: depth + 1 };
    }, 0);
}

/**
 * Matches an arbitrary string and extracts it
 */
export const string: Filter<[string]> = new Filter(async (request, depth) => {
    if (depth >= request.pathSegments.length) {
        throw reply.status(404);
    }
    return { tuple: [request.pathSegments[depth]], depth: depth + 1 };
}, 0);

/**
 * Matches an arbitrary number and extracts it
 */
export const number: Filter<[number]> = new Filter(async (request, depth) => {
    if (depth >= request.pathSegments.length) {
        throw reply.status(404);
    }
    const n = Number(request.pathSegments[depth]);
    if (Number.isNaN(n)) {
        throw reply.status(404);
    }
    return { tuple: [n], depth: depth + 1 };
}, 0);

/**
 * Matches an arbitrary boolean and extracts it
 */
export const boolean: Filter<[boolean]> = new Filter(async (request, depth) => {
    if (depth >= request.pathSegments.length) {
        throw reply.status(404);
    }
    if (request.pathSegments[depth] === "true") {
        return { tuple: [true as boolean], depth: depth + 1 };
    } else if (request.pathSegments[depth] === "false") {
        return { tuple: [false as boolean], depth: depth + 1 };
    } else {
        throw reply.status(404);
    }
}, 0);

/**
 * Matches the end of a path
 */
export const end: Filter<[]> = new Filter(async (request, depth) => {
    if (depth == request.pathSegments.length) {
        return { tuple: [], depth };
    } else {
        throw reply.status(404);
    }
}, 1);

/**
 * Possible types of arguments to [[`partial`]] and [[`path`]]
 */
type PathSegment = string | typeof String | typeof Number | typeof Boolean;

/**
 * Maps [[`PathSegment`]]s to their counterpart extracted types
 */
type Path<S extends Tuple<PathSegment>> = FilterType<
    {
        [I in keyof S]: true extends IsInstanceOf<string, S[I]>
            ? string
            : true extends IsInstanceOf<number, S[I]>
            ? number
            : true extends IsInstanceOf<boolean, S[I]>
            ? boolean
            : null;
    }
>;

/**
 * Chains multiple path segments into a partial path and extracts their values
 *
 * This filter should only be used if additional path segments follow it,
 * in other cases prefer [[`path`]].
 *
 * Under the hood, this filter just chains [[`segment`]]s, [[`string`]]s, [[`number`]]s and [[`boolean`]]s.
 *
 * @param segments - Path segments (must have a known length)
 */
export function partial<S extends Tuple<PathSegment>>(
    ...segments: S
): Filter<Path<S>> {
    let f = any;
    for (const s of segments) {
        if (s === String) {
            f = (f.and(string) as unknown) as Filter<[]>;
        } else if (s === Number) {
            f = (f.and(number) as unknown) as Filter<[]>;
        } else if (s === Boolean) {
            f = (f.and(boolean) as unknown) as Filter<[]>;
        } else {
            f = f.and(segment(s as string));
        }
    }
    return (f as unknown) as Filter<Path<S>>;
}

/**
 * Chains multiple path segments into a full path and extracts their values
 *
 * ```ts
 * // Will match /2/plus/2
 * // Generic type annotation not required, only present for clarity's sake
 * const sum: Filter<[number, number]> = path(Number, "plus", Number);
 * ```
 *
 * This filter should only be used if no other path segments follow it,
 * in other cases prefer [[`partial`]].
 *
 * Under the hood, this filter just chains [[`partial`]] and [[`end`]].
 *
 * @param segments - Path segments (must have a known length)
 */
export function path<S extends Tuple<PathSegment>>(
    ...segments: S
): Filter<Path<S>> {
    if (segments.length === 0) {
        return (end as unknown) as Filter<Path<S>>;
    }
    return (partial(...segments).and(end) as unknown) as Filter<Path<S>>;
}
