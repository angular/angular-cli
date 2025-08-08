/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation } from '../../command-builder/command-module';
import { isTTY } from '../../utilities/tty';
import { createMcpServer } from './mcp-server';

const INTERACTIVE_MESSAGE = `
To start using the Angular CLI MCP Server, add this configuration to your host:

{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}

Exact configuration may differ depending on the host.
`;

export default class McpCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'mcp';
  describe = false as const;
  longDescriptionPath = undefined;

  builder(localYargs: Argv): Argv {
    return localYargs
      .option('read-only', {
        type: 'boolean',
        default: false,
        describe: 'Only register read-only tools.',
      })
      .option('local-only', {
        type: 'boolean',
        default: false,
        describe: 'Only register tools that do not require internet access.',
      })
      .option('experimental-tool', {
        type: 'string',
        alias: 'E',
        array: true,
        describe: 'Enable an experimental tool.',
      });
  }

  async run(options: {
    readOnly: boolean;
    localOnly: boolean;
    experimentalTool: string[] | undefined;
  }): Promise<void> {
    if (isTTY()) {
      this.context.logger.info(INTERACTIVE_MESSAGE);

      return;
    }

    const server = await createMcpServer(
      {
        workspace: this.context.workspace,
        readOnly: options.readOnly,
        localOnly: options.localOnly,
        experimentalTools: options.experimentalTool,
      },
      this.context.logger,
    );
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}
