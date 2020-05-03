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
type FilterRet<T extends Tuple> = {
    /**
     * Extracted variables
     */
    tuple: T;
    /**
     * New depth
     */
    depth: number;
};
/**
 * Function run by [[`Filter`]] for each request
 *
 * @typeParam T - Extracted variables
 */
type FilterFn<T extends Tuple> = (
    request: Request,
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
     * Weight of this filter
     *
     * The weight represents the relative complexity of a filter
     * and is attached to errors thrown by it to determine which errors to propagate
     */
    readonly weight: number;
    /**
     * Function run for each request going through this filter
     */
    readonly run: FilterFn<T>;

    /**
     * Creates a new filter
     *
     * Unless you need to play with the path, prefer the simpler [[`filter`]]
     *
     * @param f - [[`run`]] function
     * @param weight - [[`weight`]]
     */
    constructor(f: FilterFn<T>, weight: number) {
        this.weight = weight;
        this.run = async (request, depth): Promise<FilterRet<T>> => {
            try {
                return await f(request, depth);
            } catch (err) {
                throw asError(err, this.weight);
            }
        };
    }

    /**
     * Creates a new filter that runs the current filter, then the provided filter,
     * then combines their extracted variables
     *
     * The weight of the resulting filter is the sum of the weights of the two combined filters.
     *
     * @param f - Other filter
     */
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

    /**
     * Creates a filter that runs the current filter,
     * or the provided filter if the current one fails
     *
     * The weigth of the resulting filter is the highest one between the two combined filters.
     *
     * @param f - Other filter
     */
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

    /**
     * Creates a filter that maps the previously extracted variables to new ones
     *
     * Increases the weight by one.
     *
     * @param fn - Mapping function
     */
    map<U extends Tuple>(fn: Map<T, U>): Filter<U> {
        return new Filter(async (request, depth) => {
            const args = (await this.run(request, depth)).tuple;
            const f = await fn(...args);
            if (f instanceof Filter) {
                return f.run(request, depth);
            } else {
                return { tuple: f, depth };
            }
        }, this.weight + 1);
    }

    /**
     * Creates a filter that runs the current filter and handle possible errors
     *
     * @param fn - Recovery function
     */
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

    /**
     * Creates a filter that wraps the current filter
     *
     * @param fn - Wrapper function
     */
    with(fn: With<T>): Filter<T> {
        return new Filter(async (request, depth) => {
            const f = await fn(this);
            return await f.run(request, depth);
        }, this.weight);
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
export type Recover<T extends Tuple> = (error: Error) => Promise<Filter<T>>;

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
 * @param weight - Weight of the filter (defaults to 0)
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
 * @param weight - Weight of the filter (defaults to 0)
 */
export function filter<T extends Tuple>(value: T, weight?: number): Filter<T>;
export function filter<T extends Tuple>(
    arg: ((request: Request) => Promise<T>) | T,
    weight = 1
): Filter<T> {
    if (typeof arg === "function") {
        return new Filter(
            async (request, depth) => ({
                tuple: await arg(request),
                depth,
            }),
            weight
        );
    } else {
        return new Filter(
            async (request, depth) => ({
                tuple: arg,
                depth,
            }),
            weight
        );
    }
}
