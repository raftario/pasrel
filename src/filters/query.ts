import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Class } from "ts-toolbelt";
import { _urlFromRequest } from "./url";

export type QuerySchema = {
    [key: string]:
        | typeof String
        | typeof Number
        | typeof Boolean
        | {
              optional: true;
              type: typeof String | typeof Number | typeof Boolean;
          };
};
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
                : boolean extends Class.InstanceOf<T>
                ? boolean
                : never
            : never
        : never;
};

async function _extractQuery(
    key: string,
    type: typeof String | typeof Number | typeof Boolean,
    value: string
): Promise<string | number | boolean> {
    if (type === String) {
        return value;
    } else if (type === Number) {
        const n = Number(value);
        if (!isNaN(n)) {
            return n;
        } else {
            throw reply.text(`Key "${key}" of query should be a number`, 400);
        }
    } else if (type === Boolean) {
        if (value === "true") {
            return true;
        } else if (value === "false") {
            return false;
        } else {
            throw reply.text(`Key "${key}" of query should be a boolean`, 400);
        }
    } else {
        throw new Error("Invalid schema");
    }
}

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
                if (typeof v === "object") {
                    result[k] = undefined;
                    continue;
                } else {
                    throw reply.text(`Missing key "${k}" in query`, 400);
                }
            }

            if (typeof v === "object") {
                result[k] = await _extractQuery(k, v.type, qv);
            } else {
                result[k] = await _extractQuery(k, v, qv);
            }
        }

        return [result as Query<T>];
    });
}

export const any: Filter<[URLSearchParams]> = filter(
    async (request): Promise<[URLSearchParams]> => [
        (await _urlFromRequest(request)).searchParams,
    ]
);

export const raw: Filter<[string]> = filter(async (request) => [
    (await _urlFromRequest(request)).search,
]);
