import * as method from "pasrel/filters/method";
import * as path from "pasrel/filters/path";
import * as reply from "pasrel/reply";
import { logger } from "pasrel/filters/log";
import { serve } from "pasrel";

const hello = path
    .path("hello", String)
    .and(method.get)
    .map(async (name) => reply.text(`Hello, ${name}!`));

const sum = path
    .path(Number, "plus", Number)
    .and(method.get)
    .map(async (n1, n2) => reply.text(`${n1} plus ${n2} is ${n1 + n2}`));

const product = path
    .path(Number, "times", Number)
    .and(method.get)
    .map(async (n1, n2) => reply.text(`${n1} times ${n2} is ${n1 * n2}`));

const math = path.partial("math").and(sum.or(product));

const routes = hello.or(math);

console.log("Listening on port 3030");
serve(routes, logger).run(3030).catch(console.error);

/**
 * GET /hello/:name
 * GET /math/:n1/plus/:n2
 * GET /math/:n1/times/:n2
 */
