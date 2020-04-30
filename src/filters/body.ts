import * as reply from "../reply";
import { Filter, filter } from "../filter";
import { ParsedUrlQuery, parse as parseUrlEncoded } from "querystring";
import streamToString, { buffer as streamToBuffer } from "get-stream";

export const raw: Filter<[Buffer]> = filter(async (request) => [
    await streamToBuffer(request),
]);

export const text: Filter<[string]> = filter(async (request) => [
    await streamToString(request),
]);

export const json: Filter<[unknown]> = filter(async (request) => {
    const text = await streamToString(request);
    try {
        return [JSON.parse(text)];
    } catch (error) {
        throw reply.text(`Invalid JSON body: ${error}`, 400);
    }
});

export const form: Filter<[ParsedUrlQuery]> = filter(async (request) => [
    parseUrlEncoded(await streamToString(request)),
]);
