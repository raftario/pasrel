import { OutgoingHttpHeaders, STATUS_CODES } from "http";

export interface Reply {
    _: "reply";
    status: number;
    headers: OutgoingHttpHeaders;
    body?: unknown;
}

export function raw(
    body: unknown,
    status = 200,
    headers: OutgoingHttpHeaders = {}
): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: { "Content-Type": "application/octet-stream", ...headers },
            body,
        },
    ];
}

export function text(
    body: string,
    status = 200,
    headers: OutgoingHttpHeaders = {}
): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                ...headers,
            },
            body,
        },
    ];
}

export function json(
    body: unknown,
    status = 200,
    headers: OutgoingHttpHeaders = {},
    space?: number
): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...headers,
            },
            body: JSON.stringify(body, undefined, space),
        },
    ];
}

export function html(
    body: string,
    status = 200,
    headers: OutgoingHttpHeaders = {}
): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: { "Content-Type": "text/html; charset=utf-8", ...headers },
            body,
        },
    ];
}

export function status(
    status: number,
    headers: OutgoingHttpHeaders = {}
): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: {
                "Content-Type": "text/plain; charset=ascii",
                ...headers,
            },
            body: STATUS_CODES[status] || "Error",
        },
    ];
}
