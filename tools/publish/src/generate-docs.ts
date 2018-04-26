import * as fs from 'fs';
import * as path from 'path';
import { logging, tags } from '@angular-devkit/core';

export default async function () {
  const commandsPath = __dirname + '/../../../packages/@angular/cli/commands';
  const commandFiles = fs.readdirSync(commandsPath);

  for (const commandFile of commandFiles) {
    const commandConstructor = require(path.join(commandsPath, commandFile)).default;
    const command = new commandConstructor(
      { project: { root: path.join(__dirname, '../fake_root/') } },
      new logging.NullLogger(),
    );

    if (command.hidden) {
      continue;
    }

    try {
      await command.initialize({});
    } catch (e) {
      console.log(`initialize failed [${commandFile}]: ` + e.toString());
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
            defaultText = `<em>default value: ${option.default}</em>`;
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
                <code>--${option.name}</code>${aliasText} ${defaultText}
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
      path.basename(commandFile, '.ts') + '.md');

    let docText;
    if (fs.existsSync(docFile)) {
      docText = fs.readFileSync(docFile, 'utf8');
      docText = docText.slice(0, docText.indexOf('## Options') + 10);
    } else {
      // tslint:disable:max-line-length
      docText = tags.stripIndent`
        <!-- Links in /docs/documentation should NOT have \`.md\` at the end, because they end up in our wiki at release. -->

        # ng ${command.name}

        ## Overview
        ${command.description}

        ## Options
      `;
      // tslint:enable:max-line-length
    }

    const finalText = docText + '\n' + (optionText ? optionText : 'None.') + '\n';
    fs.writeFileSync(docFile, finalText);
  }
}
