import { Filter, With, filter } from "./filter";
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

export interface Request extends IncomingMessage {
    pathSegments: string[];
}

export interface Reply {
    _: "reply";
    status: number;
    headers: OutgoingHttpHeaders;
    body?: unknown;
}

export function writeReply(reply: Reply, response: ServerResponse): void {
    response.statusCode = reply.status;
    for (const [name, value] of Object.entries(reply.headers)) {
        if (value !== undefined) {
            response.setHeader(name, value);
        }
    }
    response.end(reply.body);
}

export class Server {
    readonly inner: HttpServer;

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
                const pRequest: Request = request as Request;
                pRequest.pathSegments = new URL(
                    request.url || "",
                    `http://${request.headers.host}`
                ).pathname
                    .split("/")
                    .filter((s) => s !== "");

                filter
                    .run(pRequest, 0)
                    .then(({ tuple: [reply] }) => writeReply(reply, response))
                    .catch((error) => {
                        console.error(error);
                        process.exit(1);
                    });
            }
        );
    }

    run(port: number, hostName?: string): Promise<void> {
        return new Promise((res) => {
            this.inner.on("listening", () => {
                res();
            });
            this.inner.listen(port, hostName);
        });
    }
}

export function serve(f: Filter<[Reply]>): Server;
export function serve(
    f: Filter<[Reply]>,
    options: HttpOptions | HttpsOptions
): Server;
export function serve(filter: Filter<[Reply]>, w: With<[Reply]>): Server;
export function serve(
    f: Filter<[Reply]>,
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

export const any: Filter<[]> = filter([]);
