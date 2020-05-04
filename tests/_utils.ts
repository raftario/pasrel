/* eslint-disable ava/use-test */

import { Error } from "../src/error";
import { ExecutionContext } from "ava";
import { Filter } from "../src/filter";
import { IncomingMessage } from "http";
import { Readable } from "stream";
import { Request } from "../src";
import { Tuple } from "../src/types";

class RequestBuilder {
    private readonly inner: Request;

    constructor(method: string, path = "/") {
        const inner = new Readable();
        inner._read = (): void => {
            // eslint-disable-next-line unicorn/no-null
            this.inner.push(null);
        };

        (inner as IncomingMessage).aborted = false;
        (inner as IncomingMessage).complete = true;
        (inner as IncomingMessage).destroy = (): void => {
            return;
        };
        (inner as IncomingMessage).headers = {
            "host": "localhost",
            "user-agent": "pasrel/mock",
        };
        (inner as IncomingMessage).httpVersion = "1.1";
        (inner as IncomingMessage).httpVersionMajor = 1;
        (inner as IncomingMessage).httpVersionMinor = 1;
        (inner as IncomingMessage).method = method.toUpperCase();
        (inner as IncomingMessage).url = path;

        (inner as Request).pathSegments = new URL(
            path,
            "http://localhost"
        ).pathname
            .split("/")
            .filter((s) => s !== "");

        this.inner = inner as Request;
    }

    header(name: string, value: string): RequestBuilder {
        this.inner.headers[name.toLowerCase()] = value;
        return this;
    }

    raw(body: Buffer): RequestBuilder {
        this.inner._read = (): void => {
            this.inner.push(body);
            // eslint-disable-next-line unicorn/no-null
            this.inner.push(null);
        };
        return this;
    }
    text(body: string): RequestBuilder {
        this.inner._read = (): void => {
            this.inner.push(Buffer.from(body, "utf-8"));
            // eslint-disable-next-line unicorn/no-null
            this.inner.push(null);
        };
        return this;
    }
    json(body: unknown): RequestBuilder {
        this.inner.headers["content-type"] = "application/json";
        this.inner._read = (): void => {
            this.inner.push(Buffer.from(JSON.stringify(body), "utf-8"));
            // eslint-disable-next-line unicorn/no-null
            this.inner.push(null);
        };
        return this;
    }

    build(): Request {
        return this.inner;
    }
}

function get(path?: string): RequestBuilder {
    return new RequestBuilder("GET", path);
}
function head(path?: string): RequestBuilder {
    return new RequestBuilder("HEAD", path);
}
function post(path?: string): RequestBuilder {
    return new RequestBuilder("POST", path);
}
function put(path?: string): RequestBuilder {
    return new RequestBuilder("PUT", path);
}
function del(path?: string): RequestBuilder {
    return new RequestBuilder("DELETE", path);
}
function patch(path?: string): RequestBuilder {
    return new RequestBuilder("PATCH", path);
}

export const mock = { get, head, post, put, del, patch };

async function rej<T extends Tuple>(
    t: ExecutionContext,
    filter: Filter<T>,
    request: Request,
    depth = 0
): Promise<Error> {
    let error: Error | undefined;
    try {
        await filter.run(request, depth);
    } catch (err) {
        error = err;
    }
    t.not(error, undefined);
    return error!;
}

export const macros = { rej };
