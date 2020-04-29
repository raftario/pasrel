# pasrel

A typed, composable, web server framework totally ripped off [seanmonstar's warp](https://github.com/seanmonstar/warp)

## Example

```ts
import * as path from "pasrel/filters/path";
import * as reply from "pasrel/reply";
import { filter, serve } from "pasrel";

const hello = filter(path.params("/hello/:name")).map(async (params) =>
    reply.text(`Hello, ${params.name}!`)
);

serve(hello).run(3030).catch(console.error);
```
