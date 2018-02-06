const Task = require('../ember-cli/lib/models/task');
import SchematicRunTask from './schematic-run';

export interface UpdateTaskOptions {
  dryRun: boolean;
  force: boolean;
  next: boolean;
}

export const UpdateTask: any = Task.extend({
  run: function(schematic: string, options: UpdateTaskOptions): Promise<any> {
    const [collectionName, schematicName] = schematic.split(':');

    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });

    const schematicRunOptions = {
      taskOptions: {
        dryRun: options.dryRun,
        version: options.next ? 'next' : undefined
      },
      workingDir: this.project.root,
      collectionName,
      schematicName
    };

    return schematicRunTask.run(schematicRunOptions);
  }
});
