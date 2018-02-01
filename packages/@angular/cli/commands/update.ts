const Command = require('../ember-cli/lib/models/command');
import { UpdateTask } from '../tasks/update';

export interface UpdateOptions {
  schematic?: boolean;
}

const UpdateCommand = Command.extend({
  name: 'update',
  description: 'Updates your application.',
  works: 'everywhere',
  availableOptions: [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.'
    }
  ],

  anonymousOptions: [],

  run: function(commandOptions: any) {
    const schematic = '@schematics/package-update:all';

    const updateTask = new UpdateTask({
      ui: this.ui,
      project: this.project
    });

    return updateTask.run(schematic, commandOptions);
  }
});

export default UpdateCommand;
