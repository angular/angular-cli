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
        switch (opt.type) {
          case 'string':
            type = String;
            break;
          case 'boolean':
            type = Boolean;
            break;
        }
        let aliases: string[] = [];
        if (opt.alias) {
          aliases = [...aliases, opt.alias];
        }
        if (opt.aliases) {
          aliases = [...aliases, ...opt.aliases];
        }

        return {
          ...opt,
          aliases,
          type,
          default: undefined // do not carry over schematics defaults
        };
      });

    return Promise.resolve(availableOptions);
  }
});
