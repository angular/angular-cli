const Command = require('../ember-cli/lib/models/command');
import { DocTask } from '../tasks/doc';

export interface DocOptions {
  search?: boolean;
}

const DocCommand = Command.extend({
  name: 'doc',
  description: 'Opens the official Angular API documentation for a given keyword.',
  works: 'everywhere',
  availableOptions: [
    {
      name: 'search',
      aliases: ['s'],
      type: Boolean,
      default: false,
      description: 'Search whole angular.io instead of just api.'
    }
  ],

  anonymousOptions: [
    '<keyword>'
  ],

  run: function(commandOptions: DocOptions, rawArgs: Array<string>) {
    const keyword = rawArgs[0];

    const docTask = new DocTask({
      ui: this.ui,
      project: this.project
    });

    return docTask.run(keyword, commandOptions.search);
  }
});

export default DocCommand;
