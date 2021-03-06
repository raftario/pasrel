/**
 * Filters for request body extraction
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { IsInstanceOf, Tuple } from "../types";
import { ParsedUrlQuery, parse as parseUrlEncoded } from "querystring";
import streamToString, { buffer as streamToBuffer } from "get-stream";
import Busboy from "busboy";
import pump from "pump";

/**
 * Extracts the raw request body as a `Buffer`
 */
export const raw: Filter<[Buffer]> = filter(async (request) => [
    await streamToBuffer(request),
]);

/**
 * Extracts the request body as a string
 */
export const text: Filter<[string]> = filter(async (request) => [
    await streamToString(request),
]);

/**
 * Possible values inside a schema for JSON body validation and extraction
 */
export type JsonSchema =
    | typeof String
    | typeof Number
    | typeof Boolean
    | JsonSchema[]
    | { [key: string]: JsonSchema }
    | { optional: true; type: JsonSchema };

/**
 * Schema for JSON body validation and extraction
 */
export type RootJsonSchema = Tuple<JsonSchema> | { [key: string]: JsonSchema };

/**
 * Converts a [[`RootJsonSchema`]] to the type it represents
 *
 * Single element tuples will be translated to arrays.
 */
type JsonMap<S extends RootJsonSchema> = S extends [unknown]
    ? JsonMap<[S[0], []]>[0][]
    : {
          [K in keyof S]: true extends IsInstanceOf<S[K], string>
              ? string
              : true extends IsInstanceOf<S[K], number>
              ? number
              : true extends IsInstanceOf<S[K], boolean>
              ? boolean
              : S[K] extends RootJsonSchema
              ? JsonMap<S[K]>
              : S[K] extends { optional: true; type: infer T }
              ? T extends JsonSchema
                  ? true extends IsInstanceOf<T, string>
                      ? string | undefined
                      : true extends IsInstanceOf<T, number>
                      ? number | undefined
                      : true extends IsInstanceOf<T, boolean>
                      ? boolean | undefined
                      : T extends RootJsonSchema
                      ? JsonMap<T> | undefined
                      : never
                  : never
              : never;
      };

/** @internal */
type Json =
    | string
    | number
    | boolean
    | null
    | undefined
    | Json[]
    | { [key: string]: Json };

/** @internal */
async function _extractJson(
    keys: string[],
    schema: RootJsonSchema | JsonSchema,
    object: unknown,
    extra: boolean
): Promise<Json> {
    const key = keys.join(".");

    if (object === undefined || object === null) {
        if (
            object === undefined &&
            typeof schema === "object" &&
            (schema as { optional: true; type: JsonSchema }).optional === true
        ) {
            return undefined;
        } else {
            throw reply.text(`Missing key "${key}" in JSON body`, 400);
        }
    }

    if (schema === String) {
        if (typeof object === "string") {
            return object;
        } else {
            throw reply.text(
                `Key "${key}" of JSON body should be a string`,
                400
            );
        }
    } else if (schema === Number) {
        if (typeof object === "number" && !Number.isNaN(object)) {
            return object;
        } else {
            throw reply.text(
                `Key "${key}" of JSON body should be a number`,
                400
            );
        }
    } else if (schema === Boolean) {
        if (typeof object === "boolean") {
            return object;
        } else {
            throw reply.text(
                `Key "${key}" of JSON body should be a boolean`,
                400
            );
        }
    } else if (Array.isArray(schema)) {
        if (Array.isArray(object)) {
            if (schema.length === 0) {
                return [];
            } else if (schema.length === 1) {
                const a: Json[] = [];
                for (const [i, o] of object.entries()) {
                    a.push(
                        await _extractJson(
                            [...keys, i.toString()],
                            schema[0] as RootJsonSchema | JsonSchema,
                            o,
                            extra
                        )
                    );
                }
                return a;
            } else if (schema.length === object.length) {
                const a: Json[] = [];
                for (const [i, s] of schema.entries()) {
                    a.push(
                        await _extractJson(
                            [...keys, i.toString()],
                            s as RootJsonSchema | JsonSchema,
                            object[i],
                            extra
                        )
                    );
                }
                return a;
            } else {
                throw reply.text(
                    `Key "${key}" of JSON body should be an array of length ${schema.length}`,
                    400
                );
            }
        } else {
            throw reply.text(
                `Key "${key}" of JSON body should be an array`,
                400
            );
        }
    } else if (typeof schema === "object") {
        if (schema.optional === true) {
            return await _extractJson(keys, schema.type, object, extra);
        }

        if (typeof object === "object") {
            const o: { [key: string]: Json } = extra
                ? (object as { [key: string]: Json })
                : {};
            for (const k in schema) {
                o[k] = await _extractJson(
                    [...keys, k],
                    (schema as { [key: string]: JsonSchema })[k],
                    (object as { [key: string]: Json })[k],
                    extra
                );
            }
            return o;
        } else {
            throw reply.text(
                `Key "${key}" of JSON body should be an object`,
                400
            );
        }
    } else {
        throw new Error("Invalid JSON schema");
    }
}

