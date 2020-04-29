import * as reply from "../reply";
import { ParsedUrlQuery, parse as parseUrlEncoded } from "querystring";
import streamToString, { buffer as streamToBuffer } from "get-stream";
import { IntoFilter } from "../filter";

export const raw: IntoFilter<[Buffer]> = async (request) =>
    [await streamToBuffer(request)] as [Buffer];

export const text: IntoFilter<[string]> = async (request) =>
    [await streamToString(request)] as [string];

export const json: IntoFilter<[unknown]> = async (request) => {
    const text = await streamToString(request);
    try {
        return [JSON.parse(text)] as [unknown];
    } catch (error) {
        throw reply.text(`Invalid JSON body: ${error}`, 400);
    }
};

export const form: IntoFilter<[ParsedUrlQuery]> = async (request) =>
    [parseUrlEncoded(await streamToString(request))] as [ParsedUrlQuery];
