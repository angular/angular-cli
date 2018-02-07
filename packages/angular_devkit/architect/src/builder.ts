/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, logging, virtualFs } from '@angular-devkit/core';
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

export interface BuilderMap {
  builders: { [k: string]: BuilderDescription };
}

export interface BuilderDescription {
  class: Path;
  schema: Path;
  description: string;
}

export interface BuilderConstructor<OptionsT> {
  new(context: BuilderContext): Builder<OptionsT>;
}
