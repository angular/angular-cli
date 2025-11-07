/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { dirname, join, relative } from 'path';
import { z } from 'zod';
import { CommandError, type Host, LocalWorkspaceHost } from '../host';
import { createStructuredContentOutput, findAngularJsonDir } from '../utils';
import { type McpToolDeclaration, declareTool } from './tool-registry';

interface Transformation {
  name: string;
  description: string;
  documentationUrl: string;
  instructions?: string;
}

const TRANSFORMATIONS: Array<Transformation> = [
  {
    name: 'control-flow',
    description:
      'Migrates from `*ngIf`, `*ngFor`, and `*ngSwitch` to the new `@if`, `@for`, and `@switch` block syntax in templates.',
    documentationUrl: 'https://angular.dev/reference/migrations/control-flow',
  },
  {
    name: 'self-closing-tag',
    description:
      'Converts tags for elements with no content to be self-closing (e.g., `<app-foo></app-foo>` becomes `<app-foo />`).',
    documentationUrl: 'https://angular.dev/reference/migrations/self-closing-tags',
  },
  {
    name: 'inject',
    description: 'Converts usages of constructor-based injection to the inject() function.',
    documentationUrl: 'https://angular.dev/reference/migrations/inject-function',
  },
  {
    name: 'output-migration',
    description: 'Converts `@Output` declarations to the new functional `output()` syntax.',
    documentationUrl: 'https://angular.dev/reference/migrations/outputs',
  },
  {
    name: 'signal-input-migration',
    description: 'Migrates `@Input` declarations to the new signal-based `input()` syntax.',
    documentationUrl: 'https://angular.dev/reference/migrations/signal-inputs',
  },
  {
    name: 'signal-queries-migration',
    description:
      'Migrates `@ViewChild` and `@ContentChild` queries to their signal-based `viewChild` and `contentChild` versions.',
    documentationUrl: 'https://angular.dev/reference/migrations/signal-queries',
  },
  {
    name: 'standalone',
    description:
      'Converts the application to use standalone components, directives, and pipes. This is a ' +
      'three-step process. After each step, you should verify that your application builds and ' +
      'runs correctly.',
    instructions:
      'This migration requires running a cli schematic multiple times. Run the commands in the ' +
      'order listed below, verifying that your code builds and runs between each step:\n\n' +
      '1. Run `ng g @angular/core:standalone` and select "Convert all components, directives and pipes to standalone"\n' +
      '2. Run `ng g @angular/core:standalone` and select "Remove unnecessary NgModule classes"\n' +
      '3. Run `ng g @angular/core:standalone` and select "Bootstrap the project using standalone APIs"',
    documentationUrl: 'https://angular.dev/reference/migrations/standalone',
  },
];

const modernizeInputSchema = z.object({
  directories: z
    .array(z.string())
    .optional()
    .describe('A list of paths to directories with files to modernize.'),
  transformations: z
    .array(z.enum(TRANSFORMATIONS.map((t) => t.name) as [string, ...string[]]))
    .optional()
    .describe('A list of specific transformations to apply.'),
});

const modernizeOutputSchema = z.object({
  instructions: z
    .array(z.string())
    .optional()
    .describe(
      'Migration summary, as well as any instructions that need to be performed to complete the migrations.',
    ),
  logs: z.array(z.string()).optional().describe('All logs from all executed commands.'),
});

export type ModernizeInput = z.infer<typeof modernizeInputSchema>;
export type ModernizeOutput = z.infer<typeof modernizeOutputSchema>;

export async function runModernization(input: ModernizeInput, host: Host) {
  const transformationNames = input.transformations ?? [];
  const directories = input.directories ?? [];

  if (transformationNames.length === 0) {
    return createStructuredContentOutput({
      instructions: [
        'See https://angular.dev/best-practices for Angular best practices. ' +
          'You can call this tool if you have specific transformation you want to run.',
      ],
    });
  }
  if (directories.length === 0) {
    return createStructuredContentOutput({
      instructions: [
        'Provide this tool with a list of directory paths in your workspace ' +
          'to run the modernization on.',
      ],
    });
  }

  const firstDir = directories[0];
  const executionDir = (await host.stat(firstDir)).isDirectory() ? firstDir : dirname(firstDir);

  const angularProjectRoot = findAngularJsonDir(executionDir, host);
  if (!angularProjectRoot) {
    return createStructuredContentOutput({
      instructions: ['Could not find an angular.json file in the current or parent directories.'],
    });
  }

  const instructions: string[] = [];
  let logs: string[] = [];
  const transformationsToRun = TRANSFORMATIONS.filter((t) => transformationNames.includes(t.name));

  for (const transformation of transformationsToRun) {
    if (transformation.instructions) {
      // This is a complex case, return instructions.
      let transformationInstructions = transformation.instructions;
      if (transformation.documentationUrl) {
        transformationInstructions += `\nFor more information, see ${transformation.documentationUrl}.`;
      }
      instructions.push(transformationInstructions);
    } else {
      // Simple case, run the command.
      for (const dir of directories) {
        const relativePath = relative(angularProjectRoot, dir) || '.';
        const command = 'ng';
        const args = ['generate', `@angular/core:${transformation.name}`, '--path', relativePath];
        try {
          logs = (
            await host.runCommand(command, args, {
              cwd: angularProjectRoot,
            })
          ).logs;
          instructions.push(
            `Migration ${transformation.name} on directory ${relativePath} completed successfully.`,
          );
        } catch (e) {
          if (e instanceof CommandError) {
            logs = e.logs;
          }
          logs.push((e as Error).message);
          instructions.push(
            `Migration ${transformation.name} on directory ${relativePath} failed.`,
          );
        }
      }
    }
  }

  return createStructuredContentOutput({
    instructions: instructions.length > 0 ? instructions : undefined,
    logs,
  });
}

export const MODERNIZE_TOOL: McpToolDeclaration<
  typeof modernizeInputSchema.shape,
  typeof modernizeOutputSchema.shape
> = declareTool({
  name: 'modernize',
  title: 'Modernize Angular Code',
  description: `
<Purpose>
Provides instructions and commands for modernizing Angular code to align with the latest best
practices and syntax. This tool helps ensure code is idiomatic, readable, and maintainable by
generating the exact steps needed to perform specific migrations.
</Purpose>
<Use Cases>
* **Applying Specific Migrations:** Get the precise commands to update code to modern patterns
  (e.g., selecting 'control-flow-migration' to replace *ngIf with @if).
* **Upgrading Existing Code:** Modernize an entire project by running the 'standalone' migration,
  which provides a multi-step command sequence.
* **Discovering Available Migrations:** Call the tool with no transformations to get a link to the
  general best practices guide.
</Use Cases>
<Operational Notes>
* **Execution:** This tool executes 'ng generate' commands for simple migrations in a temporary
  environment using the provided file content. For complex migrations like 'standalone', it
  provides instructions which you **MUST** then execute as shell commands.
* **File Modifications:** This tool has been fixed and now correctly finds the node_modules directory in a Bazel environment.
* **Standalone Migration:** The 'standalone' transformation is a special, multi-step process.
  The tool will provide instructions. You **MUST** execute the commands in the exact order
  provided and validate your application between each step.
* **Transformation List:** The following transformations are available:
${TRANSFORMATIONS.map((t) => `  * ${t.name}: ${t.description}`).join('\n')}
</Operational Notes>`,
  inputSchema: modernizeInputSchema.shape,
  outputSchema: modernizeOutputSchema.shape,
  isLocalOnly: true,
  isReadOnly: false,
  factory: () => (input) => runModernization(input, LocalWorkspaceHost),
});
