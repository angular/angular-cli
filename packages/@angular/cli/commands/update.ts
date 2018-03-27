import { CommandScope, Option } from '../models/command';
import { SchematicCommand, CoreSchematicOptions } from '../models/schematic-command';

export interface UpdateOptions extends CoreSchematicOptions {
  next: boolean;
  schematic?: boolean;
}


export default class UpdateCommand extends SchematicCommand {
  public readonly name = 'update';
  public readonly description = 'Updates your application and its dependencies.';
  public static aliases: string[] = [];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [ 'packages' ];
  public readonly options: Option[] = [
    ...this.coreOptions,
  ];

  public async run(options: UpdateOptions) {
    const collectionName = '@schematics/update';
    const schematicName = 'update';

    const schematicRunOptions = {
      collectionName,
      schematicName,
      schematicOptions: options,
      dryRun: options.dryRun,
      force: options.force,
      workingDir: this.project.root,
    };

    return this.runSchematic(schematicRunOptions);
  }
}
