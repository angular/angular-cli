/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { experimental, json } from '@angular-devkit/core';
import { BuilderInfo, BuilderInput, BuilderOutput, Target } from './api';

// Internal types that should not be exported directly. These are used by the host and architect
// itself. Host implementations should import the host.ts file.

/**
 * BuilderSymbol used for knowing if a function was created using createBuilder(). This is a
 * property set on the function that should be `true`.
 * Using Symbol.for() as it's a global registry that's the same for all installations of
 * Architect (if some libraries depends directly on architect instead of sharing the files).
 */
export const BuilderSymbol = Symbol.for('@angular-devkit/architect:builder');

/**
 * BuilderVersionSymbol used for knowing which version of the library createBuilder() came from.
 * This is to make sure we don't try to use an incompatible builder.
 * Using Symbol.for() as it's a global registry that's the same for all installations of
 * Architect (if some libraries depends directly on architect instead of sharing the files).
 */
export const BuilderVersionSymbol = Symbol.for('@angular-devkit/architect:version');

/**
 * A Specialization of the JobHandler type. This exposes BuilderDescription as the job description
 * type.
 */
export type BuilderJobHandler<
  A extends json.JsonObject = json.JsonObject,
  I extends BuilderInput = BuilderInput,
  O extends BuilderOutput = BuilderOutput,
> = experimental.jobs.JobHandler<A, I, O> & { jobDescription: BuilderDescription };

/**
 * A Builder description, which is used internally. Adds the builder info which is the
 * metadata attached to a builder in Architect.
 */
export interface BuilderDescription extends experimental.jobs.JobDescription {
  info: BuilderInfo;
}

/**
 * A Builder instance. Use createBuilder() to create one of these.
 */
export interface Builder<OptionT extends json.JsonObject = json.JsonObject> {
  // A fully compatible job handler.
  handler: experimental.jobs.JobHandler<json.JsonObject, BuilderInput, BuilderOutput>;

  // Metadata associated with this builder.
  [BuilderSymbol]: true;
  [BuilderVersionSymbol]: string;
}

export interface ArchitectHost<BuilderInfoT extends BuilderInfo = BuilderInfo> {
  /**
   * Get the builder name for a target.
   * @param target The target to inspect.
   */
  getBuilderNameForTarget(target: Target): Promise<string | null>;

  /**
   * Resolve a builder. This needs to return a string which will be used in a dynamic `import()`
   * clause. This should throw if no builder can be found. The dynamic import will throw if
   * it is unsupported.
   * @param builderName The name of the builder to be used.
   * @returns All the info needed for the builder itself.
   */
  resolveBuilder(builderName: string): Promise<BuilderInfoT | null>;
  loadBuilder(info: BuilderInfoT): Promise<Builder | null>;

  getCurrentDirectory(): Promise<string>;
  getWorkspaceRoot(): Promise<string>;

  getOptionsForTarget(target: Target): Promise<json.JsonObject | null>;
}
