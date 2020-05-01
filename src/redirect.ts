/**
 * Utilities for creating redirections
 * @packageDocumentation
 */

import { Reply } from ".";

/**
 * Creates a [[`Reply`]] for temporary redirections
 *
 * @param url - Url to redirect to
 * @param status - Status code
 */
export function temporary(url: string, status: 302 | 303 | 307 = 302): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: { Location: url },
            body: Buffer.alloc(0),
        },
    ];
}

/**
 * Creates a [[`Reply`]] for permanent redirections
 *
 * @param url - Url to redirect to
 * @param status - Status code
 */
export function permanent(url: string, status: 301 | 308 = 301): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: { Location: url },
            body: Buffer.alloc(0),
        },
    ];
}
