import * as Command from 'ember-cli/lib/models/command';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as stringUtils from 'ember-cli-string-utils';
import * as chalk from 'chalk';


function pickOne(of: string[]): string {
  return of[Math.floor(Math.random() * of.length)];
}


module.exports = function(name) {
  return Command.extend({
    name: name,
    works: 'insideProject',

    run: function (commandOptions, rawArgs): Promise<void> {
      this[stringUtils.camelize(this.name)](commandOptions, rawArgs);

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
};
