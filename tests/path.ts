import * as path from "../src/filters/path";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("segment valid", async (t) => {
    const filter = path.segment("segment");
    const request = mock.get("/segment").build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("segment invalid", async (t) => {
    const filter = path.segment("segment");
    const request = mock.get("/hello").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 404);
});

test("string", async (t) => {
    const filter = path.string;
    const value = "string";
    const request = mock.get(`/${value}`).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], value);
});

test("number valid", async (t) => {
    const filter = path.number;
    const value = 666;
    const request = mock.get(`/${value}`).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], value);
});

test("number invalid", async (t) => {
    const filter = path.number;
    const request = mock.get("/hello").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 404);
});

test("boolean valid", async (t) => {
    const filter = path.boolean;
    const value = true;
    const request = mock.get(`/${value}`).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple[0], value);
});

test("boolean invalid", async (t) => {
    const filter = path.boolean;
    const request = mock.get("/hello").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 404);
});

test("end valid", async (t) => {
    const filter = path.end;
    const request = mock.get(`/`).build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("end invalid", async (t) => {
    const filter = path.end;
    const request = mock.get("/hello").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 404);
});
