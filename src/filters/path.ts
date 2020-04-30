import * as reply from "../reply";
import { Any, Class, List, T } from "ts-toolbelt";
import { Filter, FilterFn, Tuple, filter } from "../filter";
import { _urlFromRequest } from "./url";
import { any } from "..";

export interface ExactPathSegment {
    _pathSegmentType: "exact";
    value: string;
}

export interface StringPathSegment {
    _pathSegmentType: "string";
}
export interface NumberPathSegment {
    _pathSegmentType: "number";
}
export interface BooleanPathSegment {
    _pathSegmentType: "boolean";
}

export type ExtractPathSegment =
    | StringPathSegment
    | NumberPathSegment
    | BooleanPathSegment;
export type PathSegment = ExactPathSegment | ExtractPathSegment;

export function segment(segment: string): Filter<[ExactPathSegment]> {
    return filter([{ _pathSegmentType: "exact", value: segment }], 0);
}

export const string: Filter<[StringPathSegment]> = filter(
    [{ _pathSegmentType: "string" }],
    0
);
export const number: Filter<[NumberPathSegment]> = filter(
    [{ _pathSegmentType: "number" }],
    0
);
export const boolean: Filter<[BooleanPathSegment]> = filter(
    [{ _pathSegmentType: "boolean" }],
    0
);

type EndFilter<A extends Tuple> = List.Filter<
    {
        [I in keyof A]: A[I] extends StringPathSegment
            ? string
            : A[I] extends NumberPathSegment
            ? number
            : A[I] extends BooleanPathSegment
            ? boolean
            : A[I];
    },
    ExactPathSegment
>;

export async function end<T extends Tuple>(
    ...args: T
): Promise<FilterFn<EndFilter<T>>> {
    const segments: PathSegment[] = [];
    const newArgs: unknown[] = [];
    for (const arg of args) {
        if (
            arg !== undefined &&
            arg !== null &&
            typeof arg === "object" &&
            "_pathSegmentType" in arg!
        ) {
            segments.push(arg as PathSegment);
        } else {
            newArgs.push(arg);
        }
    }
    return async (request): Promise<EndFilter<T>> => {
        const urlSegments =
            (await _urlFromRequest(request)).pathname
                .split("/")
                .filter((s) => s !== "") || [];

        if (segments.length !== urlSegments.length) {
            throw reply.status(404);
        }

        for (const [i, segment] of segments.entries()) {
            if (segment._pathSegmentType === "exact") {
                if (segment.value !== urlSegments[i]) {
                    throw reply.status(404);
                }
            } else if (segment._pathSegmentType === "string") {
                newArgs.push(urlSegments[i]);
            } else if (segment._pathSegmentType === "number") {
                const n = Number(urlSegments[i]);
                if (isNaN(n)) {
                    throw reply.status(404);
                } else {
                    newArgs.push(n);
                }
            } else if (segment._pathSegmentType === "boolean") {
                const b = urlSegments[i].toLowerCase();
                if (b === "true") {
                    newArgs.push(true);
                } else if (b === "false") {
                    newArgs.push(false);
                } else {
                    throw reply.status(404);
                }
            }
        }

        return (newArgs as unknown) as EndFilter<T>;
    };
}

type PathParam = string | typeof String | typeof Number | typeof Boolean;
type PathParamSegment<A extends PathParam[]> = List.Filter<
    {
        [I in keyof A]: Any.Equals<A[I], string> extends true
            ? null
            : A[I] extends Class.Class
            ? string extends Class.InstanceOf<A[I]>
                ? StringPathSegment
                : number extends Class.InstanceOf<A[I]>
                ? NumberPathSegment
                : boolean extends Class.InstanceOf<A[I]>
                ? BooleanPathSegment
                : never
            : ExactPathSegment;
    },
    null
>;

export function segments<T extends PathParam[]>(
    ...args: T
): Filter<PathParamSegment<T>> {
    let f: unknown = any;
    for (const arg of args) {
        if (typeof arg === "string") {
            f = (f as Filter<[]>).and(segment(arg));
        } else if (arg === String) {
            f = (f as Filter<[]>).and(string);
        } else if (arg === Number) {
            f = (f as Filter<[]>).and(number);
        } else if (arg === Boolean) {
            f = (f as Filter<[]>).and(boolean);
        }
    }
    return f as Filter<PathParamSegment<T>>;
}

export function path<T extends PathParam[]>(
    ...args: T
): Filter<EndFilter<PathParamSegment<T>>> {
    return (((segments(...args) as unknown) as Filter<[]>).map(
        end
    ) as unknown) as Filter<EndFilter<PathParamSegment<T>>>;
}

export const root: Filter<[]> = filter(async (request) => {
    const path = (await _urlFromRequest(request)).pathname;
    if (path.length === 0 || path === "/") {
        return [];
    } else {
        throw reply.status(404);
    }
});
