import { IncomingHttpHeaders, IncomingMessage } from "http";
import { Readable } from "stream";
import { Request } from "../src";

class RequestBuilder {
    private readonly inner: Request;

    constructor(method: string, path: string) {
        const inner = new Readable();

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

    header<N extends keyof IncomingHttpHeaders>(
        name: N,
        value: string
    ): RequestBuilder {
        this.inner.headers[name] = value;
        return this;
    }
    headers(headers: IncomingHttpHeaders): RequestBuilder {
        this.inner.headers = headers;
        return this;
    }

    body(body: Buffer): RequestBuilder {
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

function get(path: string): RequestBuilder {
    return new RequestBuilder("GET", path);
}
function head(path: string): RequestBuilder {
    return new RequestBuilder("HEAD", path);
}
function post(path: string): RequestBuilder {
    return new RequestBuilder("POST", path);
}
function put(path: string): RequestBuilder {
    return new RequestBuilder("PUT", path);
}
function del(path: string): RequestBuilder {
    return new RequestBuilder("DELETE", path);
}
function patch(path: string): RequestBuilder {
    return new RequestBuilder("PATCH", path);
}

export const mock = { get, head, post, put, del, patch };
