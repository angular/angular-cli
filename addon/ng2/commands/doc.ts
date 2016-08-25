import * as Command from 'ember-cli/lib/models/command';
import * as DocTask from '../tasks/doc';

const DocCommand = Command.extend({
  name: 'doc',
  description: 'Opens the official Angular documentation for a given keyword.',
  works: 'everywhere',

  anonymousOptions: [
    '<keyword>'
  ],

  run: function(commandOptions, rawArgs: Array<string>) {
    const keyword = rawArgs[0];

    const docTask = new DocTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return docTask.run(keyword);
  }
});

module.exports = DocCommand;
