/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  apply,
  applyTemplates,
  filter,
  forEach,
  mergeWith,
  move,
  noop,
  strings,
  url,
} from '@angular-devkit/schematics';
import { FileConfigurationHandlerOptions } from './types';

const TOML_MCP_SERVERS_PROP = '[mcp_servers.angular-cli]';

/**
 * Create or update a JSON MCP configuration file to include the Angular MCP server.
 */
export function addJsonMcpConfig(
  { tree, context, fileInfo, tool }: FileConfigurationHandlerOptions,
  mcpServersProperty: string,
): Rule {
  const { name, directory } = fileInfo;

  return mergeWith(
    apply(url('./files'), [
      filter((path) => path.includes('__jsonConfigName__')),
      applyTemplates({
        ...strings,
        jsonConfigName: name,
        mcpServersProperty,
      }),
      move(directory),
      forEach((file) => {
        if (!tree.exists(file.path)) {
          return file;
        }

        const existingFileBuffer = tree.read(file.path);

        // If we have an existing file, update the server property with
        // Angular MCP server configuration.
        if (existingFileBuffer) {
          // The JSON config file should be record-like.
          let existing: Record<string, unknown>;
          try {
            existing = JSON.parse(existingFileBuffer.toString());
          } catch {
            const path = `${directory}/${name}`;
            const toolName = strings.classify(tool);
            context.logger.warn(
              `Skipping Angular MCP server configuration for '${toolName}'.\n` +
                `Unable to modify '${path}'. ` +
                'Make sure that the file has a valid JSON syntax.\n',
            );

            return null;
          }
          const existingServersProp = existing[mcpServersProperty];
          const templateServersProp = JSON.parse(file.content.toString())[mcpServersProperty];

          // Note: If the Angular MCP server config already exists, we'll overwrite it.
          existing[mcpServersProperty] = existingServersProp
            ? {
                ...existingServersProp,
                ...templateServersProp,
              }
            : templateServersProp;

          tree.overwrite(file.path, JSON.stringify(existing, null, 2));

          return null;
        }

        return file;
      }),
    ]),
  );
}

/**
 * Create or update a TOML MCP configuration file to include the Angular MCP server.
 */
export function addTomlMcpConfig({
  tree,
  context,
  fileInfo,
  tool,
}: FileConfigurationHandlerOptions): Rule {
  const { name, directory } = fileInfo;

  return mergeWith(
    apply(url('./files'), [
      filter((path) => path.includes('__tomlConfigName__')),
      applyTemplates({
        ...strings,
        tomlConfigName: name,
      }),
      move(directory),
      forEach((file) => {
        if (!tree.exists(file.path)) {
          return file;
        }

        const existingFileBuffer = tree.read(file.path);

        if (existingFileBuffer) {
          let existing = existingFileBuffer.toString();
          if (existing.includes(TOML_MCP_SERVERS_PROP)) {
            const path = `${directory}/${name}`;
            const toolName = strings.classify(tool);
            context.logger.warn(
              `Skipping Angular MCP server configuration for '${toolName}'.\n` +
                `Configuration already exists in '${path}'.\n`,
            );

            return null;
          }

          // Add the configuration at the end of the file.
          const template = file.content.toString();
          existing = existing.length ? existing + '\n\n' + template : template;

          tree.overwrite(file.path, existing);

          return null;
        }

        return file;
      }),
    ]),
  );
}

/**
 * Create an Angular best practices Markdown.
 * If the file exists, the configuration is skipped.
 */
export function addBestPracticesMarkdown({
  tree,
  context,
  fileInfo,
  tool,
}: FileConfigurationHandlerOptions): Rule {
  const { name, directory } = fileInfo;
  const path = `${directory}/${name}`;

  if (tree.exists(path)) {
    const toolName = strings.classify(tool);
    context.logger.warn(
      `Skipping configuration file for '${toolName}' at '${path}' because it already exists.\n` +
        'This is to prevent overwriting a potentially customized file. ' +
        'If you want to regenerate it with Angular recommended defaults, please delete the existing file and re-run the command.\n' +
        'You can review the latest recommendations at https://angular.dev/ai/develop-with-ai.\n',
    );

    return noop();
  }

  return mergeWith(
    apply(url('./files'), [
      filter((path) => path.includes('__bestPracticesName__')),
      applyTemplates({
        ...strings,
        bestPracticesName: name,
      }),
      move(directory),
    ]),
  );
}
