import { IntoFilter } from "../filter";
import { _urlFromRequest } from "./url";

export const query: IntoFilter<[URLSearchParams]> = async (
    request
): Promise<[URLSearchParams]> => [
    (await _urlFromRequest(request)).searchParams,
];

export const raw: IntoFilter<[string]> = async (request) => [
    (await _urlFromRequest(request)).search,
];
