import { stripIndent } from 'common-tags';

const chalk = require('chalk');
const Command = require('../ember-cli/lib/models/command');

const UpdateCommand = Command.extend({
  name: 'update',
  description: 'Updates your application.',
  works: 'everywhere',
  availableOptions: [],
  anonymousOptions: [],

  run: function(_commandOptions: any) {
    console.log(chalk.red(stripIndent`
      CLI 1.7 does not support an automatic v6 update. Manually install @angular/cli via your
      package manager, then run the update migration schematic to finish the process.


        npm install @angular/cli@^6.0.0
        ng update @angular/cli --migrate-only --from=1
    ` + '\n\n'));
  }
});

export default UpdateCommand;
