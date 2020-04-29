# gate

A super-easy, composable, web server framework totally ripped off [seanmonstar's warp](https://github.com/seanmonstar/warp)

## Example

```ts
import * as path from "gate/filters/path";
import * as reply from "gate/reply";
import { filter, serve } from "gate";

const hello = filter(path.params("/hello/:name")).map(async (params) =>
    reply.text(`Hello ${params.name}!`)
);

serve(hello)
    .run(3030, "127.0.0.1")
    .then(() => console.log("Ready"))
    .catch(console.error);
```
