import { deleteFile, writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';
import { applyJestBuilder } from '../../utils/jest';
import { ng } from '../../utils/process';

export default async function (): Promise<void> {
  await applyJestBuilder();

  {
    await updateJsonFile('tsconfig.spec.json', (json) => {
      return {
        ...json,
        include: ['src/**/*.spec.ts'],
      };
    });

    await writeFile(
      'src/aot.spec.ts',
      `
  import { Component } from '@angular/core';
  
  describe('Hello', () => {
    it('should *not* contain jit instructions', () => {
      @Component({
        template: 'Hello',
      })
      class Hello {}

      expect((Hello as any).ɵcmp.template.toString()).not.toContain('jit');
    });
  });
    `.trim(),
    );

    const { stderr } = await ng('test', '--aot');

    if (!stderr.includes('Ran all test suites.') || stderr.includes('failed')) {
      throw new Error(`Components were not transformed using AOT.\STDERR:\n\n${stderr}`);
    }
  }
}
