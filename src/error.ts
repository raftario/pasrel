import * as reply from "./reply";
import { Recover } from "./filter";
import { Reply } from "./reply";

interface WithPriority<T> {
    error: T;
    priority: number;
}

export function withPriority<T>(error: T, priority: number): WithPriority<T> {
    return { error, priority };
}

export function asReply(value?: unknown): Reply | null {
    if (value === undefined || value === null) {
        return null;
    }
    if (
        typeof value === "object" &&
        "_" in value! &&
        (value as Reply)._ === "reply"
    ) {
        return value as Reply;
    }
    if (value instanceof Array && value.length >= 1) {
        return asReply(value[0]);
    }
    if (typeof value === "object" && "error" in value!) {
        return asReply((value as WithPriority<unknown>).error);
    }
    return null;
}

export const recover: Recover<[Reply]> = async (error) => async (): Promise<
    [Reply]
> => {
    const r = asReply(error);
    if (r !== null) {
        return [r];
    } else {
        console.error(error);
        return reply.status(500);
    }
};
