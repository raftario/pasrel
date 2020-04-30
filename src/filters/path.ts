import * as reply from "../reply";
import { Any, Class, List, T } from "ts-toolbelt";
import { Filter, FilterFn, Tuple, filter } from "../filter";
import { _urlFromRequest } from "./url";
import { any } from "..";

export interface ExactSegment {
    _pathSegmentType: "exact";
    value: string;
}

export interface StringSegment {
    _pathSegmentType: "string";
}
export interface NumberSegment {
    _pathSegmentType: "number";
}
export interface BooleanSegment {
    _pathSegmentType: "boolean";
}

export type ExtractSegment = StringSegment | NumberSegment | BooleanSegment;
export type Segment = ExactSegment | ExtractSegment;

export function segment(segment: string): Filter<[ExactSegment]> {
    return filter([{ _pathSegmentType: "exact", value: segment }], 0);
}

export const string: Filter<[StringSegment]> = filter(
    [{ _pathSegmentType: "string" }],
    0
);
export const number: Filter<[NumberSegment]> = filter(
    [{ _pathSegmentType: "number" }],
    0
);
export const boolean: Filter<[BooleanSegment]> = filter(
    [{ _pathSegmentType: "boolean" }],
    0
);

type End<A extends Tuple> = List.Filter<
    {
        [I in keyof A]: A[I] extends StringSegment
            ? string
            : A[I] extends NumberSegment
            ? number
            : A[I] extends BooleanSegment
            ? boolean
            : A[I];
    },
    ExactSegment
>;

export async function end<T extends Tuple>(
    ...args: T
): Promise<FilterFn<End<T>>> {
    const segments: Segment[] = [];
    const newArgs: unknown[] = [];
    for (const arg of args) {
        if (
            arg !== undefined &&
            arg !== null &&
            typeof arg === "object" &&
            "_pathSegmentType" in arg!
        ) {
            segments.push(arg as Segment);
        } else {
            newArgs.push(arg);
        }
    }
    return async (request): Promise<End<T>> => {
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

        return (newArgs as unknown) as End<T>;
    };
}

type Param = string | typeof String | typeof Number | typeof Boolean;
type Params<A extends Param[]> = List.Filter<
    {
        [I in keyof A]: Any.Equals<A[I], string> extends true
            ? null
            : A[I] extends Class.Class
            ? string extends Class.InstanceOf<A[I]>
                ? StringSegment
                : number extends Class.InstanceOf<A[I]>
                ? NumberSegment
                : boolean extends Class.InstanceOf<A[I]>
                ? BooleanSegment
                : never
            : ExactSegment;
    },
    null
>;

export function segments<T extends Param[]>(...args: T): Filter<Params<T>> {
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
    return f as Filter<Params<T>>;
}

export function path<T extends Param[]>(...args: T): Filter<End<Params<T>>> {
    return (((segments(...args) as unknown) as Filter<[]>).map(
        end
    ) as unknown) as Filter<End<Params<T>>>;
}

export const root: Filter<[]> = filter(async (request) => {
    const path = (await _urlFromRequest(request)).pathname;
    if (path.length === 0 || path === "/") {
        return [];
    } else {
        throw reply.status(404);
    }
});
