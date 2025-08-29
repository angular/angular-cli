/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { z } from 'zod';
import { declareTool } from './tool-registry';

interface Transformation {
  name: string;
  description: string;
  documentationUrl: string;
  instructions?: string;
}

const TRANSFORMATIONS: Array<Transformation> = [
  {
    name: 'control-flow-migration',
    description:
      'Migrates from `*ngIf`, `*ngFor`, and `*ngSwitch` to the new `@if`, `@for`, and `@switch` block syntax in templates.',
    documentationUrl: 'https://angular.dev/reference/migrations/control-flow',
  },
  {
    name: 'self-closing-tags-migration',
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
  // Casting to [string, ...string[]] since the enum definition requires a nonempty array.
  transformations: z
    .array(z.enum(TRANSFORMATIONS.map((t) => t.name) as [string, ...string[]]))
    .optional()
    .describe(
      'A list of specific transformations to get instructions for. ' +
        'If omitted, general guidance is provided.',
    ),
});

export type ModernizeInput = z.infer<typeof modernizeInputSchema>;

function generateInstructions(transformationNames: string[]): string[] {
  if (transformationNames.length === 0) {
    return [
      'See https://angular.dev/best-practices for Angular best practices. ' +
        'You can call this tool if you have specific transformation you want to run.',
    ];
  }

  const instructions: string[] = [];
  const transformationsToRun = TRANSFORMATIONS.filter((t) => transformationNames?.includes(t.name));

  for (const transformation of transformationsToRun) {
    let transformationInstructions = '';
    if (transformation.instructions) {
      transformationInstructions = transformation.instructions;
    } else {
      // If no instructions are included, default to running a cli schematic with the transformation name.
      const command = `ng generate @angular/core:${transformation.name}`;
      transformationInstructions = `To run the ${transformation.name} migration, execute the following command: \`${command}\`.`;
    }
    if (transformation.documentationUrl) {
      transformationInstructions += `\nFor more information, see ${transformation.documentationUrl}.`;
    }
    instructions.push(transformationInstructions);
  }

  return instructions;
}

export async function runModernization(input: ModernizeInput) {
  const structuredContent = { instructions: generateInstructions(input.transformations ?? []) };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

export const MODERNIZE_TOOL = declareTool({
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
* **Execution:** This tool **provides instructions**, which you **MUST** then execute as shell commands.
  It does not modify code directly.
* **Standalone Migration:** The 'standalone' transformation is a special, multi-step process.
  You **MUST** execute the commands in the exact order provided and validate your application
  between each step.
* **Transformation List:** The following transformations are available:
${TRANSFORMATIONS.map((t) => `  * ${t.name}: ${t.description}`).join('\n')}
</Operational Notes>`,
  inputSchema: modernizeInputSchema.shape,
  outputSchema: {
    instructions: z
      .array(z.string())
      .optional()
      .describe(
        'A list of instructions and shell commands to run the requested modernizations. ' +
          'Each string in the array is a separate step or command.',
      ),
  },
  isLocalOnly: true,
  isReadOnly: true,
  factory: () => (input) => runModernization(input),
});
