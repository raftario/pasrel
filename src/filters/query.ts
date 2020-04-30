import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Class } from "ts-toolbelt";
import { _urlFromRequest } from "./url";

export type QuerySchema = {
    [key: string]: typeof String | typeof Number | typeof Boolean;
};
type Query<S extends QuerySchema> = {
    [K in keyof S]: string extends Class.InstanceOf<S[K]>
        ? string
        : number extends Class.InstanceOf<S[K]>
        ? number
        : boolean extends Class.InstanceOf<S[K]>
        ? boolean
        : never;
};

export function query<T extends QuerySchema>(schema: T): Filter<[Query<T>]> {
    const entries = Object.entries(schema);
    return filter(async (request) => {
        const q = (await _urlFromRequest(request)).searchParams;
        const result: { [key: string]: string | number | boolean } = {};
        for (const [k, v] of entries) {
            const qv = q.get(k);
            if (qv === null) {
                throw reply.text(`Missing key "${k}" in query`, 400);
            }

            if (v === String) {
                result[k] = qv;
            } else if (v === Number) {
                const n = Number(qv);
                if (!isNaN(n)) {
                    result[k] = n;
                } else {
                    throw reply.text(
                        `Key "${k}" of query should be a number`,
                        400
                    );
                }
            } else if (v === Boolean) {
                if (qv === "true") {
                    result[k] = true;
                } else if (qv === "false") {
                    result[k] = false;
                } else {
                    throw reply.text(
                        `Key "${k}" of query should be a boolean`,
                        400
                    );
                }
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
