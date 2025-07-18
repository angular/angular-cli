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
      "args": ["@angular/cli", "mcp"]
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
    return localYargs;
  }

  async run(): Promise<void> {
    if (isTTY()) {
      this.context.logger.info(INTERACTIVE_MESSAGE);

      return;
    }

    const server = await createMcpServer(
      { workspace: this.context.workspace },
      this.context.logger,
    );
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}
