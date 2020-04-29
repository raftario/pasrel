# pasrel

A typed, composable, web server framework totally ripped off [seanmonstar's warp](https://github.com/seanmonstar/warp)

The fundamental building block of `pasrel` is the `Filter`: they can be combined and composed to express rich requirements on requests.

Thanks to its `Filter` system, `pasrel` provides these out of the box:

-   Path routing and parameter extraction
-   Header requirements and extraction
-   Query string deserialization
-   JSON and Form bodies

## Example

```ts
import * as path from "pasrel/filters/path";
import * as reply from "pasrel/reply";
import { filter, serve } from "pasrel";

const hello = filter(path.params("/hello/:name")).map(async (params) =>
    reply.text(`Hello ${params.name}!`)
);

serve(hello)
    .run(3030, "127.0.0.1")
    .then(() => console.log("Ready"))
    .catch(console.error);
```
