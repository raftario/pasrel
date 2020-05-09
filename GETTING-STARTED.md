# Getting started

## Hello, World!

Let's start by looking at the hello world example.

```ts
import * as path from "pasrel/filters/path";
import * as reply from "pasrel/reply";
import { serve } from "pasrel";

const hello = path
    .path("hello", String)
    .map(async (name) => reply.text(`Hello, ${name}!`));

serve(hello).run(3030).catch(console.error);
```

The imports aren't really interesting, but they give an idea of the library structure; the `pasrel` index provides the necessary function to start the server, `pasrel/reply` has... replies, and `pasrel/filters/path` has routing filters. All the built-in filters are inside `pasrel/filters/`, anything else is just utilities.

Time to look at the actual route.

```ts
path.path("hello", String).map(async (name) => reply.text(`Hello, ${name}!`));
```

`path` is a function that returns a filter that matches and extracts... path segments. The `map` combinator (method) is then callend on the resulting filter. Essentially `map` lets you map the extracted values from a filter to a new set of values, or in that case a single `Reply`. Values returned from `map` must always be wrapped inside a tuple, to allow for all the cool combinators and type magic.

`path` can take an arbitrary number of arguments. String literals will be matched exactly, while `String`, `Number` and `Boolean` constructors will extract a segment of their respective type. Contructors are reused in a couple of built-in filters to specify types in the same way.

The server is then created and served using `serve` and `run`. In order to be passed to `serve`, a filter must always return a single `Reply`.

## Errors

You migth wonder what the hell happens if the path doesn't match. If you run the example, you'll notice that the user just receives a plain 404 response. This is because internally filters are just functions that return a promise, so if the path doesn't match, the promise returned by the `path` filter just rejects with a `Reply`, that is then catched by `serve` and sent to the user.

This is the base logic of filters; resolve with a tuple of extracted values if successful, reject with a `Reply` (or any error, if it can't be turned into a `Reply` it will be logged and a 500 page will be sent to the user).

## `and` and `or`

That's nice and all, but having only a single filter that makes up the single route isn't particularly useful. Thankfully, filters also have `and` and `or` combinators. Let's see them in action by creating super useful routes for doing math.

```ts
const sum = path
    .path(Number, "plus", Number)
    .map(async (n1, n2) => reply.text(`${n1} plus ${n2} is ${n1 + n2}`));

const product = path
    .path(Number, "times", Number)
    .map(async (n1, n2) => reply.text(`${n1} times ${n2} is ${n1 * n2}`));

const math = path.partial("math").and(sum.or(product));
```

Nothing here is new except the last line. Before looking into the combinators, what is `partial` ? Well, it's pretty much the equivalent of `path`, but instead of _exactly_ matching the path, it maches it and potentially anything that follows it.

```ts
// GET /math/is/pretty/cool => 404
path.path("math");
// GET /math/is/pretty/cool => 200
path.partial("math");
```

Now to the combinators. `and` is used to express "go through this filter, then go through this other filter", while `or` is used to express "try going through this filter, and if it doesn't match go through that other one instead". So this example mounts the `sum` and `product` routes under `/math`. Note that to be combined using `or`, filters must return extract the same types (in this case, `[Reply]`).

What if we wanted to only accept `GET` requests ? Easy.

```ts
import * as method from "pasrel/filters/method";

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
```

## Queries and request bodies

Routing is nice, but another core feature of any web server is getting information from requests. That's where the query string and request body filters come into play. Let's say we have an endpoint that returns a large array where requests should indicate the max amount of elements to include in the response, and how many elements to skip.

```ts
import * as query from "pasrel/filters/query";

const things = path
    .path("things")
    .and(method.get)
    .and(query.query({ limit: Number, skip: Number }))
    .map(async ({ limit, skip }) => {
        const data = [0, 1, 2, 3];
        return reply.json({
            limit,
            skip,
            data: data.slice(skip, skip + limit),
        });
    });
```

Constructors, again. Here they're used to specify the schema the query string should follow. The query string will automatically be verified to make sure it follows the schema and given the appropriate type, and if it doesn't a 400 page describing the error will be sent to the user.

What if the parameters shouldn't be required ? Easy.

```ts
import * as query from "pasrel/filters/query";

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
```

The schema gets a little verbose with optional parameters, but still much cleaner than writing all of the validation and casting code if you ask me.

JSON bodies use a similar schema, except they can contain nested arrays and objects. Everything will be validated, and everything will be typed (you can use single elements array in the schema to represent infinite arrays of a givent type).

```ts
import * as body from "pasrel/filters/body";

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
```

In the case of JSON the rather basic schema can quickly become quite limiting, so there's also an `anyJson` filter available that doesn't perform any validation and extracts `unknown` available for cases where more control is needed.

## Putting it all together

As you can probably guess, or is especially useful for combining all the routes together into a single filter to pass to `serve`.

```ts
const routes = hello.or(math).or(things).or(todos);
serve(routes).run(3030).catch(console.error);
```

Let's also add some logging to be able to quickly check that everything is working as expected. Thankfully, there's a simple but useful built-in logger, and `serve` can take it as a second parameter to use it `with` (another useful combinator) the full routes, including the built-in error catch-all.

```ts
import { logger } from "pasrel/filters/log";

const routes = hello.or(math).or(things).or(todos);

console.log("Listening on port 3030");
serve(routes, logger).run(3030).catch(console.error);
```

Check out the [full code](./examples/getting-started.ts) with the other [examples](./examples/), or run it with `yarn example getting-started`.
