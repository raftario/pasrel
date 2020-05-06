import * as auth from "../src/filters/auth";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("basic valid", async (t) => {
    const filter = auth.basic("realm");
    const credentials: auth.Credentials = {
        user: "user",
        password: "password",
    };
    const header = `Basic ${Buffer.from(
        `${credentials.user}:${credentials.password}`,
        "utf-8"
    ).toString("base64")}`;
    const request = mock.get().header("authorization", header).build();

    const result = await filter.run(request, 0, 0);

    t.deepEqual(result.tuple[0], credentials);
});

test("basic missing header", async (t) => {
    const filter = auth.basic("realm");
    const request = mock.get().build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 401);
    t.is(reply?.headers["WWW-Authenticate"], 'Basic realm="realm"');
});

test("basic wrong scheme", async (t) => {
    const filter = auth.basic("realm");
    const request = mock.get().header("authorization", "Bearer token").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 401);
    t.is(reply?.headers["WWW-Authenticate"], 'Basic realm="realm"');
});

test("basic invalid userpass", async (t) => {
    const filter = auth.basic("realm");
    const request = mock.get().header("authorization", "Basic invalid").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("bearer valid header", async (t) => {
    const filter = auth.bearer("realm", ["scope"]);
    const token = "token";
    const request = mock
        .get()
        .header("authorization", `Bearer ${token}`)
        .build();

    const result = await filter.run(request, 0, 0);

    t.is(result.tuple[0], token);
});

test("bearer valid query", async (t) => {
    const filter = auth.bearer("realm", ["scope"]);
    const token = "token";
    const request = mock.get(`/?access_token=${token}`).build();

    const result = await filter.run(request, 0, 0);

    t.is(result.tuple[0], token);
});

test("bearer missing both", async (t) => {
    const filter = auth.bearer("realm", ["scope"]);
    const request = mock.get().build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 401);
    t.is(
        reply?.headers["WWW-Authenticate"],
        'Bearer realm="realm", scope="scope"'
    );
});

test("bearer wrong scheme", async (t) => {
    const filter = auth.bearer("realm", ["scope"]);
    const request = mock
        .get()
        .header("authorization", "Basic user:password")
        .build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 401);
    t.is(
        reply?.headers["WWW-Authenticate"],
        'Bearer realm="realm", scope="scope"'
    );
});

test("bearer header and query", async (t) => {
    const filter = auth.bearer("realm", ["scope"]);
    const token = "token";
    const request = mock
        .get(`/?access_token=${token}`)
        .header("authorization", `Bearer ${token}`)
        .build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
    t.true(
        reply?.headers["WWW-Authenticate"]
            ?.toString()
            .startsWith(
                'Bearer realm="realm", scope="scope", error="invalid_request"'
            )
    );
});
