/* eslint-disable @typescript-eslint/no-var-requires */

const tsConfigPaths = require("tsconfig-paths");

const baseUrl = "./examples/";
const paths = {
    "pasrel": ["../src"],
    "pasrel/*": ["../src/*"],
};
tsConfigPaths.register({
    baseUrl,
    paths,
});
