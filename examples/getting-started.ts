import * as body from "pasrel/filters/body";
import * as method from "pasrel/filters/method";
import * as path from "pasrel/filters/path";
import * as query from "pasrel/filters/query";
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

const things = path
    .path("things")
    .and(method.get)
    .and(
        query.query({
            limit: { optional: true, type: Number },
            skip: { optional: true, type: Number },
        })
    )
    .map(async ({ limit, skip }) => {
        const data = [0, 1, 2, 3];

        if (limit === undefined) {
            limit = 100;
        }
        if (skip === undefined) {
            skip = 0;
        }

        return reply.json({
            limit,
            skip,
            data: data.slice(skip, skip + limit),
        });
    });

const todos = path
    .path("todos")
    .and(method.post)
    .and(
        body.json({
            name: String,
            description: { optional: true, type: String },
            person: { firstname: String, lastname: String },
            done: Boolean,
        })
    )
    .map(async (todo) => {
        const person = `${todo.person.firstname} ${todo.person.lastname}`;
        const description =
            todo.description === undefined ? "" : ` (${todo.description})`;
        const done = todo.done ? "already done" : "not done yet";

        return reply.text(
            `${person} added a new todo: ${todo.name}${description}. It's ${done}.`
        );
    });

const routes = hello.or(math).or(things).or(todos);

console.log("Listening on port 3030");
serve(routes, logger).run(3030).catch(console.error);

/**
 * GET /hello/:name
 * GET /math/:n1/plus/:n2
 * GET /math/:n1/times/:n2
 * GET /things
 * POST /todos
 */
