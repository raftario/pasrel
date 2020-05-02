/**
 * Error management types and utilities
 * @packageDocumentation
 */

import * as reply from "./reply";
import { Recover, filter } from "./filter";
import { Reply } from ".";

/**
 * Error thrown by filters
 */
export interface Error<T = unknown> {
    /**
     * Error
     */
    error: T;
    /**
     * Weight
     *
     * This is used to determine which error to propagate when there are two possibilities.
     * Errors with a higher weight will be propagated ones with a smaller weight to make sure errors makes sense.
     * A higher weight usually means an error is more specific.
     *
     * For instance, if a request matches a path, then every condition for a given route except one,
     * it will still go through every other filter chained with `or`.
     * If there was no weighting in place, the last thrown error would be sent to the user,
     * so in that case the user would probably get something like a 404 error insteand of a more specific one.
     */
    weight: number;
}

/**
 * Wraps a value inside an [[`Error`]] if it isn't already one
 *
 * @param value - Value to be wrapped inside an [[`Error`]]
 * @param weight - Weight
 */
export function asError(value: unknown, weight: number): Error {
    if (value === undefined || value === null) {
        return {
            error: "Error",
            weight,
        };
    }
    if (
        typeof value === "object" &&
        "error" in value! &&
        typeof (value as Error).weight === "number"
    ) {
        return value as Error;
    } else {
        return {
            error: value,
            weight,
        };
    }
}

/**
 * Tries to convert the given value to a [[`Reply`]]
 *
 * @param value - Value to try to return as a reply
 *
 * @returns A [[`Reply`]] if the value could be converted, `null` if it couldn't
 */
export function asReply(value: unknown): Reply | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === "object" && (value as Reply)._ === "reply") {
        return value as Reply;
    }
    if (Array.isArray(value) && value.length >= 1) {
        return asReply(value[0]);
    }
    if (typeof value === "object" && "error" in value!) {
        return asReply((value as Error).error);
    }
    return undefined;
}

/**
 * Default recovery function used by the server internally
 *
 * This function transforms any [[`Error`]] into a [[`Reply`]]
 *
 * @param error - Error
 */
export const recover: Recover<[Reply]> = async (error) =>
    filter(
        async (): Promise<[Reply]> => {
            const r = asReply(error.error);
            if (r !== undefined) {
                return [r];
            } else {
                console.error(error);
                return reply.status(500);
            }
        }
    );
