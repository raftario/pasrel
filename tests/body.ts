import * as body from "../src/filters/body";
import * as qs from "querystring";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("raw", async (t) => {
    const filter = body.raw;
    const b = Buffer.from([0, 1, 2, 3]);
    const request = mock.post().raw(b).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test("raw empty", async (t) => {
    const filter = body.raw;
    const request = mock.post().build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], Buffer.from([]));
});

test("text", async (t) => {
    const filter = body.text;
    const b = "string";
    const request = mock.post().text(b).build();

    const result = await filter.run(request, 0);

    t.is(result.tuple[0], b);
});

test("text empty", async (t) => {
    const filter = body.text;
    const request = mock.post().build();

    const result = await filter.run(request, 0);

    t.is(result.tuple[0], "");
});

test("json valid object", async (t) => {
    const filter = body.json({ s: String, n: Number, b: Boolean });
    const b = { s: "string", n: 2, b: true };
    const request = mock.post().json(b).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test("json valid array", async (t) => {
    const filter = body.json([String, Number, Boolean]);
    const b = ["string", 2, true];
    const request = mock.post().json(b).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test("json invalid object", async (t) => {
    const filter = body.json({ s: String, n: Number, b: Boolean });
    const b = { s: "string", n: 2, b: "true" };
    const request = mock.post().json(b).build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("json invalid array", async (t) => {
    const filter = body.json([String, Number, Boolean]);
    const b: unknown = ["string", 2, "true"];
    const request = mock.get().json(b).build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("json extra", async (t) => {
    const extra = body.json({ s: String, n: Number, b: Boolean }, true);
    const noextra = body.json({ s: String, n: Number, b: Boolean }, false);
    const b = { s: "string", n: 2, b: true, extra: "extra" };
    const r1 = mock.post().json(b).build();
    const r2 = mock.post().json(b).build();

    const extraResult = await extra.run(r1, 0);
    const noextraResult = await noextra.run(r2, 0);

    t.deepEqual(extraResult.tuple[0], b);
    t.notDeepEqual(noextraResult.tuple[0], b);
});

const schema: body.RootJsonSchema = {
    s: String,
    n: Number,
    b: Boolean,
    os: { optional: true, type: String },
    on: { optional: true, type: Number },
    ob: { optional: true, type: Boolean },
    obj: {
        s: String,
        n: Number,
        b: Boolean,
        os: { optional: true, type: String },
        on: { optional: true, type: Number },
        ob: { optional: true, type: Boolean },
    },
    ary: [String, Number, Boolean],
    oobj: {
        optional: true,
        type: {
            s: String,
            n: Number,
            b: Boolean,
            os: { optional: true, type: String },
            on: { optional: true, type: Number },
            ob: { optional: true, type: Boolean },
        },
    },
    oary: {
        optional: true,
        type: [String, Number, Boolean],
    },
};

test("json valid complex", async (t) => {
    const filter = body.json(schema);
    const b: unknown = {
        s: "lorem",
        n: Math.PI,
        b: true,
        os: "ipsum",
        on: undefined,
        ob: false,
        obj: {
            s: "dolor",
            n: Math.SQRT2,
            b: true,
            os: undefined,
            on: 666,
            ob: undefined,
        },
        ary: ["sit", 0, false],
        oobj: undefined,
        oary: ["amet", -1, true],
    };
    const request = mock.post().json(b).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test("json invalid complex", async (t) => {
    const filter = body.json(schema);
    const b: unknown = {
        s: "lorem",
        n: Math.PI,
        b: true,
        os: "ipsum",
        on: undefined,
        ob: false,
        obj: {
            s: "dolor",
            n: Math.SQRT2,
            b: true,
            os: undefined,
            on: 666,
            ob: undefined,
        },
        ary: ["sit", 0, false],
        oobj: undefined,
        oary: ["amet", -1, "true"],
    };
    const request = mock.post().json(b).build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("json array valid", async (t) => {
    const filter = body.json([Number]);
    const b = [0, 1, 2, 3];
    const request = mock.post().json(b).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test("json array invalid", async (t) => {
    const filter = body.json([Number]);
    const b = [0, 1, 2, "3"];
    const request = mock.post().json(b).build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("json any valid", async (t) => {
    const filter = body.anyJson;
    const b = { s: "string" };
    const request = mock.post().json(b).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test("json any invalid", async (t) => {
    const filter = body.anyJson;
    const request = mock.post().text("not json").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("form", async (t) => {
    const filter = body.form;
    const b = { s: "string" };
    const request = mock.post().text(qs.encode(b)).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], b);
});

test.todo("multipart");
