/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { createStructuredContentOutput } from '../../utils';
import { type McpToolContext, type McpToolDeclaration, declareTool } from '../tool-registry';
import { loadSchematicsMetadata } from './utils';

const listInputSchema = z.object({
  workspacePath: z
    .string()
    .describe('Path to the workspace angular.json (or any file within the workspace).'),
});

const listOutputSchema = z.object({
  schematics: z.array(
    z.object({
      name: z.string(),
      aliases: z.array(z.string()).optional(),
      description: z.string().optional(),
      hidden: z.boolean().optional(),
      private: z.boolean().optional(),
      required: z.array(z.string()).optional(),
      options: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            type: z.union([z.string(), z.array(z.string())]).optional(),
            enum: z.array(z.any()).optional(),
            default: z.any().optional(),
            required: z.boolean().optional(),
            alias: z.string().optional(),
            prompt: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export type ListSchematicsInput = z.infer<typeof listInputSchema>;
export type ListSchematicsOutput = z.infer<typeof listOutputSchema>;

async function handleListSchematics(input: ListSchematicsInput, context: McpToolContext) {
  // Always use injected loader if present (for tests)
  const { meta } = await loadSchematicsMetadata(
    input.workspacePath,
    context.logger,
    typeof context.schematicMetaLoader === 'function' ? context.schematicMetaLoader : undefined,
  );
  const serialized = meta.map((m) => ({
    name: m.name,
    aliases: m.aliases,
    description: m.description,
    hidden: m.hidden,
    private: m.private,
    required: m.required,
    options: m.options?.map((o) => ({
      name: o.name,
      description: o.description,
      type: o.type,
      enum: o.enum,
      default: o.default,
      required: o.required,
      alias: o.alias,
      prompt: o.prompt,
    })),
  }));

  return createStructuredContentOutput<ListSchematicsOutput>({
    schematics: serialized,
  });
}

export const LIST_SCHEMATICS_TOOL: McpToolDeclaration<
  typeof listInputSchema.shape,
  typeof listOutputSchema.shape
> = declareTool({
  name: 'list_schematics',
  title: 'List Angular Schematics',
  description: `
<Purpose>
Enumerates all schematics provided by @schematics/angular with full option metadata (types, defaults, enums, prompts, required flags).
</Purpose>
<Use Cases>
* Discover generators available before planning code changes.
* Inspect required options for a schematic prior to execution.
* Provide intelligent suggestions to users based on option types and prompts.
</Use Cases>
<Operational Notes>
* Resolution uses Node's module loader. If a schematic collection cannot be resolved, this tool returns an empty list.
* Hidden/private schematics are included for transparency.
* Use 'run_schematic' to actually execute a schematic after reviewing options here.
 * Official docs: https://angular.dev/tools/cli/schematics and https://angular.dev/cli/generate
</Operational Notes>
`,
  inputSchema: listInputSchema.shape,
  outputSchema: listOutputSchema.shape,
  isLocalOnly: true,
  isReadOnly: true,
  factory: (context) => (input) => handleListSchematics(input, context),
});
