import * as auth from "../src/filters/auth";
import { Reply } from "../src";
import { asReply } from "../src/error";
import { mock } from "./_utils";
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

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], credentials);
});

test("basic missing header", async (t) => {
    const filter = auth.basic("realm");
    const request = mock.get().build();

    let reply: Reply | undefined;
    try {
        await filter.run(request, 0);
    } catch (err) {
        reply = asReply(err);
    }

    t.not(reply, undefined);
    t.is(reply?.status, 401);
    t.is(reply?.headers["WWW-Authenticate"], 'Basic realm="realm"');
});

test("basic wrong scheme", async (t) => {
    const filter = auth.basic("realm");
    const request = mock.get().header("authorization", "Bearer token").build();

    let reply: Reply | undefined;
    try {
        await filter.run(request, 0);
    } catch (err) {
        reply = asReply(err);
    }

    t.not(reply, undefined);
    t.is(reply?.status, 401);
    t.is(reply?.headers["WWW-Authenticate"], 'Basic realm="realm"');
});

test("basic invalid userpass", async (t) => {
    const filter = auth.basic("realm");
    const request = mock.get().header("authorization", "Basic invalid").build();

    let reply: Reply | undefined;
    try {
        await filter.run(request, 0);
    } catch (err) {
        reply = asReply(err);
    }

    t.not(reply, undefined);
    t.is(reply?.status, 400);
});
