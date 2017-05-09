const Command = require('../ember-cli/lib/models/command');
const stringUtils = require('ember-cli-string-utils');
import * as chalk from 'chalk';


function pickOne(of: string[]): string {
  return of[Math.floor(Math.random() * of.length)];
}


const MakeThisAwesomeCommand = Command.extend({
  name: 'make-this-awesome',
  works: 'insideProject',
  hidden: true,

  run: function (commandOptions: any, rawArgs: string[]): Promise<void> {
    (this as any)[stringUtils.camelize(this.name)](commandOptions, rawArgs);

    return Promise.resolve();
  },

  makeThisAwesome: function() {
    const phrase = pickOne([
      `You're on it, there's nothing for me to do!`,
      `Let's take a look... nope, it's all good!`,
      `You're doing fine.`,
      `You're already doing great.`,
      `Nothing to do; already awesome. Exiting.`,
      `Error 418: As Awesome As Can Get.`
    ]);
    console.log(chalk.green(phrase));
  }
});

export default MakeThisAwesomeCommand;
