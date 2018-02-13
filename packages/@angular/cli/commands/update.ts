import { Command, CommandScope } from '../models/command';
import { UpdateTask } from '../tasks/update';

export interface UpdateOptions {
  schematic?: boolean;
}


export default class UpdateCommand extends Command {
  public readonly name = 'update';
  public readonly description = 'Updates your application.';
  public static aliases: string[] = [];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options = [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.'
    },
    {
      name: 'next',
      type: Boolean,
      default: false,
      description: 'Install the next version, instead of the latest.'
    }
  ];

  public async run(options: any) {
    const schematic = '@schematics/package-update:all';

    const updateTask = new UpdateTask({
      ui: this.ui,
      project: this.project
    });

    return await updateTask.run(schematic, options);
  }
}
