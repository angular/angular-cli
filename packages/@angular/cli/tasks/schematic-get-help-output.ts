import chalk from 'chalk';
const Task = require('../ember-cli/lib/models/task');

const { cyan, grey } = chalk;

export interface SchematicGetHelpOptions {
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
  run: function ({schematicName, collectionName}: SchematicGetHelpOptions):
    Promise<SchematicAvailableOptions[]> {

    const SchematicGetOptionsTask = require('./schematic-get-options').default;
    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });
    return getOptionsTask.run({
      schematicName: schematicName,
      collectionName: collectionName,
    })
    .then((availableOptions: SchematicAvailableOptions[]) => {
      const output: string[] = [];
      availableOptions
        .filter(opt => opt.name !== 'name')
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
              (acc, curr) => {
                return acc + ` -${curr}`;
              },
              '');
            output.push(grey(`      aliases: ${aliasText}`));
          }
        });
      return output;
    });
  }
});
