/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ProgressPlugin as WebpackProgressPlugin } from 'webpack';
import { Spinner } from '../../utils/spinner';

export class ProgressPlugin extends WebpackProgressPlugin {
  constructor(platform: 'server' | 'browser') {
    const platformCapitalFirst = platform.replace(/^\w/, (s) => s.toUpperCase());
    const spinner = new Spinner();
    spinner.start(`Generating ${platform} application bundles (phase: setup)...`);

    super({
      handler: (percentage: number, message: string) => {
        const phase = message ? ` (phase: ${message})` : '';
        spinner.text = `Generating ${platform} application bundles${phase}...`;

        switch (percentage) {
          case 1:
            if (spinner.isSpinning) {
              spinner.succeed(`${platformCapitalFirst} application bundle generation complete.`);
            }
            break;
          case 0:
            if (!spinner.isSpinning) {
              spinner.start();
            }
            break;
        }
      },
    });
  }
}
