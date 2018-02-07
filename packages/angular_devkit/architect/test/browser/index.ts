/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs/Observable';
import { BuildEvent, Builder, Target } from '../../src';


const successBuildEvent: BuildEvent = {
  success: true,
};

const failBuildEvent: BuildEvent = {
  success: false,
};

export interface BrowserTargetOptions {
  browserOption: number;
  optimizationLevel: number;
}

export default class BrowserTarget implements Builder<BrowserTargetOptions> {
  // constructor(public context: BuilderContext) { }

  run(_info: Target<Partial<BrowserTargetOptions>>): Observable<BuildEvent> {
    return new Observable(obs => {
      obs.next(successBuildEvent);
      obs.next(failBuildEvent);
      obs.next(successBuildEvent);
      obs.complete();
    });
  }
}
