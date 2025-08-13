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
    name: 'test-bed-get',
    description:
      'Updates `TestBed.get` to the preferred and type-safe `TestBed.inject` in TypeScript test files.',
    documentationUrl: 'https://angular.dev/guide/testing/dependency-injection',
  },
  {
    name: 'inject-flags',
    description:
      'Updates `inject` calls from using the InjectFlags enum to a more modern and readable options object.',
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
  {
    name: 'zoneless',
    description: 'Migrates the application to be zoneless.',
    documentationUrl: 'https://angular.dev/guide/zoneless',
  },
];

const modernizeInputSchema = z.object({
  // Casting to [string, ...string[]] since the enum definition requires a nonempty array.
  transformations: z
    .array(z.enum(TRANSFORMATIONS.map((t) => t.name) as [string, ...string[]]))
    .optional(),
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
  description:
    '<Purpose>\n' +
    'This tool modernizes Angular code by applying the latest best practices and syntax improvements, ' +
    'ensuring it is idiomatic, readable, and maintainable.\n\n' +
    '</Purpose>\n' +
    '<Use Cases>\n' +
    '* After generating new code: Run this tool immediately after creating new Angular components, directives, ' +
    'or services to ensure they adhere to modern standards.\n' +
    '* On existing code: Apply to existing TypeScript files (.ts) and Angular templates (.html) to update ' +
    'them with the latest features, such as the new built-in control flow syntax.\n\n' +
    '* When the user asks for a specific transformation: When the transformation list is populated, ' +
    'these specific ones will be ran on the inputs.\n' +
    '</Use Cases>\n' +
    '<Transformations>\n' +
    TRANSFORMATIONS.map((t) => `* ${t.name}: ${t.description}`).join('\n') +
    '\n</Transformations>\n',
  inputSchema: modernizeInputSchema.shape,
  outputSchema: {
    instructions: z
      .array(z.string())
      .optional()
      .describe('A list of instructions on how to run the migrations.'),
  },
  isLocalOnly: true,
  isReadOnly: true,
  factory: () => (input) => runModernization(input),
});
