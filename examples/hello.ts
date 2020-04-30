import * as reply from "pasrel/reply";
import { any, serve } from "pasrel";

const routes = any.map(async () => reply.text("Hello, World!"));

serve(routes).run(3030).catch(console.error);
