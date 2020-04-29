import * as reply from "../reply";
import { IntoFilter } from "../filter";
import { Request } from "..";
import { withPriority } from "../error";

async function _isMethod(request: Request, method: string): Promise<void> {
    if (request.method?.toUpperCase() !== method) {
        throw withPriority(reply.status(405), 0.4);
    }
}

export const get: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "GET");
    return [];
};

export const head: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "HEAD");
    return [];
};

export const post: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "POST");
    return [];
};

export const put: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "PUT");
    return [];
};

export const del: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "DELETE");
    return [];
};

export const connect: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "CONNECT");
    return [];
};

export const options: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "OPTIONS");
    return [];
};

export const trace: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "TRACE");
    return [];
};

export const patch: IntoFilter<[]> = async (request) => {
    await _isMethod(request, "PATCH");
    return [];
};

export function custom(method: string): IntoFilter<[]> {
    return async (request): Promise<[]> => {
        await _isMethod(request, method.toUpperCase());
        return [];
    };
}
