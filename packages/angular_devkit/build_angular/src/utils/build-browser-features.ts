/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import browserslist from 'browserslist';
import { feature, features } from 'caniuse-lite';
import * as ts from 'typescript';

export class BuildBrowserFeatures {
  readonly supportedBrowsers: string[];

  constructor(private projectRoot: string) {
    this.supportedBrowsers = browserslist(undefined, { path: this.projectRoot });
  }

  /**
   * True, when one or more browsers requires ES5
   * support and the script target is ES2015 or greater.
   */
  isDifferentialLoadingNeeded(scriptTarget: ts.ScriptTarget): boolean {
    const es6TargetOrLater = scriptTarget > ts.ScriptTarget.ES5;

    return es6TargetOrLater && this.isEs5SupportNeeded();
  }

  /**
   * True, when one or more browsers requires ES5 support
   */
  isEs5SupportNeeded(): boolean {
    return !this.isFeatureSupported('es6-module');
  }

  /**
   * True, when a browser feature is supported partially or fully.
   */
  isFeatureSupported(featureId: string): boolean {
    // y: feature is fully available
    // n: feature is unavailable
    // a: feature is partially supported
    // x: feature is prefixed
    const criteria = ['y', 'a'];

    const data = feature(features[featureId]);

    return !this.supportedBrowsers.some((browser) => {
      const [agentId, version] = browser.split(' ');

      const browserData = data.stats[agentId];
      const featureStatus = (browserData && browserData[version]) as string | undefined;

      // We are only interested in the first character
      // Ex: when 'a #4 #5', we only need to check for 'a'
      // as for such cases we should polyfill these features as needed
      return !featureStatus || !criteria.includes(featureStatus.charAt(0));
    });
  }
}
