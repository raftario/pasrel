import { ConcatMultiple } from "typescript-tuple";
import { Request } from "..";
import { withPriority } from "./error";

export type Tuple = unknown[] | [];

export type IntoFilter<T extends Tuple> =
    | ((request: Request) => Promise<T>)
    | T
    | Filter<T>;

export type Map<T extends Tuple, U extends Tuple> = (
    ...args: T
) => Promise<IntoFilter<U>>;

export type Recover<T extends Tuple> = (
    error: unknown
) => Promise<IntoFilter<T>>;

export type With<T extends Tuple> = (filter: Filter<T>) => IntoFilter<T>;

export class Filter<T extends Tuple> {
    readonly run: (request: Request) => Promise<T>;

    constructor(filter: IntoFilter<T>) {
        if (typeof filter === "function") {
            this.run = filter;
        } else if (filter instanceof Array) {
            this.run = (): Promise<T> => Promise.resolve(filter);
        } else if (filter instanceof Filter) {
            this.run = filter.run;
        } else {
            throw new Error("Unhandled type");
        }
    }

    and<U extends Tuple>(
        filter: IntoFilter<U>
    ): Filter<ConcatMultiple<[T, U]>> {
        return new Filter((request: Request) =>
            this.run(request).then((argsT: T) =>
                new Filter(filter)
                    .run(request)
                    .then((argsU: U) =>
                        Promise.resolve([...argsT, ...argsU] as ConcatMultiple<
                            [T, U]
                        >)
                    )
            )
        );
    }

    or(filter: IntoFilter<T>): Filter<T> {
        return new Filter((request: Request) =>
            this.run(request).catch(async (e1) => {
                try {
                    return await new Filter(filter).run(request);
                } catch (e2) {
                    const p1: number =
                        e1.priority !== undefined &&
                        e1.priority !== null &&
                        typeof e1.priority === "number"
                            ? e1.priority
                            : 1;
                    const p2: number =
                        e2.priority !== undefined &&
                        e2.priority !== null &&
                        typeof e2.priority === "number"
                            ? e2.priority
                            : 1;
                    throw p1 > p2 ? e1 : e2;
                }
            })
        );
    }

    map<U extends Tuple>(fn: Map<T, U>): Filter<U> {
        return new Filter((request: Request) =>
            this.run(request)
                .then((argsT: T) => fn(...argsT))
                .then((f) => new Filter(f).run(request))
        );
    }

    recover(fn: Recover<T>): Filter<T> {
        return new Filter((request: Request) =>
            this.run(request)
                .catch((error) => fn(error))
                .then((f) => new Filter(f).run(request))
        );
    }

    with(fn: With<T>): Filter<T> {
        return new Filter((request: Request) =>
            new Filter(fn(this)).run(request)
        );
    }

    priority(priority: number): Filter<T> {
        return new Filter((request: Request) =>
            this.run(request).catch(async (error) => {
                throw withPriority(error, priority);
            })
        );
    }
}
