import { Filter, With } from "./filter";
import {
    ServerOptions as HttpOptions,
    Server as HttpServer,
    IncomingMessage,
    OutgoingHttpHeaders,
    ServerResponse,
    createServer as createHttpServer,
} from "http";
import {
    ServerOptions as HttpsOptions,
    createServer as createHttpsServer,
} from "https";
import { recover } from "./error";

/**
 * Represents an incoming HTTP request
 */
export interface Request extends IncomingMessage {
    pathSegments: string[];
}

/**
 * Represents an outgoing HTTP reply
 */
export interface Reply {
    /** @internal */
    _: "reply";
    /**
     * Status code
     */
    status: number;
    /**
     * Headers
     */
    headers: OutgoingHttpHeaders;
    /**
     * Response body
     */
    body: Buffer | string | undefined;
}

/**
 * Writes a [[Reply]] to Node's `http.ServerResponse`
 *
 * @param reply - The reply to write
 * @param response - The response to write to
 * @param body - Whether to write the provided body
 */
export function writeReply(
    reply: Reply,
    response: ServerResponse,
    body = true
): void {
    response.statusCode = reply.status;
    for (const [name, value] of Object.entries(reply.headers)) {
        if (value !== undefined) {
            response.setHeader(name, value);
        }
    }
    response.end(body ? reply.body : undefined);
}

/** Abstraction over Node's `http.Server` to handle filters */
export class Server {
    /**
     * Inner `http.Server`
     */
    readonly inner: HttpServer;

    /** @internal */
    constructor(
        filter: Filter<[Reply]>,
        arg1: HttpOptions | HttpsOptions | With<[Reply]> | undefined,
        arg2?: With<[Reply]> | undefined
    ) {
        let options: HttpOptions | HttpsOptions = {};
        let w: With<[Reply]> | undefined = undefined;

        if (arg1 !== undefined && typeof arg1 === "object") {
            options = arg1;
            if (arg2 !== undefined) {
                w = arg2;
            }
        } else if (arg1 !== undefined) {
            w = arg1;
        }

        if ("cert" in options && "key" in options) {
            this.inner = createHttpsServer(options);
        } else {
            this.inner = createHttpServer(options);
        }

        filter = filter.recover(recover);
        if (w !== undefined) {
            filter = filter.with(w);
        }

        this.inner.on(
            "request",
            (request: IncomingMessage, response: ServerResponse) => {
                const hasBody = request.method?.toUpperCase() !== "HEAD";

                const pRequest: Request = request as Request;
                pRequest.pathSegments = new URL(
                    request.url || "",
                    `http://${request.headers.host}`
                ).pathname
                    .split("/")
                    .filter((s) => s !== "");

                filter
                    .run(pRequest, 0)
                    .then(({ tuple: [reply] }) =>
                        writeReply(reply, response, hasBody)
                    )
                    .catch((error) => {
                        console.error(error);
                        process.exit(1);
                    });
            }
        );
    }

    /**
     * Runs the server
     *
     * If an error occurs while running, the server will automatically be closed.
     *
     * @param port - Port to listen on
     * @param hostname - Address to listen on (defaults to localhost)
     *
     * @returns Will resolve when the server closes, will reject if an error occurs while running
     */
    run(port: number, hostname?: string): Promise<void> {
        return new Promise((res, rej) => {
            let error: Error | undefined;
            this.inner.on("error", (err) => {
                error = err;
            });
            this.inner.on("close", () => {
                if (error) {
                    rej(error);
                }
                res();
            });
            this.inner.listen(port, hostname);
        });
    }

    /**
     * Starts the server
     *
     * The main difference between this method and [[`run`]] is that
     * the promise returned by [[`run`]] only resolves once the server closes, while
     * the promise return by this method will resolve as soon as the server starts litening.
     *
     * This method never throws, you are responsible for handling server errors when using it.
     *
     * @param port - Port to listen on
     * @param hostname - Address to listen on (defaults to localhost)
     *
     * @returns Will resolve when the server starts listening
     */
    listen(port: number, hostname?: string): Promise<void> {
        return new Promise((res) => {
            this.inner.on("listening", res);
            this.inner.listen(port, hostname);
        });
    }

    /**
     * Closes the server
     *
     * @returns Will resolve when the server closes, will reject if an error occurs while closing
     */
    close(): Promise<void> {
        return new Promise((res, rej) => {
            this.inner.close((err) => {
                if (err) {
                    rej(err);
                }
                res();
            });
        });
    }
}

/**
 * Creates a server serving the provided filter
 *
 * @param filter - Filter to serve
 */
export function serve(filter: Filter<[Reply]>): Server;
/**
 * Creates a server with the provided options serving the provided filter
 *
 * @param filter - Filter to serve
 * @param options - Options for the inner `http.Server` (will automatically use HTTPS if both `cert` and `key` are provided)
 */
export function serve(
    filter: Filter<[Reply]>,
    options: HttpOptions | HttpsOptions
): Server;
/**
 * Creates a server serving the provided filter
 * using the provided [[`With`]] wrapper globally
 *
 * @param filter - Filter to serve
 * @param w - Global [[`With`]] wrapper
 */
export function serve(filter: Filter<[Reply]>, w: With<[Reply]>): Server;
/**
 * Creates a server with the provided options serving the provided filter
 * using the provided [[`With`]] wrapper globally
 *
 * @param filter - Filter to serve
 * @param options - Options for the inner `http.Server` (will automatically use HTTPS if both `cert` and `key` are provided)
 * @param w - Global [[`With`]] wrapper
 */
export function serve(
    filter: Filter<[Reply]>,
    options: HttpOptions | HttpsOptions,
    w: With<[Reply]>
): Server;
export function serve(
    f: Filter<[Reply]>,
    arg1?: HttpOptions | HttpsOptions | With<[Reply]>,
    arg2?: With<[Reply]>
): Server {
    return new Server(f, arg1, arg2);
}

/**
 * A filter that matches any request
 */
export const any: Filter<[]> = new Filter(
    async (request, depth) => ({ tuple: [], depth }),
    0
);
