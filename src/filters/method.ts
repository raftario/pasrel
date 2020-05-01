import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { Request } from "..";

/** @internal */
async function _isMethod(request: Request, method: string): Promise<void> {
    if (request.method?.toUpperCase() !== method) {
        throw reply.status(405);
    }
}

export const get: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "GET");
    return [];
});
export const head: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "HEAD");
    return [];
});
export const post: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "POST");
    return [];
});
export const put: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "PUT");
    return [];
});
export const del: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "DELETE");
    return [];
});
export const connect: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "CONNECT");
    return [];
});
export const options: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "OPTIONS");
    return [];
});
export const trace: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "TRACE");
    return [];
});
export const patch: Filter<[]> = filter(async (request) => {
    await _isMethod(request, "PATCH");
    return [];
});

export function custom(method: string): Filter<[]> {
    return filter(async (request) => {
        await _isMethod(request, method.toUpperCase());
        return [];
    });
}
