import { With, filter } from "../filter";
import { Reply } from "..";
import { _urlFromRequest } from "./url";

export const logger: With<[Reply]> = async (f) =>
    filter(async (request) => {
        const startDate = new Date();
        const [startSecs, startNanos] = process.hrtime();

        const reply = await f.run(request);
        const status = reply[0].status;
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

        return reply;
    });
