/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ModernizeInput, runModernization } from './modernize';

describe('Modernize Tool', () => {
  async function getInstructions(input: ModernizeInput): Promise<string[] | undefined> {
    const { structuredContent } = await runModernization(input);

    if (!structuredContent || !('instructions' in structuredContent)) {
      fail('Expected instructions to be present in the result');

      return;
    }

    return structuredContent.instructions;
  }

  it('should return an instruction for a single transformation', async () => {
    const instructions = await getInstructions({
      transformations: ['self-closing-tags-migration'],
    });

    expect(instructions).toEqual([
      'To run the self-closing-tags-migration migration, execute the following command: ' +
        '`ng generate @angular/core:self-closing-tags-migration`.\nFor more information, ' +
        'see https://angular.dev/reference/migrations/self-closing-tags.',
    ]);
  });

  it('should return instructions for multiple transformations', async () => {
    const instructions = await getInstructions({
      transformations: ['self-closing-tags-migration', 'test-bed-get'],
    });

    const expectedInstructions = [
      'To run the self-closing-tags-migration migration, execute the following command: ' +
        '`ng generate @angular/core:self-closing-tags-migration`.\nFor more information, ' +
        'see https://angular.dev/reference/migrations/self-closing-tags.',
      'To run the test-bed-get migration, execute the following command: ' +
        '`ng generate @angular/core:test-bed-get`.\nFor more information, ' +
        'see https://angular.dev/guide/testing/dependency-injection.',
    ];

    expect(instructions?.sort()).toEqual(expectedInstructions.sort());
  });

  it('should return a link to the best practices page when no transformations are requested', async () => {
    const instructions = await getInstructions({
      transformations: [],
    });

    expect(instructions).toEqual([
      'See https://angular.dev/best-practices for Angular best practices. You can call this ' +
        'tool if you have specific transformation you want to run.',
    ]);
  });

  it('should return special instructions for standalone migration', async () => {
    const instructions = await getInstructions({
      transformations: ['standalone'],
    });

    expect(instructions?.[0]).toContain(
      'Run the commands in the order listed below, verifying that your code builds and runs between each step:',
    );
  });
});
