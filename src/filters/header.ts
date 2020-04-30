import * as reply from "../reply";
import { Filter, filter } from "../filter";

export function optional(header: string): Filter<[string | undefined]> {
    return filter(async (request) => [request.headers[header]?.toString()]);
}

export function required(header: string): Filter<[string]> {
    return filter(async (request) => {
        const h = request.headers[header]?.toString();
        if (h !== undefined) {
            return [h];
        }
        throw reply.text(`Missing header "${header}"`, 400);
    });
}

export function exact(name: string, value: string): Filter<[]> {
    return filter(async (request) => {
        const h = request.headers[name]?.toString();
        if (h === value) {
            return [];
        }
        throw reply.text(`Invalid header "${name}"`, 400);
    });
}
