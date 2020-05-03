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
 * @typeParam T - Left tuple
 * @typeParam U - Right tuple
 */
export type Concat<T extends Tuple, U extends Tuple> = List.Concat<
    T,
    U
> extends infer R
    ? R extends Tuple
        ? R
        : never
    : never;

/**
 * Filters a tuple
 *
 * @typeParam T - Tuple to filter
 * @typeParam U - Elements to filter out
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
 * Checks if a type is and instance of another type
 *
 * @returns `true` if T is an instance of U, `false` otherwise
 */
export type IsInstanceOf<T, U> = U extends Class.Class
    ? T extends Class.InstanceOf<U>
        ? true
        : false
    : false;
