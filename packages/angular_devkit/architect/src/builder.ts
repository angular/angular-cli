/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject, Path, logging, virtualFs } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { Architect, Target } from './architect';


export interface BuilderContext {
  logger: logging.Logger;
  host: virtualFs.Host<{}>;
  architect: Architect;
}

// TODO: use Build Event Protocol
// https://docs.bazel.build/versions/master/build-event-protocol.html
// https://github.com/googleapis/googleapis/tree/master/google/devtools/build/v1
export interface BuildEvent {
  success: boolean;
}

export interface Builder<OptionsT> {
  run(_target: Target<Partial<OptionsT>>): Observable<BuildEvent>;
}

export interface BuilderPathsMap {
  builders: { [k: string]: BuilderPaths };
}

export interface BuilderPaths {
  class: Path;
  schema: Path;
  description: string;
}

export interface BuilderDescription {
  name: string;
  schema: JsonObject;
  description: string;
}

export interface BuilderConstructor<OptionsT> {
  new(context: BuilderContext): Builder<OptionsT>;
}
