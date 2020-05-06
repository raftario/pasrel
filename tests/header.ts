import * as header from "../src/filters/header";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("optional present", async (t) => {
    const filter = header.optional("Optional-header");
    const value = "value";
    const request = mock.get().header("optional-Header", value).build();

    const result = await filter.run(request, 0, 0);

    t.is(result.tuple[0], value);
});

test("optional absent", async (t) => {
    const filter = header.optional("Optional-Header");
    const request = mock.get().build();

    const result = await filter.run(request, 0, 0);

    t.is(result.tuple[0], undefined);
});

test("required present", async (t) => {
    const filter = header.required("Required-header");
    const value = "value";
    const request = mock.get().header("required-Header", value).build();

    const result = await filter.run(request, 0, 0);

    t.is(result.tuple[0], value);
});

test("required absent", async (t) => {
    const filter = header.required("Required-header");
    const request = mock.get().build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("exact valid", async (t) => {
    const value = "value";
    const filter = header.exact("Exact-header", value);
    const request = mock.get().header("exact-Header", value).build();

    const result = await filter.run(request, 0, 0);

    t.deepEqual(result.tuple, []);
});

test("exact invalid", async (t) => {
    const filter = header.exact("Exact-header", "value");
    const request = mock.get().header("exact-Header", "not value").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});

test("exact missing", async (t) => {
    const filter = header.exact("Exact-header", "value");
    const request = mock.get().build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 400);
});
