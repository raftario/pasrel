import * as reply from "pasrel/reply";
import { filter, serve } from "pasrel";

const routes = filter([]).map(async () => reply.text("Hello, World!"));

serve(routes).run(3030).catch(console.error);
