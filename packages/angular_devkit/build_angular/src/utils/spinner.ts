/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ora from 'ora';
import { colors } from './color';

export class Spinner {
  private readonly spinner: ora.Ora;

  /** When false, only fail messages will be displayed. */
  enabled = true;

  constructor(text?: string) {
    this.spinner = ora(text);
  }

  set text(text: string) {
    this.spinner.text = text;
  }

  succeed(text?: string): void {
    if (this.enabled) {
      this.spinner.succeed(text);
    }
  }

  fail(text?: string): void {
    this.spinner.fail(text && colors.redBright(text));
  }

  stop(): void {
    this.spinner.stop();
  }

  start(text?: string) {
    if (this.enabled) {
      this.spinner.start(text);
    }
  }
}
