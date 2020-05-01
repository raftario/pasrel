import * as reply from "../reply";
import { Class, List } from "ts-toolbelt";
import { Filter, Finite } from "../filter";
import { any } from "..";

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

export const string: Filter<[string]> = new Filter(async (request, depth) => {
    if (depth >= request.pathSegments.length) {
        throw reply.status(404);
    }
    return { tuple: [request.pathSegments[depth]], depth: depth + 1 };
}, 0);
export const number: Filter<[number]> = new Filter(async (request, depth) => {
    if (depth >= request.pathSegments.length) {
        throw reply.status(404);
    }
    const n = Number(request.pathSegments[depth]);
    if (isNaN(n)) {
        throw reply.status(404);
    }
    return { tuple: [n], depth: depth + 1 };
}, 0);
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

export const end: Filter<[]> = new Filter(async (request, depth) => {
    if (depth == request.pathSegments.length) {
        return { tuple: [], depth };
    } else {
        throw reply.status(404);
    }
}, 1);

type PathSegment = string | typeof String | typeof Number | typeof Boolean;
type Path<S extends PathSegment[]> = List.Filter<
    {
        [I in keyof S]: S[I] extends Class.Class
            ? string extends Class.InstanceOf<S[I]>
                ? string
                : number extends Class.InstanceOf<S[I]>
                ? number
                : boolean extends Class.InstanceOf<S[I]>
                ? boolean
                : never
            : null;
    },
    null
>;

export function path<S extends PathSegment[]>(
    ...segments: S
): Filter<Finite<Path<S>>> {
    if (segment.length === 0) {
        return (end as unknown) as Filter<Finite<Path<S>>>;
    }

    let f: Filter<unknown[]> = any;
    for (const s of segments) {
        if (s === String) {
            f = f.and(string);
        } else if (s === Number) {
            f = f.and(number);
        } else if (s === Boolean) {
            f = f.and(boolean);
        } else {
            f = f.and(segment(s as string));
        }
    }
    return (f.and(end) as unknown) as Filter<Finite<Path<S>>>;
}
