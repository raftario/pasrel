import { Filter, IntoFilter, Tuple, With } from "./filter";
import {
    ServerOptions as HttpOptions,
    Server as HttpServer,
    IncomingMessage,
    ServerResponse,
    createServer as createHttpServer,
} from "http";
import {
    ServerOptions as HttpsOptions,
    createServer as createHttpsServer,
} from "https";
import { Reply } from "./reply";
import { recover } from "./error";

export function filter<T extends Tuple>(filter: IntoFilter<T>): Filter<T> {
    return new Filter(filter);
}

export type Request = IncomingMessage;

function _writeReply(reply: Reply, response: ServerResponse): void {
    response.statusCode = reply.status;
    for (const [name, value] of Object.entries(reply.headers)) {
        if (value !== undefined) {
            response.setHeader(name, value);
        }
    }
    response.end(reply.body);
}

export class Server {
    private readonly _server: HttpServer;

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
            this._server = createHttpsServer(options);
        } else {
            this._server = createHttpServer(options);
        }

        filter = filter.recover(recover);
        if (w !== undefined) {
            filter = filter.with(w);
        }

        this._server.on(
            "request",
            (request: IncomingMessage, response: ServerResponse) => {
                filter
                    .run(request)
                    .then(([reply]) => _writeReply(reply, response))
                    .catch((error) => {
                        console.error(error);
                        process.exit(1);
                    });
            }
        );
    }

    run(port: number, hostName?: string): Promise<void> {
        return new Promise((res) => {
            this._server.on("listening", () => {
                res();
            });
            this._server.listen(port, hostName);
        });
    }
}

export function serve(filter: Filter<[Reply]>): Server;
export function serve(
    filter: Filter<[Reply]>,
    options: HttpOptions | HttpsOptions
): Server;
export function serve(filter: Filter<[Reply]>, w: With<[Reply]>): Server;
export function serve(
    filter: Filter<[Reply]>,
    options: HttpOptions | HttpsOptions,
    w: With<[Reply]>
): Server;
export function serve(
    filter: Filter<[Reply]>,
    arg1?: HttpOptions | HttpsOptions | With<[Reply]>,
    arg2?: With<[Reply]>
): Server {
    return new Server(filter, arg1, arg2);
}