/**
 * Validates and extracts the request body as JSON following the provided schema
 *
 * ```ts
 * // Will match { "name": "Do the laundry", "done": false }
 * // Generic type annotation not required, only present for clarity's sake
 * const todo: Filter<[
 *     { name: string; description?: string; done: boolean }
 * ]> = json({
 *     name: String,
 *     description: { optional: true, type: String },
 *     done: Boolean,
 * });
 * ```
 *
 * @param schema - Schema
 * @param extra - Whether to include extra fields not diescribed in the schema in the extracted object
 */
export function json<T extends RootJsonSchema>(
    schema: T,
    extra = false
): Filter<[JsonMap<T>]> {
    return filter(async (request) => {
        const text = await streamToString(request);
        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch (error) {
            throw reply.text(`Invalid JSON body: ${error}`, 400);
        }
        return [(await _extractJson([], schema, json, extra)) as JsonMap<T>];
    });
}

/**
 * Extracts the request body as JSON
 */
export const anyJson: Filter<[unknown]> = filter(async (request) => {
    const text = await streamToString(request);
    try {
        return [JSON.parse(text)];
    } catch (error) {
        throw reply.text(`Invalid JSON body: ${error}`, 400);
    }
});

/**
 * Extracts the request body as `application/x-www-form-urlencoded`
 */
export const form: Filter<[ParsedUrlQuery]> = filter(async (request) => [
    parseUrlEncoded(await streamToString(request)),
]);

/**
 * `multipart/form-data` file
 */
export interface FormDataFile {
    /**
     * File contents
     */
    data: Buffer;
    /**
     * File name
     */
    filename: string;
    /**
     * Encoding of the data
     */
    encoding: string;
    /**
     * Mime type of the file
     */
    mime: string;
}

/**
 * `multipart/form-data` field
 */
export interface FormDataField {
    /**
     * Field value
     */
    value: string;
    /**
     * Encoding of the value
     */
    encoding: string;
    /**
     * Mime type of the value
     */
    mime: string;
}

/**
 * `multipart/form-data`
 */
export interface FormData {
    /**
     * Files indexed by their field name
     */
    files: { [key: string]: FormDataFile[] };
    /**
     * Fields indexed by their name
     */
    fields: { [key: string]: FormDataField[] };
}

/**
 * Extracts the request body as `multipart/form-data`
 */
export const multipart: Filter<[FormData]> = filter(
    (request) =>
        new Promise((res, rej) => {
            if (
                !request.headers["content-type"]
                    ?.toLowerCase()
                    .startsWith("multipart/form-data")
            ) {
                rej(reply.text("Expected multipart body", 400));
            }

            const result: FormData = { files: {}, fields: {} };
            request.on("error", (err) => rej(err));

            try {
                const busboy = new Busboy({
                    headers: request.headers,
                });

                busboy.on("file", (fieldname, file, filename, encoding, mime) =>
                    streamToBuffer(file)
                        .then((data) => {
                            if (result.files[fieldname] === undefined) {
                                result.files[fieldname] = [
                                    {
                                        data,
                                        filename,
                                        encoding,
                                        mime,
                                    },
                                ];
                            } else {
                                result.files[fieldname].push({
                                    data,
                                    filename,
                                    encoding,
                                    mime,
                                });
                            }
                        })
                        .catch((err) => rej(err))
                );
                busboy.on(
                    "field",
                    (
                        fieldname,
                        value,
                        truncatedFieldname,
                        trucatedValue,
                        encoding,
                        mime
                    ) => {
                        if (result.fields[fieldname] === undefined) {
                            result.fields[fieldname] = [
                                { value, encoding, mime },
                            ];
                        } else {
                            result.fields[fieldname].push({
                                value,
                                encoding,
                                mime,
                            });
                        }
                    }
                );

                busboy.on("finish", () => res([result]));
                pump(request, busboy, (err) => {
                    if (err) {
                        rej(err);
                    }
                });
            } catch (err) {
                rej(reply.text("Invalid multipart body", 400));
            }
        })
);
