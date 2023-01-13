/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Schema as WtrBuilderSchema } from './schema';

/**
 * Options supported for the Web Test Runner builder. The schema is an approximate
 * representation of the options type, but this is a more precise version.
 */
export type WtrBuilderOptions = Overwrite<
  WtrBuilderSchema,
  {
    include: string[];
    exclude: string[];
    polyfills: string[];
  }
>;

type Overwrite<Obj extends {}, Overrides extends {}> = Omit<Obj, keyof Overrides> & Overrides;

/**
 * Normalizes input options validated by the schema to a more precise and useful
 * options type in {@link WtrBuilderOptions}.
 */
export function normalizeOptions(schema: WtrBuilderSchema): WtrBuilderOptions {
  return {
    ...schema,

    // Options with default values can't actually be null, even if the types say so.
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    include: schema.include!,
    exclude: schema.exclude!,
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    polyfills: typeof schema.polyfills === 'string' ? [schema.polyfills] : schema.polyfills ?? [],
  };
}
