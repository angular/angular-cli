/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { terminal } from '@angular-devkit/core';
import { ProgressReporter } from './progress-reporter';


const { bold, green, white, yellow } = terminal;

export class VerboseProgressReporter extends ProgressReporter {

  constructor(private colours: boolean) {
    super();
  }

  // ***% (msg) [detail] [detail]

  protected handleProgress(percentage: number, msg: string, ...args: string[]): void {
    percentage = Math.floor(percentage * 100);
    let buildingString =
      (this.colours ? bold(percentage + '') : percentage)
        + '%';
    if (percentage < 100) { // Shift string right
      buildingString = ` ${buildingString}`;
    }

    if (percentage < 10) { // Shift string right
      buildingString = ` ${buildingString}`;
    }

    if (msg) {
      buildingString += ' (' +
        (this.colours ? bold(yellow(msg)) : msg)
          + ')';
    }

    if (args) {
      for (const arg of args) {
        if (arg) {
          buildingString += ' [' +
            (this.colours ? green(arg) : arg)
            + ']';
        }
      }
    }
    console.log(buildingString);
  }

}
