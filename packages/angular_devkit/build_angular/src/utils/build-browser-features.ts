/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import browserslist from 'browserslist';
import { feature, features } from 'caniuse-lite';

export class BuildBrowserFeatures {
  readonly supportedBrowsers: string[];

  constructor(private projectRoot: string) {
    // By default, browserslist defaults are too inclusive
    // https://github.com/browserslist/browserslist/blob/83764ea81ffaa39111c204b02c371afa44a4ff07/index.js#L516-L522

    // We change the default query to browsers that Angular support.
    // https://angular.io/guide/browser-support
    browserslist.defaults = [
      'last 1 Chrome version',
      'last 1 Firefox version',
      'last 2 Edge major versions',
      'last 2 Safari major versions',
      'last 2 iOS major versions',
      'Firefox ESR',
    ];

    this.supportedBrowsers = browserslist(undefined, { path: this.projectRoot });
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
