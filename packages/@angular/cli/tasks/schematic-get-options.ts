const Task = require('../ember-cli/lib/models/task');
const stringUtils = require('ember-cli-string-utils');
import { CliConfig } from '../models/config';
import { getCollection, getSchematic } from '../utilities/schematics';

export interface SchematicGetOptions {
  collectionName: string;
  schematicName: string;
}

export interface SchematicAvailableOptions {
  name: string;
  description: string;
  aliases: string[];
  type: any;
  schematicType: any;
  schematicDefault: any;
}

export default Task.extend({
  run: function (options: SchematicGetOptions): Promise<SchematicAvailableOptions[]> {
    const collectionName = options.collectionName ||
      CliConfig.getValue('defaults.schematics.collection');

    const collection = getCollection(collectionName);

    const schematic = getSchematic(collection, options.schematicName);

    const properties = schematic.description.schemaJson.properties;
    const keys = Object.keys(properties);
    const availableOptions = keys
      .map(key => ({...properties[key], ...{name: stringUtils.dasherize(key)}}))
      .map(opt => {
        let type;
        const schematicType = opt.type;
        switch (opt.type) {
          case 'string':
            type = String;
            break;
          case 'boolean':
            type = Boolean;
            break;
          case 'integer':
          case 'number':
            type = Number;
            break;

          // Ignore arrays / objects.
          default:
            return null;
        }
        let aliases: string[] = [];
        if (opt.alias) {
          aliases = [...aliases, opt.alias];
        }
        if (opt.aliases) {
          aliases = [...aliases, ...opt.aliases];
        }

        const schematicDefault = opt.default;

        return {
          ...opt,
          aliases,
          type,
          schematicType,
          default: undefined, // do not carry over schematics defaults
          schematicDefault
        };
      })
      .filter(x => x);

    return Promise.resolve(availableOptions);
  }
});
