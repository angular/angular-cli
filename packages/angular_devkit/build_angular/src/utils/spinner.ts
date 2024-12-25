/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Spinner as PicoSpinner } from 'picospinner';
import { colors } from './color';
import { isTTY } from './tty';

export class Spinner {
  private readonly spinner?: PicoSpinner;

  /** When false, only fail messages will be displayed. */
  enabled = true;
  readonly #isTTY = isTTY();

  constructor(text?: string) {
    if (this.#isTTY) {
      this.spinner = new PicoSpinner(text === undefined ? undefined : text + '\n');
    }
  }

  set text(text: string) {
    this.spinner?.setText(text);
  }

  get isSpinning(): boolean {
    return this.spinner?.running || !this.#isTTY;
  }

  succeed(text?: string): void {
    if (this.enabled) {
      this.spinner?.succeed(text);
    }
  }

  fail(text?: string): void {
    this.spinner?.fail(text && colors.redBright(text));
  }

  stop(): void {
    this.spinner?.stop();
  }

  start(text?: string): void {
    if (this.enabled) {
      if (text) {
        this.text = text;
      }
      this.spinner?.start();
    }
  }
}
