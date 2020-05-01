/**
 * Utilities for creating replies
 * @packageDocumentation
 */

import { OutgoingHttpHeaders, STATUS_CODES } from "http";
import { Reply } from ".";

/**
 * Creates a [[`Reply`]] with the given raw body
 *
 * @param body - Raw body
 * @param status - Status code
 * @param headers - Headers
 */
export function raw(
    body: Buffer | string,
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

/**
 * Creates a [[`Reply`]] with the given text body
 *
 * @param body - Text body
 * @param status - Status code
 * @param headers - Headers
 */
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

/**
 * Creates a [[`Reply`]] with its body set to the provided object serialised to JSON
 *
 * @param body - Serialisable object
 * @param status - Status code
 * @param headers - Headers
 * @param space - Number of spaces to indent the serialised JSON with (unindented by default)
 */
export function json(
    body: unknown,
    status = 200,
    headers: OutgoingHttpHeaders = {},
    space?: number
): [Reply] {
    let s: string;
    try {
        s = JSON.stringify(body, undefined, space);
    } catch (err) {
        console.error(err);
        s = '{"error": "Internal Server Error"}';
        status = 500;
    }

    return [
        {
            _: "reply",
            status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...headers,
            },
            body: s,
        },
    ];
}

/**
 * Creates a [[`Reply`]] with the given HTML body
 *
 * @param body - HTML body
 * @param status - Status code
 * @param headers - Headers
 */
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
/**
 * Creates a [[`Reply`]] with the given status code,
 * with its body set to the default message for that code
 *
 * @param status - Status code
 * @param headers - Headers
 */
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
