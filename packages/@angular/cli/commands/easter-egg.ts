import { terminal } from '@angular-devkit/core';
import { Command, Option } from '../models/command';

function pickOne(of: string[]): string {
  return of[Math.floor(Math.random() * of.length)];
}

export default class AwesomeCommand extends Command {
  public readonly name = 'make-this-awesome';
  public readonly description = '';
  public readonly hidden = true;
  readonly arguments: string[] = [];
  readonly options: Option[] = [];

  run() {
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
    this.logger.info(terminal.green(phrase));
  }
}
