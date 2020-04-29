import * as reply from "../reply";
import { IntoFilter } from "../filter";
import { Request } from "..";

export interface ContentType {
    type: string;
    subtype: string;
}

async function _parseAccept(request: Request): Promise<ContentType[]> {
    const types: ContentType[] = [];

    const accepts = request.headers.accept
        ?.toString()
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a !== "");
    if (accepts !== undefined) {
        for (const a of accepts) {
            const typeAndWeight = a.split(";q=");
            if (typeAndWeight.length === 0) {
                throw reply.text(`Invalid "Accept" header`, 400);
            }

            const typeAndSubtype = typeAndWeight[0].split("/");
            if (typeAndSubtype.length !== 2) {
                throw reply.text(`Invalid "Accept" header`, 400);
            }
            const type = typeAndSubtype[0];
            const subtype = typeAndSubtype[1];

            types.push({ type, subtype });
        }
    }

    return types;
}

async function _parseContentType(
    request: Request
): Promise<ContentType | undefined> {
    const contentType = request.headers["content-type"]
        ?.toString()
        .split(";")
        .map((a) => a.trim())
        .filter((a) => a !== "");
    if (contentType !== undefined) {
        if (contentType.length === 0) {
            throw reply.text(`Invalid "Content-Type" header`, 400);
        }

        const typeAndSubtype = contentType[0].split("/");
        if (typeAndSubtype.length !== 2) {
            throw reply.text(`Invalid "Content-Type" header`, 400);
        }
        const type = typeAndSubtype[0];
        const subtype = typeAndSubtype[1];

        return { type, subtype };
    }
    return undefined;
}

function _parsePattern(pattern: string): ContentType {
    const typeAndSubtype = pattern.split("/");
    if (typeAndSubtype.length === 1) {
        const type = typeAndSubtype[0];
        return { type, subtype: "*" };
    } else if (typeAndSubtype.length === 2) {
        const type = typeAndSubtype[0];
        const subtype = typeAndSubtype[1];
        return { type, subtype };
    } else {
        return { type: "*", subtype: "*" };
    }
}

function _matches(matcher: ContentType, matched: ContentType): boolean {
    if (matcher.type === "*") {
        return true;
    }
    if (matcher.type !== matched.type) {
        return false;
    }
    if (matcher.subtype === "*") {
        return true;
    }
    return matcher.subtype === matched.subtype;
}

export function accepts(pattern: string): IntoFilter<[]> {
    const matched = _parsePattern(pattern);
    return async (request): Promise<[]> => {
        const accepted = await _parseAccept(request);
        for (const t of accepted) {
            if (_matches(t, matched)) {
                return [];
            }
        }
        throw reply.status(406);
    };
}

export function is(pattern: string): IntoFilter<[]> {
    const matcher = _parsePattern(pattern);
    return async (request): Promise<[]> => {
        const contentType = await _parseContentType(request);
        if (contentType === undefined) {
            throw reply.status(415);
        }
        if (!_matches(matcher, contentType)) {
            throw reply.status(415);
        }
        return [];
    };
}
