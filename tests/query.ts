import * as query from "../src/filters/query";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("query valid", async (t) => {
    const filter = query.query({ s: String, n: Number, b: Boolean });
    const q = { s: "string", n: 2, b: true };
    const request = mock.get("/?s=string&n=2&b").build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], q);
});

test("query invalid", async (t) => {
    const filter = query.query({ s: String, n: Number, b: Boolean });
    const request = mock.get("/?s=string&n=number&b").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("query valid complex", async (t) => {
    const filter = query.query({
        s: String,
        n: Number,
        b: Boolean,
        os: { optional: true, type: String },
        on: { optional: true, type: Number },
    });
    const q = { s: "string", n: 2, b: true, os: undefined, on: 2 };
    const request = mock.get("/?s=string&n=2&b&on=2").build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], q);
});

test("query invalid complex", async (t) => {
    const filter = query.query({
        s: String,
        n: Number,
        b: Boolean,
        os: { optional: true, type: String },
        on: { optional: true, type: Number },
    });
    const request = mock.get("/?s=string&n=2&b&on=number").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});
