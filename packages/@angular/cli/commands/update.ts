import { CommandScope, Option } from '../models/command';
import { SchematicCommand, CoreSchematicOptions } from '../models/schematic-command';

export interface UpdateOptions extends CoreSchematicOptions {
  next: boolean;
  schematic?: boolean;
}


export default class UpdateCommand extends SchematicCommand {
  public readonly name = 'update';
  public readonly description = 'Updates your application.';
  public static aliases: string[] = [];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [
    ...this.coreOptions,
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

  public async run(options: UpdateOptions) {
    const collectionName = '@schematics/package-update';
    const schematicName = 'all';


    const schematicRunOptions = {
      collectionName,
      schematicName,
      schematicOptions: {
        version: options.next ? 'next' : undefined
      },
      dryRun: options.dryRun,
      force: options.force,
      workingDir: this.project.root,
    };

    return this.runSchematic(schematicRunOptions);
  }
}
