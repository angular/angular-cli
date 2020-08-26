/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Logger } from '../logger';
import { Analytics, EventOptions, PageviewOptions, ScreenviewOptions, TimingOptions } from './api';

/**
 * Analytics implementation that logs analytics events to a logger. This should be used for
 * debugging mainly.
 */
export class LoggingAnalytics implements Analytics {
  constructor(protected _logger: Logger) {}

  event(category: string, action: string, options?: EventOptions): void {
    this._logger.info('event ' + JSON.stringify({ category, action, ...options }));
  }
  screenview(screenName: string, appName: string, options?: ScreenviewOptions): void {
    this._logger.info('screenview ' + JSON.stringify({ screenName, appName, ...options }));
  }
  pageview(path: string, options?: PageviewOptions): void {
    this._logger.info('pageview ' + JSON.stringify({ path, ...options }));
  }
  timing(category: string, variable: string, time: string | number, options?: TimingOptions): void {
    this._logger.info('timing ' + JSON.stringify({ category, variable, time, ...options }));
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }
}
