/**
 * Filters for request body extraction
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { ParsedUrlQuery, parse as parseUrlEncoded } from "querystring";
import streamToString, { buffer as streamToBuffer } from "get-stream";
import Busboy from "busboy";
import { IsInstanceOf } from "../types";

/**
 * Extracts the raw request body as a `Buffer`
 */
export const raw: Filter<[Buffer]> = filter(async (request) => [
    await streamToBuffer(request),
]);

/**
 * Extracts the request body as a `string`
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
export type RootJsonSchema = JsonSchema[] | { [key: string]: JsonSchema };

/**
 * Converts a [[`RootJsonSchema`]] to the type it represents
 */
type Json<S extends RootJsonSchema> = {
    [K in keyof S]: true extends IsInstanceOf<string, S[K]>
        ? string
        : true extends IsInstanceOf<number, S[K]>
        ? number
        : true extends IsInstanceOf<boolean, S[K]>
        ? boolean
        : S[K] extends RootJsonSchema
        ? Json<S[K]>
        : S[K] extends { optional: true; type: infer T }
        ? T extends JsonSchema
            ? true extends IsInstanceOf<string, T>
                ? string | undefined
                : true extends IsInstanceOf<number, T>
                ? number | undefined
                : true extends IsInstanceOf<boolean, T>
                ? boolean | undefined
                : T extends RootJsonSchema
                ? Json<T> | undefined
                : never
            : never
        : never;
};

/** @internal */
type ActualJson =
    | string
    | number
    | boolean
    | undefined
    | ActualJson[]
    | { [key: string]: ActualJson };

/** @internal */
async function _extractJson(
    keys: string[],
    schema: JsonSchema,
    object: unknown,
    extra: boolean
): Promise<ActualJson> {
    const key = keys.join(".");

    if (object === undefined || object === null) {
        if (
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
                const a: ActualJson[] = [];
                for (const [i, o] of object.entries()) {
                    a.push(
                        await _extractJson(
                            [...keys, i.toString()],
                            schema[0],
                            o,
                            extra
                        )
                    );
                }
                return a;
            } else if (schema.length === object.length) {
                const a: ActualJson[] = [];
                for (const [i, s] of schema.entries()) {
                    a.push(
                        await _extractJson(
                            [...keys, i.toString()],
                            s,
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
            const o: { [key: string]: ActualJson } = extra
                ? (object as { [key: string]: ActualJson })
                : {};
            for (const k in schema) {
                o[k] = await _extractJson(
                    [...keys, k],
                    (schema as { [key: string]: JsonSchema })[k],
                    (object as { [key: string]: ActualJson })[k],
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
): Filter<[Json<T>]> {
    return filter(async (request) => {
        const text = await streamToString(request);
        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch (error) {
            throw reply.text(`Invalid JSON body: ${error}`, 400);
        }
        return [(await _extractJson([], schema, json, extra)) as Json<T>];
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
                request.pipe(busboy);
            } catch (err) {
                rej(reply.text("Invalid multipart body", 400));
            }
        })
);
