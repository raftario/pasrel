/**
 * Filters for extracting query strings
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Class } from "ts-toolbelt";
import { _urlFromRequest } from "./url";

/**
 * Schema for query string validation and extraction
 */
export type QuerySchema = {
    [key: string]:
        | typeof String
        | typeof Number
        | typeof Boolean
        | {
              optional: true;
              type: typeof String | typeof Number;
          };
};

/**
 * Converts a [[`QuerySchema`]] to the type it represents
 */
type Query<S extends QuerySchema> = {
    [K in keyof S]: S[K] extends Class.Class
        ? string extends Class.InstanceOf<S[K]>
            ? string
            : number extends Class.InstanceOf<S[K]>
            ? number
            : boolean extends Class.InstanceOf<S[K]>
            ? boolean
            : never
        : S[K] extends { optional: true; type: infer T }
        ? T extends Class.Class
            ? string extends Class.InstanceOf<T>
                ? string
                : number extends Class.InstanceOf<T>
                ? number
                : never
            : never
        : never;
};

/** @internal */
async function _extractQuery(
    key: string,
    type: typeof String | typeof Number,
    value: string
): Promise<string | number> {
    if (type === String) {
        return value;
    } else if (type === Number) {
        const n = Number(value);
        if (!Number.isNaN(n)) {
            return n;
        } else {
            throw reply.text(`Key "${key}" of query should be a number`, 400);
        }
    } else {
        throw new Error("Invalid schema");
    }
}

/**
 * Validates and extracts the query string following the provided schema
 *
 * ```ts
 * // Will match ?limit=50&strip
 * // Generic type annotation not required, only present for clarity's sake
 * const query: Filter<[
 *     { limit: number; skip?: number; strip: boolean }
 * ]> = query({
 *     limit: Number,
 *     skip: { optional: true, type: Number },
 *     strip: Boolean,
 * });
 * ```
 *
 * @param schema - Schema
 * @param extra - Whether to include extra fields not diescribed in the schema in the extracted object
 */
export function query<T extends QuerySchema>(
    schema: T,
    extra = false
): Filter<[Query<T>]> {
    const entries = Object.entries(schema);
    return filter(async (request) => {
        const q = (await _urlFromRequest(request)).searchParams;
        const result: {
            [key: string]: string | number | boolean | undefined;
        } = {};

        if (extra) {
            for (const [k, v] of q.entries()) {
                result[k] = v;
            }
        }

        for (const [k, v] of entries) {
            const qv = q.get(k);
            if (qv === null) {
                if (v === Boolean) {
                    result[k] = false;
                    continue;
                } else if (typeof v === "object") {
                    result[k] = undefined;
                    continue;
                } else {
                    throw reply.text(`Missing key "${k}" in query`, 400);
                }
            }

            if (v === Boolean) {
                result[k] = true;
            } else if (typeof v === "object") {
                result[k] = await _extractQuery(k, v.type, qv);
            } else {
                result[k] = await _extractQuery(
                    k,
                    v as typeof String | typeof Number,
                    qv
                );
            }
        }

        return [result as Query<T>];
    });
}

/**
 * Extracts the query string
 */
export const any: Filter<[URLSearchParams]> = filter(
    async (request): Promise<[URLSearchParams]> => [
        (await _urlFromRequest(request)).searchParams,
    ]
);

/**
 * Extracts the raw query string
 */
export const raw: Filter<[string]> = filter(async (request) => [
    (await _urlFromRequest(request)).search,
]);
