/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Command } from '../models/command';
import { colors } from '../utilities/color';
import { Schema as AwesomeCommandSchema } from './easter-egg';

function pickOne(of: string[]): string {
  return of[Math.floor(Math.random() * of.length)];
}

export class AwesomeCommand extends Command<AwesomeCommandSchema> {
  async run() {
    const phrase = pickOne([
      `You're on it, there's nothing for me to do!`,
      `Let's take a look... nope, it's all good!`,
      `You're doing fine.`,
      `You're already doing great.`,
      `Nothing to do; already awesome. Exiting.`,
      `Error 418: As Awesome As Can Get.`,
      `I spy with my little eye a great developer!`,
      `Noop... already awesome.`,
    ]);
    this.logger.info(colors.green(phrase));
  }
}
