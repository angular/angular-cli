import chalk from 'chalk';
const Task = require('../ember-cli/lib/models/task');

const { cyan, green, grey } = chalk;

export interface SchematicGetHelpOptions {
  collectionName: string;
  schematicName: string;
  nonSchematicOptions: any[];
}

export interface SchematicAvailableOptions {
  name: string;
  description: string;
  aliases: string[];
  type: any;
  schematicType: any;
  schematicDefault: any;
}

const hiddenOptions = [
  'name',
  'path',
  'source-dir',
  'app-root'
];

export default Task.extend({
  run: function ({schematicName, collectionName, nonSchematicOptions}: SchematicGetHelpOptions):
    Promise<string[]> {

    const SchematicGetOptionsTask = require('./schematic-get-options').default;
    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });
    return Promise.all([getOptionsTask.run({
      schematicName: schematicName,
      collectionName: collectionName,
    }), nonSchematicOptions])
    .then(([availableOptions, nonSchematicOptions]: [SchematicAvailableOptions[], any[]]) => {
      const output: string[] = [];
      [...(nonSchematicOptions || []), ...availableOptions || []]
        .filter(opt => hiddenOptions.indexOf(opt.name) === -1)
        .forEach(opt => {
          let text = cyan(`    --${opt.name}`);
          if (opt.schematicType) {
            text += cyan(` (${opt.schematicType})`);
          }
          if (opt.schematicDefault) {
            text += cyan(` (Default: ${opt.schematicDefault})`);
          }
          if (opt.description) {
            text += ` ${opt.description}`;
          }
          output.push(text);
          if (opt.aliases && opt.aliases.length > 0) {
            const aliasText = opt.aliases.reduce(
              (acc: string, curr: string) => {
                return acc + ` -${curr}`;
              },
              '');
            output.push(grey(`      aliases: ${aliasText}`));
          }
        });
      if (availableOptions === null) {
        output.push(green('This schematic accept additional options, but did not provide '
                        + 'documentation.'));
      }

      return output;
    });
  }
});
