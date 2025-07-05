/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type Builder,
  type BuilderContext,
  type BuilderOutput,
  createBuilder,
} from '@angular-devkit/architect';
import type { ConfigOptions } from 'karma';

import type { Schema as KarmaBuilderOptions } from './schema';

export type KarmaConfigOptions = ConfigOptions & {
  configFile?: string;
};

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export async function* execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms: {
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: KarmaConfigOptions) => KarmaConfigOptions;
  } = {},
): AsyncIterable<BuilderOutput> {
  const { execute } = await import('./application_builder');

  yield* execute(options, context, transforms);
}

export type { KarmaBuilderOptions };

const builder: Builder<KarmaBuilderOptions> = createBuilder<KarmaBuilderOptions>(execute);

export default builder;
