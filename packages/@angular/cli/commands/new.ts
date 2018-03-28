import { CommandScope, Option } from '../models/command';
import { getDefaultSchematicCollection } from '../utilities/config';
import { SchematicCommand } from '../models/schematic-command';


export default class NewCommand extends SchematicCommand {
  public readonly name = 'new';
  public readonly description =
    'Creates a new directory and a new Angular app.';
  public static aliases = ['n'];
  public scope = CommandScope.outsideProject;
  public options: Option[] = [
    ...this.coreOptions,
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      aliases: ['v'],
      description: 'Adds more details to output logging.'
    },
    {
      name: 'collection',
      type: String,
      aliases: ['c'],
      description: 'Schematics collection to use.'
    }
  ];

  private initialized = false;
  public initialize(options: any) {
    if (this.initialized) {
      return Promise.resolve();
    }
    super.initialize(options);
    this.initialized = true;

    const collectionName = this.parseCollectionName(options);
    const schematicName = 'application';

    return this.getOptions({
        schematicName,
        collectionName
      })
      .then((availableOptions: Option[]) => {
        // if (availableOptions) {
        //   availableOptions = availableOptions.filter(opt => opt.name !== 'name');
        // }

        this.options = this.options.concat( availableOptions || []);
      });
  }

  public async run(options: any) {
    if (options.dryRun) {
      options.skipGit = true;
    }

    let collectionName: string;
    if (options.collection) {
      collectionName = options.collection;
    } else {
      collectionName = this.parseCollectionName(options);
    }

    const pathOptions = this.setPathOptions(options, '/');
    options = { ...options, ...pathOptions };

    const packageJson = require('../package.json');
    options.version = packageJson.version;

    // Ensure skipGit has a boolean value.
    options.skipGit = options.skipGit === undefined ? false : options.skipGit;

    options = this.removeLocalOptions(options);

    return this.runSchematic({
      collectionName: collectionName,
      schematicName: 'ng-new',
      schematicOptions: options,
      debug: options.debug,
      dryRun: options.dryRun,
      force: options.force
    });
  }

  private parseCollectionName(options: any): string {
    const collectionName = options.collection || options.c || getDefaultSchematicCollection();

    return collectionName;
  }

  private removeLocalOptions(options: any): any {
    const opts = Object.assign({}, options);
    delete opts.verbose;
    delete opts.collection;
    return opts;
  }
}
