import { Error, asError } from "./error";
import { ConcatMultiple } from "typescript-tuple";
import { Request } from ".";

export type Tuple = unknown[] | [];

export type Map<T extends Tuple, U extends Tuple> = (...args: T) => Promise<U>;

export type Recover<T extends Tuple> = (error: Error) => Promise<Filter<T>>;

export type With<T extends Tuple> = (filter: Filter<T>) => Promise<Filter<T>>;

export type FilterFn<T extends Tuple> = (request: Request) => Promise<T>;

export class Filter<T extends Tuple> {
    readonly weight: number;
    readonly run: (request: Request) => Promise<T>;

    constructor(f: FilterFn<T> | T, weight: number) {
        this.weight = weight;
        if (typeof f === "function") {
            this.run = async (request): Promise<T> => {
                try {
                    return await f(request);
                } catch (err) {
                    throw asError(err, this.weight);
                }
            };
        } else if (f instanceof Array) {
            this.run = async (): Promise<T> => f;
        } else {
            throw new Error("Unhandled type");
        }
    }

    and<U extends Tuple>(f: Filter<U>): Filter<ConcatMultiple<[T, U]>> {
        return new Filter(async (request) => {
            const t = await this.run(request);
            const u = await f.run(request);
            return [...t, ...u] as ConcatMultiple<[T, U]>;
        }, this.weight + f.weight);
    }

    or(f: Filter<T>): Filter<T> {
        return new Filter(async (request) => {
            try {
                return await this.run(request);
            } catch (e1) {
                try {
                    return await f.run(request);
                } catch (e2) {
                    throw e1.weight > e2.weight ? e1 : e2;
                }
            }
        }, Math.max(this.weight, f.weight));
    }

    map<U extends Tuple>(fn: Map<T, U>): Filter<U> {
        return new Filter(async (request) => {
            const args = await this.run(request);
            return await fn(...args);
        }, this.weight + 1);
    }

    recover(fn: Recover<T>): Filter<T> {
        return new Filter(async (request) => {
            try {
                return await this.run(request);
            } catch (err) {
                const f = await fn(err);
                return await f.run(request);
            }
        }, this.weight);
    }

    with(fn: With<T>): Filter<T> {
        return new Filter(async (request) => {
            const f = await fn(this);
            return await f.run(request);
        }, this.weight);
    }
}

export function filter<T extends Tuple>(
    fn: FilterFn<T>,
    weight?: number
): Filter<T>;
export function filter<T extends Tuple>(value: T, weight?: number): Filter<T>;
export function filter<T extends Tuple>(
    arg: FilterFn<T> | T,
    weight = 1
): Filter<T> {
    return new Filter(arg, weight);
}
