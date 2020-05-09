/**
 * Definition of [[`Filter`]], the basic building block
 * @packageDocumentation
 */

import { Concat, Tuple } from "./types";
import { Error, asError } from "./error";
import { Request } from ".";

/**
 * Return type of [[`FilterFn`]]
 */
export interface FilterRet<T extends Tuple> {
    /**
     * Extracted variables
     */
    tuple: T;
    /**
     * Weight
     */
    weight: number;
    /**
     * Depth
     */
    depth: number;
}
/**
 * Function run by [[`Filter`]] for each request
 *
 * @typeParam T - Extracted variables
 */
export type FilterFn<T extends Tuple> = (
    request: Request,
    weight: number,
    depth: number
) => Promise<FilterRet<T>>;

/**
 * The base building block for all routes routes
 *
 * Filters extract variables from a request
 * and can be chained using the various combinator methods
 *
 * @typeParam T - Variables extracted by the filter (must have a known length)
 */
export class Filter<T extends Tuple> {
    /**
     * Function run for each request going through this filter
     */
    readonly run: FilterFn<T>;

    /**
     * Creates a new filter
     *
     * Unless you need a lot of flexibility, prefer the simpler [[`filter`]] function for cleaner code.
     * You also need to wrap the rejections manually when using this constructor,
     * which can be done using the [[`asError`]] function.
     *
     * @param f - [[`run`]] function
     */
    constructor(f: FilterFn<T>) {
        this.run = f;
    }

    /**
     * Creates a new filter that runs the current filter, then the provided filter,
     * then combines their extracted variables
     *
     * @param f - Other filter
     */
    and<U extends Tuple>(f: Filter<U>): Filter<Concat<T, U>> {
        return new Filter(async (request, weight, depth) => {
            const t = await this.run(request, weight, depth);
            const u = await f.run(request, t.weight, t.depth);
            return {
                tuple: ([...t.tuple, ...u.tuple] as unknown) as Concat<T, U>,
                weight: u.weight,
                depth: u.depth,
            };
        });
    }

    /**
     * Creates a filter that runs the current filter,
     * or the provided filter if the current one fails
     *
     * @param f - Other filter
     */
    or(f: Filter<T>): Filter<T> {
        return new Filter(async (request, weight, depth) => {
            try {
                return await this.run(request, weight, depth);
            } catch (e1) {
                try {
                    return await f.run(request, weight, depth);
                } catch (e2) {
                    throw e1.weight >= e2.weight ? e1 : e2;
                }
            }
        });
    }

    /**
     * Creates a filter that maps the previously extracted variables to new ones
     *
     * @param fn - Mapping function
     */
    map<U extends Tuple>(fn: Map<T, U>): Filter<U> {
        return new Filter(async (request, weight, depth) => {
            const t = await this.run(request, weight, depth);

            let f: Filter<U> | U;
            try {
                f = await fn(...t.tuple);
            } catch (err) {
                throw asError(err, t.weight);
            }

            if (f instanceof Filter) {
                return f.run(request, t.weight, t.depth);
            } else {
                return { tuple: f, weight: t.weight, depth: t.depth };
            }
        });
    }

    /**
     * Creates a filter that runs the current filter and handle possible errors
     *
     * @param fn - Recovery function
     */
    recover(fn: Recover<T>): Filter<T> {
        return new Filter(async (request, weight, depth) => {
            try {
                return await this.run(request, weight, depth);
            } catch (err) {
                let f: Filter<T> | T;
                try {
                    f = await fn(err);
                } catch (err) {
                    throw asError(err, weight);
                }

                if (f instanceof Filter) {
                    return f.run(request, weight, depth);
                } else {
                    return { tuple: f, weight, depth };
                }
            }
        });
    }

    /**
     * Creates a filter that wraps the current filter
     *
     * @param fn - Wrapper function
     */
    with(fn: With<T>): Filter<T> {
        return new Filter(async (request, weight, depth) => {
            const f = await fn(this);
            return await f.run(request, weight, depth);
        });
    }
}

/**
 * Mapping function used to convert previously extracted variables to something else
 *
 * @typeParam T - Previously extracted variables
 * @typeParam U - Mapped variables
 *
 * @returns - Either a function that returns the mapped variables or the mapped variables directly
 */
export type Map<T extends Tuple, U extends Tuple> = (
    ...args: T
) => Promise<Filter<U> | U>;

/**
 * Recovery function used to recover from errors
 *
 * @typeParam T - Extracted variables
 *
 * @returns New filter
 */
export type Recover<T extends Tuple> = (error: Error) => Promise<Filter<T> | T>;

/**
 * Wrapping function used to wrap some functionality around a filter
 *
 * @typeParam T - Extracted variables
 *
 * @returns Wrapped filter
 */
export type With<T extends Tuple> = (filter: Filter<T>) => Promise<Filter<T>>;

/**
 * Creates a new filter using the providing function
 *
 * @typeParam T - Extracted variables (must have a known length)
 *
 * @param fn - Function to pass requests through
 * @param weight - Weight of the filter (defaults to 1)
 */
export function filter<T extends Tuple>(
    fn: (request: Request) => Promise<T>,
    weight?: number
): Filter<T>;
/**
 * Creates a new filter immediately extracting the provided variables
 *
 * @typeParam T - Extracted variables (must have a known length)
 *
 * @param value - Extracted variables
 * @param weight - Weight of the filter (defaults to 1)
 */
export function filter<T extends Tuple>(value: T, weight?: number): Filter<T>;
export function filter<T extends Tuple>(
    arg: ((request: Request) => Promise<T>) | T,
    weight = 1
): Filter<T> {
    if (typeof arg === "function") {
        return new Filter(async (r, w, d) => {
            try {
                return {
                    tuple: await arg(r),
                    weight: w + weight,
                    depth: d,
                };
            } catch (err) {
                throw asError(err, w + weight);
            }
        });
    } else {
        return new Filter(async (r, w, d) => ({
            tuple: arg,
            weight: w + weight,
            depth: d,
        }));
    }
}
