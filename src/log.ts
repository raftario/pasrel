import { Filter, IntoFilter, Tuple } from "./filter";
import { _urlFromRequest } from "./filters/url";

export function logger<T extends Tuple>(filter: Filter<T>): IntoFilter<T> {
    return async (request): Promise<T> => {
        const startDate = new Date();
        const [startSecs, startNanos] = process.hrtime();

        const result = await filter.run(request);
        const [endSecs, endNanos] = process.hrtime();

        const elapsedSeconds = endSecs - startSecs;
        const elapsedNanos = endNanos - startNanos;

        const elapsedMicros = elapsedSeconds * 1000000 + elapsedNanos / 1000;
        const method = request.method || "?";
        const path = (await _urlFromRequest(request)).pathname;
        const httpVersion = request.httpVersion;

        console.log(
            `[${startDate.toISOString()}] ${method} ${path} HTTP/${httpVersion} (${elapsedMicros.toFixed(
                2
            )} us)`
        );

        return result;
    };
}
