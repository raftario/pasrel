import * as reply from "../reply";
import { IntoFilter } from "../filter";
import { Request } from "..";

function _find(header: string, request: Request): string | undefined {
    return request.headers[header]?.toString();
}

export function optional(header: string): IntoFilter<[string | undefined]> {
    return async (request): Promise<[string | undefined]> => [
        _find(header, request),
    ];
}

export function required(header: string): IntoFilter<[string]> {
    return async (request): Promise<[string]> => {
        const h = _find(header, request);
        if (h !== undefined) {
            return [h];
        }
        throw reply.text(`Missing header "${header}"`, 400);
    };
}

export function exact(name: string, value: string): IntoFilter<[]> {
    return async (request): Promise<[]> => {
        const h = _find(name, request);
        if (h === value) {
            return [];
        }
        throw reply.text(`Invalid header "${name}"`, 400);
    };
}
