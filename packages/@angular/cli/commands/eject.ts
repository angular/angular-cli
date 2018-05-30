import { CommandScope, Option } from '../models/command';
import { CoreSchematicOptions, SchematicCommand } from '../models/schematic-command';


export interface EjectOptions extends CoreSchematicOptions { }

export default class EjectCommand extends SchematicCommand {
  public readonly name = 'eject';
  public readonly description = 'Create a basic Webpack configuration for your app.';
  public static aliases: string[] = [];
  public readonly scope = CommandScope.everywhere;
  public arguments: string[] = [];
  public options: Option[] = [];

  private collectionName = '@schematics/angular';
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

  public async run(options: EjectOptions) {
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
