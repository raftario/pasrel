import * as reply from "./reply";
import { Recover, filter } from "./filter";
import { Reply } from ".";

export interface Error<T = unknown> {
    error: T;
    weight: number;
}

export function asError(value: unknown, weight: number): Error {
    if (value === undefined || value === null) {
        return {
            error: "Error",
            weight,
        };
    }
    if (
        typeof value === "object" &&
        "error" in value! &&
        (value as Error).weight !== null &&
        typeof (value as Error).weight === "number"
    ) {
        return { ...(value as Error), weight };
    } else {
        return {
            error: value,
            weight,
        };
    }
}

export function asReply(value: unknown): Reply | null {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === "object" && (value as Reply)._ === "reply") {
        return value as Reply;
    }
    if (value instanceof Array && value.length >= 1) {
        return asReply(value[0]);
    }
    if (typeof value === "object" && "error" in value!) {
        return asReply((value as Error).error);
    }
    return null;
}

export const recover: Recover<[Reply]> = async (error) =>
    filter(
        async (): Promise<[Reply]> => {
            const r = asReply(error);
            if (r !== null) {
                return [r];
            } else {
                console.error(error);
                return reply.status(500);
            }
        }
    );
