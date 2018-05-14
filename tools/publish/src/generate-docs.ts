import { logging, schema, strings, tags } from '@angular-devkit/core';
import { formats } from '@angular-devkit/schematics';
import {
  NodeModulesEngineHost,
  validateOptionsWithSchema,
} from '@angular-devkit/schematics/tools';
import * as fs from 'fs';
import * as path from 'path';

export default async function () {
  const commandsPath = __dirname + '/../../../packages/@angular/cli/commands';
  const commandFiles = fs.readdirSync(commandsPath);

  const engineHost = new NodeModulesEngineHost();
  const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
  engineHost.registerOptionsTransform(validateOptionsWithSchema(registry));

  for (const commandFile of commandFiles) {
    const commandConstructor = require(path.join(commandsPath, commandFile)).default;
    const command = new commandConstructor(
      { project: { root: path.join(__dirname, '../fake_root/') } },
      new logging.NullLogger(),
    );

    if (command.hidden) {
      continue;
    }

    generateDoc(command, commandFile);

    if (command.name === 'generate') {
      const collection = engineHost.createCollectionDescription('@schematics/angular');

      for (const schematicName in collection.schematics) {
        const schematic = collection.schematics[schematicName];
        if (schematic.hidden || schematic.private) {
          continue;
        }
        const generateCommand = new commandConstructor(
          { project: { root: path.join(__dirname, '../fake_root/') } },
          new logging.NullLogger(),
        );
        generateDoc(
          generateCommand,
          commandFile,
          { _: [`${collection.name}:${schematicName}`] },
          {
            name: strings.dasherize(schematicName),
            namePrefix: 'generate ',
            description: schematic.description,
            path: 'generate',
          },
        );
      }
    }
  }
}

interface DocInfo {
  name: string;
  namePrefix: string;
  description: string;
  path: string;
}
async function generateDoc(
  command: any,
  commandFile: string,
  options: any = {},
  info?: Partial<DocInfo>,
) {
  const docInfo = {
    name: command.name,
    namePrefix: '',
    description: command.description,
    path: '',
    ...info,
  };

  try {
    await command.initialize(options);
  } catch (e) {
    console.log(`initialize failed [${commandFile}]: ` + e);
  }

  let optionText;
  if (!command.options) {
    optionText = '';
  } else {
    optionText = (command.options as any[])
      .filter(option => !option.hidden)
      .map(option => {
        let defaultText = '';
        if (option.default) {
          defaultText = ` <em>default value: ${option.default}</em>`;
        }
        let aliasText = '';
        if (option.aliases && option.aliases.length > 0) {
          aliasText = (option.aliases as string[])
            .map(alias => '<code>' + (alias.length === 1 ? '-' : '--') + alias + '</code>')
            .join(',');
          aliasText = ` (alias: ${aliasText})`;
        }

        return tags.stripIndent`
          <details>
            <summary>${option.name}</summary>
            <p>
              <code>--${option.name}</code>${aliasText}${defaultText}
            </p>
            <p>
              ${option.description}
            </p>
          </details>
        `;
      }).join('\n');
  }

  const docFile = path.join(
    __dirname,
    '../../../docs/documentation/',
    docInfo.path,
    strings.dasherize(docInfo.name) + '.md',
  );

  let docText;
  if (fs.existsSync(docFile)) {
    docText = fs.readFileSync(docFile, 'utf8');
    docText = docText.slice(0, docText.indexOf('## Options') + 10);
  } else {
    // tslint:disable:max-line-length
    docText = tags.stripIndent`
      <!-- Links in /docs/documentation should NOT have \`.md\` at the end, because they end up in our wiki at release. -->

      # ng ${docInfo.namePrefix}${docInfo.name}

      ## Overview
      ${docInfo.description}

      ## Options
    `;
    // tslint:enable:max-line-length
  }

  const finalText = docText + '\n' + (optionText ? optionText : 'None.') + '\n';
  fs.writeFileSync(docFile, finalText);
}
