import { IntoFilter } from "../filter";
import { Request } from "..";

export async function _urlFromRequest(request: Request): Promise<URL> {
    const url = request.url;
    if (url === undefined) {
        throw new Error("Missing URL");
    }
    return new URL(url, `http://${request.headers.host}`);
}

export const url: IntoFilter<[URL]> = async (request): Promise<[URL]> => [
    await _urlFromRequest(request),
];
