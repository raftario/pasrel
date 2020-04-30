import { Filter, filter } from "../filter";
import { _urlFromRequest } from "./url";

export const query: Filter<[URLSearchParams]> = filter(
    async (request): Promise<[URLSearchParams]> => [
        (await _urlFromRequest(request)).searchParams,
    ]
);

export const raw: Filter<[string]> = filter(async (request) => [
    (await _urlFromRequest(request)).search,
]);
