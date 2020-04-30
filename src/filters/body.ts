import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { ParsedUrlQuery, parse as parseUrlEncoded } from "querystring";
import streamToString, { buffer as streamToBuffer } from "get-stream";
import { Class } from "ts-toolbelt";

export const raw: Filter<[Buffer]> = filter(async (request) => [
    await streamToBuffer(request),
]);

export const text: Filter<[string]> = filter(async (request) => [
    await streamToString(request),
]);

export type JsonSchema =
    | typeof String
    | typeof Number
    | typeof Boolean
    | JsonSchema[]
    | { [key: string]: JsonSchema }
    | { optional: true; type: JsonSchema };
export type RootJsonSchema = JsonSchema[] | { [key: string]: JsonSchema };
type Json<S extends RootJsonSchema> = {
    [K in keyof S]: S[K] extends Class.Class
        ? string extends Class.InstanceOf<S[K]>
            ? string
            : number extends Class.InstanceOf<S[K]>
            ? number
            : boolean extends Class.InstanceOf<S[K]>
            ? boolean
            : never
        : S[K] extends RootJsonSchema
        ? Json<S[K]>
        : S[K] extends { optional: true; type: infer T }
        ? T extends JsonSchema
            ? T extends Class.Class
                ? string extends Class.InstanceOf<T>
                    ? string | undefined
                    : number extends Class.InstanceOf<T>
                    ? string | undefined
                    : boolean extends Class.InstanceOf<T>
                    ? string | undefined
                    : never
                : T extends RootJsonSchema
                ? Json<T> | undefined
                : never
            : never
        : never;
};

type ActualJson =
    | string
    | number
    | boolean
    | undefined
    | ActualJson[]
    | { [key: string]: ActualJson };

async function extractJson(
    key: string,
    schema: JsonSchema,
    object: unknown
): Promise<ActualJson> {
    if (object === undefined || object === null) {
        if (
            typeof schema === "object" &&
            "optional" in schema &&
            schema.optional === true
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
        if (typeof object === "number" && !isNaN(object)) {
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
    } else if (schema instanceof Array) {
        if (object instanceof Array) {
            if (schema.length === 0) {
                return [];
            } else if (schema.length === 1) {
                const a: ActualJson[] = [];
                for (const [i, o] of object.entries()) {
                    a.push(await extractJson(i.toString(), schema[0], o));
                }
                return a;
            } else if (schema.length === object.length) {
                const a: ActualJson[] = [];
                for (const [i, s] of schema.entries()) {
                    a.push(await extractJson(i.toString(), s, object[i]));
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
        if ("optional" in schema && schema.optional === true) {
            return await extractJson(key, schema.type, object);
        }

        if (typeof object === "object") {
            const o: { [key: string]: ActualJson } = {};
            for (const k in schema) {
                o[k] = await extractJson(
                    k,
                    (schema as { [key: string]: JsonSchema })[k],
                    (object as { [key: string]: ActualJson })[k]
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

export function json<T extends RootJsonSchema>(schema: T): Filter<[Json<T>]> {
    return filter(async (request) => {
        const text = await streamToString(request);
        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch (error) {
            throw reply.text(`Invalid JSON body: ${error}`, 400);
        }
        return [(await extractJson("root", schema, json)) as Json<T>];
    });
}

export const anyJson: Filter<[unknown]> = filter(async (request) => {
    const text = await streamToString(request);
    try {
        return [JSON.parse(text)];
    } catch (error) {
        throw reply.text(`Invalid JSON body: ${error}`, 400);
    }
});

export const form: Filter<[ParsedUrlQuery]> = filter(async (request) => [
    parseUrlEncoded(await streamToString(request)),
]);
