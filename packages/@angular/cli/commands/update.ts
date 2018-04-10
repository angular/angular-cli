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
  public arguments: string[] = [ 'packages' ];
  public options: Option[] = [
    // Remove the --force flag.
    ...this.coreOptions.filter(option => option.name !== 'force'),
  ];
  public readonly allowMissingWorkspace = true;

  private collectionName = '@schematics/update';
  private schematicName = 'update';

  private initialized = false;
  public async initialize(options: any) {
    if (this.initialized) {
      return;
    }
    super.initialize(options);
    this.initialized = true;

    const schematicOptions = await this.getOptions({
      schematicName: this.schematicName,
      collectionName: this.collectionName,
    });
    this.options = this.options.concat(schematicOptions.options);
    this.arguments = this.arguments.concat(schematicOptions.arguments.map(a => a.name));
  }

  public async run(options: UpdateOptions) {
    return this.runSchematic({
      collectionName: this.collectionName,
      schematicName: this.schematicName,
      schematicOptions: options,
      dryRun: options.dryRun,
      force: false,
      showNothingDone: false,
    });
  }
}
