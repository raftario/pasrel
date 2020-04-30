import * as path from "pasrel/filters/path";
import * as reply from "pasrel/reply";
import { serve } from "pasrel";

const hello = path
    .path("hello", String)
    .map(async (name) => reply.text(`Hello, ${name}!`));

serve(hello).run(3030).catch(console.error);
