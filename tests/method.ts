import * as method from "../src/filters/method";
import { macros, mock } from "./_utils";
import { asReply } from "../src/error";
import test from "ava";

test("get get", async (t) => {
    const filter = method.get;
    const request = mock.get().build();

    const result = await filter.run(request, 0, 0);

    t.deepEqual(result.tuple, []);
});

test("get head", async (t) => {
    const filter = method.get;
    const request = mock.head().build();

    const result = await filter.run(request, 0, 0);

    t.deepEqual(result.tuple, []);
});

test("get post", async (t) => {
    const filter = method.get;
    const request = mock.post().build();

    const reply = asReply(await macros.rej(t, filter, request));

    t.is(reply?.status, 405);
});
