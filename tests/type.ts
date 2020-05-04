import * as type from "../src/filters/type";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("accepts any valid", async (t) => {
    const filter = type.accepts("*/*");
    const request = mock.get().header("Accept", "*/*").build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("accepts any invalid", async (t) => {
    const filter = type.accepts("*/*");
    const request = mock.get().header("Accept", "text/*").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 406);
});

test("accepts text valid", async (t) => {
    const filter = type.accepts("text/*");
    const request = mock.get().header("Accept", "text/*").build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("accepts text invalid", async (t) => {
    const filter = type.accepts("text/*");
    const request = mock.get().header("Accept", "text/html").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 406);
});

test("accepts html valid", async (t) => {
    const filter = type.accepts("text/html");
    const request = mock.get().header("Accept", "text/html").build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("accepts html invalid", async (t) => {
    const filter = type.accepts("text/html");
    const request = mock.get().header("Accept", "text/plain").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 406);
});

test("is any", async (t) => {
    const filter = type.is("*/*");
    const request = mock
        .get()
        .header("Content-Type", "application/json")
        .build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("is application valid", async (t) => {
    const filter = type.is("application/*");
    const request = mock
        .get()
        .header("Content-Type", "application/json")
        .build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("is application invalid", async (t) => {
    const filter = type.is("application/*");
    const request = mock.get().header("Content-Type", "text/html").build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 415);
});

test("is json valid", async (t) => {
    const filter = type.is("application/json");
    const request = mock
        .get()
        .header("Content-Type", "application/json")
        .build();

    const result = await filter.run(request, 0);

    t.deepEqual(result.tuple, []);
});

test("is json invalid", async (t) => {
    const filter = type.is("application/json");
    const request = mock
        .get()
        .header("Content-Type", "application/zip")
        .build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 415);
});
