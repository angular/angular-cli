/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZodRawShape } from 'zod';
import type { AngularWorkspace } from '../../../utilities/config';

type ToolConfig = Parameters<McpServer['registerTool']>[1];

export interface McpToolContext {
  workspace?: AngularWorkspace;
  logger: { warn(text: string): void };
  exampleDatabasePath?: string;
}

export type McpToolFactory<TInput extends ZodRawShape> = (
  context: McpToolContext,
) => ToolCallback<TInput> | Promise<ToolCallback<TInput>>;

export interface McpToolDeclaration<TInput extends ZodRawShape, TOutput extends ZodRawShape> {
  name: string;
  title?: string;
  description: string;
  annotations?: ToolConfig['annotations'];
  inputSchema?: TInput;
  outputSchema?: TOutput;
  factory: McpToolFactory<TInput>;
  shouldRegister?: (context: McpToolContext) => boolean | Promise<boolean>;
  isReadOnly?: boolean;
  isLocalOnly?: boolean;
}

export function declareTool<TInput extends ZodRawShape, TOutput extends ZodRawShape>(
  declaration: McpToolDeclaration<TInput, TOutput>,
): McpToolDeclaration<TInput, TOutput> {
  return declaration;
}

export async function registerTools(
  server: McpServer,
  context: McpToolContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declarations: McpToolDeclaration<any, any>[],
): Promise<void> {
  for (const declaration of declarations) {
    if (declaration.shouldRegister && !(await declaration.shouldRegister(context))) {
      continue;
    }

    const { name, factory, shouldRegister, isReadOnly, isLocalOnly, ...config } = declaration;

    const handler = await factory(context);

    // Add declarative characteristics to annotations
    config.annotations ??= {};
    if (isReadOnly !== undefined) {
      config.annotations.readOnlyHint = isReadOnly;
    }
    if (isLocalOnly !== undefined) {
      // openWorldHint: false means local only
      config.annotations.openWorldHint = !isLocalOnly;
    }

    server.registerTool(name, config, handler);
  }
}
