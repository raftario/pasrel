import { Error, asError } from "./error";
import { List } from "ts-toolbelt";
import { Request } from ".";

export type Tuple = readonly unknown[];

export type Finite<T extends Tuple> = number extends T["length"] ? never : T;
export type Concat<T extends Tuple, U extends Tuple> = Finite<
    List.Concat<T, U>
>;

type FilterRet<T extends Tuple> = { tuple: T; depth: number };
type FilterFn<T extends Tuple> = (
    request: Request,
    depth: number
) => Promise<FilterRet<T>>;

export class Filter<T extends Tuple> {
    readonly weight: number;
    readonly run: FilterFn<T>;

    constructor(
        f: (
            request: Request,
            depth: number
        ) => Promise<{ tuple: T; depth: number }>,
        weight: number
    ) {
        this.weight = weight;
        this.run = async (request, depth): Promise<FilterRet<T>> => {
            try {
                return await f(request, depth);
            } catch (err) {
                throw asError(err, this.weight);
            }
        };
    }

    and<U extends Tuple>(f: Filter<U>): Filter<Concat<T, U>> {
        return new Filter(async (request, depth) => {
            const t = await this.run(request, depth);
            const u = await f.run(request, t.depth);
            return {
                tuple: ([...t.tuple, ...u.tuple] as unknown) as Concat<T, U>,
                depth: u.depth,
            };
        }, this.weight + f.weight);
    }
    or(f: Filter<T>): Filter<T> {
        return new Filter(async (request, depth) => {
            try {
                return await this.run(request, depth);
            } catch (e1) {
                try {
                    return await f.run(request, depth);
                } catch (e2) {
                    throw e1.weight >= e2.weight ? e1 : e2;
                }
            }
        }, Math.max(this.weight, f.weight));
    }

    map<U extends Tuple>(fn: Map<T, U>): Filter<Finite<U>> {
        return new Filter(async (request, depth) => {
            const args = (await this.run(request, depth)).tuple;
            const f = await fn(...args);
            if (typeof f === "function") {
                return { tuple: await f(request), depth };
            } else {
                return { tuple: f, depth };
            }
        }, this.weight + 1) as Filter<Finite<U>>;
    }

    recover(fn: Recover<T>): Filter<T> {
        return new Filter(async (request, depth) => {
            try {
                return await this.run(request, depth);
            } catch (err) {
                const f = await fn(err);
                return await f.run(request, depth);
            }
        }, this.weight);
    }

    with(fn: With<T>): Filter<T> {
        return new Filter(async (request, depth) => {
            const f = await fn(this);
            return await f.run(request, depth);
        }, this.weight);
    }
}

export type Map<T extends Tuple, U extends Tuple> = (
    ...args: T
) => Promise<((request: Request) => Promise<U>) | U>;

export type Recover<T extends Tuple> = (error: Error) => Promise<Filter<T>>;

export type With<T extends Tuple> = (filter: Filter<T>) => Promise<Filter<T>>;

export function filter<T extends Tuple>(
    fn: (request: Request) => Promise<T>,
    weight?: number
): Filter<Finite<T>>;
export function filter<T extends Tuple>(
    value: T,
    weight?: number
): Filter<Finite<T>>;
export function filter<T extends Tuple>(
    arg: ((request: Request) => Promise<T>) | T,
    weight = 1
): Filter<Finite<T>> {
    if (typeof arg === "function") {
        return new Filter(
            async (request, depth) => ({
                tuple: await arg(request),
                depth,
            }),
            weight
        ) as Filter<Finite<T>>;
    } else {
        return new Filter(
            async (request, depth) => ({
                tuple: arg,
                depth,
            }),
            weight
        ) as Filter<Finite<T>>;
    }
}
