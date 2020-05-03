/**
 * Type utilities
 * @packageDocumentation
 */

import { Class, List } from "ts-toolbelt";

/**
 * A tuple
 *
 * The length of tuples is limited to 16 elements
 * (honeslty if you have functions with more than 16 parameters you should refactor some stuff).
 * User the [[`map`]] combinator to go around this limitation.
 */
export type Tuple<T = unknown> = [
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?,
    T?
];

/**
 * Concatenates two tuples
 *
 * @typeParam L - Left tuple
 * @typeParam R - Right tuple
 */
export type Concat<L extends Tuple, R extends Tuple> = List.Concat<
    L,
    R
> extends infer T
    ? T extends Tuple
        ? T
        : never
    : never;

/**
 * Filters a tuple
 *
 * @typeParam T - Tuple to filter
 * @typeParam F - Elements to filter out
 */
export type Filter<T extends Tuple, F = null> = List.Filter<
    T,
    F
> extends infer R
    ? R extends Tuple
        ? R
        : never
    : never;

/**
 * Checks if a type is an instance of another type
 *
 * @typeParam C - Class
 * @typeParam I - Instance
 *
 * @returns `true` or `false`
 */
export type IsInstanceOf<C, I> = C extends Class.Class
    ? I extends Class.InstanceOf<C>
        ? true
        : false
    : false;
