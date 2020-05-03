/**
 * Authentication filters
 * @packageDocumentation
 */

import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { _urlFromRequest } from "./url";

/**
 * Basic authentication credentials
 */
export interface Credentials {
    /**
     * User
     */
    user: string;
    /**
     * Password
     */
    password: string;
}

/**
 * Extracts credentials following the "Basic" HTTP Authentication scheme
 * (see [RFC 7617](https://tools.ietf.org/html/rfc7617))
 *
 * @param realm - Authentication realm
 */
export function basic(realm: string): Filter<[Credentials]> {
    return filter(async (request) => {
        const auth = request.headers.authorization;
        if (auth === undefined || !auth.startsWith("Basic ")) {
            throw reply.status(401, {
                "WWW-Authenticate": `Basic realm="${realm}"`,
            });
        }

        let userpass: string;
        try {
            const buffer = Buffer.from(auth.slice(6), "base64");
            userpass = buffer.toString("utf-8");
        } catch (err) {
            throw reply.text('Invalid base64 in "Authorization" header', 400);
        }

        const userAndPass = userpass.split(":");
        if (userAndPass.length < 2) {
            throw reply.text('Invalid userpass in "Authorization" header', 400);
        }

        return [
            {
                user: userAndPass[0],
                password: userAndPass.slice(1).join(":"),
            },
        ];
    });
}

/**
 * Extracts a OAuth 2.0 bearer token
 * (see [RFC 6750](https://tools.ietf.org/html/rfc6750))
 *
 * This filter doesn't support the use of a [form-encoded body parameter](https://tools.ietf.org/html/rfc6750#section-2.2).
 *
 * @param realm - Authentication realm
 * @param scopes - Authentication scopes
 */
export function bearer(realm: string, scopes?: string[]): Filter<[string]> {
    return filter(async (request) => {
        const wwwa = `Bearer realm="${realm}"${
            scopes !== undefined ? `, scope="${scopes.join(" ")}"` : ""
        }`;

        const auth = request.headers.authorization;
        if (auth !== undefined && !auth.startsWith("Bearer ")) {
            throw reply.status(401, { "WWW-Authenticate": wwwa });
        }
        const ba = auth?.slice(7);

        const bq =
            (await _urlFromRequest(request)).searchParams.get("access_token") ||
            undefined;

        if (ba === undefined && bq === undefined) {
            throw reply.status(401, { "WWW-Authenticate": wwwa });
        } else if (ba !== undefined && bq !== undefined) {
            throw reply.text("Two different bearer tokens provided", 400, {
                "WWW-Authenticate": `${wwwa}, error="invalid_request", error_message="Two different bearer tokens provided"`,
            });
        } else {
            return [ba || bq] as [string];
        }
    });
}
