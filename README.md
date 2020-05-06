# pasrel

A typed, composable and functional web server framework totally ripped off [seanmonstar's warp](https://github.com/seanmonstar/warp)

[![CI](https://img.shields.io/github/workflow/status/raftario/pasrel/Build%20&%20Test?label=ci&style=flat-square)](https://github.com/raftario/pasrel/actions?query=workflow%3A%22Build+%26+Test%22) ![License](https://img.shields.io/github/license/raftario/pasrel?style=flat-square) [![npm](https://img.shields.io/npm/v/pasrel?style=flat-square)](https://www.npmjs.com/package/pasrel) [![Documentation](https://img.shields.io/badge/docs-typedoc-informational?style=flat-square)](https://raftario.github.io/pasrel/modules/_index_.html)

`pasrel` is yet another Node.js web server framework. However, unlike most other frameworks, it doesn't use express-like route handlers or LoopBack-like controllers. The basic building blocks of the framework are `Filter`s, small functions that can be combined in different ways to create routes, ~~totally ripped off~~ strongly inspired by [warp](https://github.com/seanmonstar/warp).

`pasrel` is fully written in TypeScript and leverages its powerful type system (with some help from [ts-toolbelt](https://github.com/pirix-gh/ts-toolbelt)) to provide type safety and excellent editor support. It can be used with both TypeScript and JavaScript but TypeScript is highly recommended since filters can be hard to reason about and error prone without types.

### Disclaimer

You shouldn't use `pasrel` in production, it hasn't been extensovely tested and, at this stage, is just a fun side project of mine to play around with various stuff.

## Features

Out of the box, there are provided filters for

-   Path routing and parameter extraction
-   Header requirement and extration
-   Query string extraction
-   JSON and form bodies
-   Multipart form data
-   Query string and JSON body validation
-   Static files and directories
-   Logging
-   Content type negotiation
-   Basic and Bearer authentication
-   Temporary and permanent redirections

You can easily create new filters by combining existing ones or from scratch.

## Example

```ts
import * as path from "pasrel/filters/path";
import * as reply from "pasrel/reply";
import { serve } from "pasrel";

// GET /hello/World => "Hello, World!"
const hello = path
    .path("hello", String)
    .map(async (name) => reply.text(`Hello, ${name}!`));

serve(hello).run(3030).catch(console.error);
```

For more information you can check the [docs](https://raftario.github.io/pasrel/modules/_index_.html) or the [examples](./examples/). You can also look at the [built-in filters](./src/filters/) for more complex usecases.

## Contributing

All kinds of contributions are welcome ! Just try to keep dependencies to a minimum and write a couple tests. If you don't think a filter should be built-in but would still be useful for a couple people, you can also add it to the examples (examples are also not affected by the keep-dependencies-to-a-minimum rule).

Here are a couple useful commands for contributors

-   `yarn build` - Builds the main library
-   `yarn build:examples` - Builds the examples
-   `yarn test` - Runs the test suite
-   `yarn lint:fix` - Runs the linters and automatically fixes errors that can be fixed
-   `yarn lint:check` - Runs the linters and check for errors without fixing them
-   `yarn doc` - Builds the documentation to the [`docs`](./docs/) directory
