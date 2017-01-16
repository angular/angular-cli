const Command = require('../ember-cli/lib/models/command');
import { DocTask } from '../tasks/doc';

const DocCommand = Command.extend({
  name: 'doc',
  description: 'Opens the official Angular documentation for a given keyword.',
  works: 'everywhere',

  anonymousOptions: [
    '<keyword>'
  ],

  run: function(commandOptions: any, rawArgs: Array<string>) {
    const keyword = rawArgs[0];

    const docTask = new DocTask({
      ui: this.ui,
      project: this.project
    });

    return docTask.run(keyword);
  }
});

export default DocCommand;
