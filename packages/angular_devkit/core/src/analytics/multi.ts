/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Analytics, EventOptions, PageviewOptions, ScreenviewOptions, TimingOptions } from './api';

/**
 * Analytics implementation that reports to multiple analytics backend.
 */
export class MultiAnalytics implements Analytics {
  constructor(protected _backends: Analytics[] = []) {}

  push(...backend: Analytics[]) {
    this._backends.push(...backend);
  }

  event(category: string, action: string, options?: EventOptions): void {
    this._backends.forEach(be => be.event(category, action, options));
  }
  screenview(screenName: string, appName: string, options?: ScreenviewOptions): void {
    this._backends.forEach(be => be.screenview(screenName, appName, options));
  }
  pageview(path: string, options?: PageviewOptions): void {
    this._backends.forEach(be => be.pageview(path, options));
  }
  timing(category: string, variable: string, time: string | number, options?: TimingOptions): void {
    this._backends.forEach(be => be.timing(category, variable, time, options));
  }


  flush(): Promise<void> {
    return Promise.all(this._backends.map(x => x.flush())).then(() => {});
  }
}
