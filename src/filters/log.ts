/**
 * Filters for logging
 * @packageDocumentation
 */

import { Filter, With } from "../filter";
import { Reply } from "..";
import { _urlFromRequest } from "./url";

/**
 * A simple but functionnal logger
 *
 * It prints the date and time, request method, request path, request HTTP version,
 * response status and response time to stdout.
 *
 * @param f - Filter
 */
export const logger: With<[Reply]> = async (f) =>
    new Filter(async (request, depth) => {
        const startDate = new Date();
        const [startSecs, startNanos] = process.hrtime();

        const reply = (await f.run(request, depth)).tuple[0];
        const status = reply.status;
        const [endSecs, endNanos] = process.hrtime();

        const elapsedSeconds = endSecs - startSecs;
        const elapsedNanos = endNanos - startNanos;

        const elapsedMicros = elapsedSeconds * 1000000 + elapsedNanos / 1000;
        const method = request.method || "?";
        const path = (await _urlFromRequest(request)).pathname;
        const httpVersion = request.httpVersion;

        console.log(
            `[${startDate.toISOString()}] ${method} ${path} (HTTP/${httpVersion}) => ${status} (${elapsedMicros.toFixed(
                2
            )} us)`
        );

        return { tuple: [reply], depth };
    }, 0);
