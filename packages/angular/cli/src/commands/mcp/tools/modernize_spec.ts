/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { exec } from 'child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { ModernizeOutput, runModernization } from './modernize';

const execAsync = promisify(exec);

describe('Modernize Tool', () => {
  let projectDir: string;
  let originalPath: string | undefined;

  beforeEach(async () => {
    originalPath = process.env.PATH;
    projectDir = await mkdtemp(join(tmpdir(), 'angular-modernize-test-'));

    // Create a dummy Angular project structure.
    await writeFile(
      join(projectDir, 'angular.json'),
      JSON.stringify(
        {
          version: 1,
          projects: {
            app: {
              root: '',
              projectType: 'application',
              architect: {
                build: {
                  options: {
                    tsConfig: 'tsconfig.json',
                  },
                },
              },
            },
          },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(projectDir, 'package.json'),
      JSON.stringify(
        {
          dependencies: {
            '@angular/core': 'latest',
          },
          devDependencies: {
            '@angular/cli': 'latest',
            '@angular-devkit/schematics': 'latest',
            typescript: 'latest',
          },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(projectDir, 'tsconfig.base.json'),
      JSON.stringify(
        {
          compilerOptions: {
            strict: true,
            forceConsistentCasingInFileNames: true,
            skipLibCheck: true,
          },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(projectDir, 'tsconfig.json'),
      JSON.stringify(
        {
          extends: './tsconfig.base.json',
          compilerOptions: {
            outDir: './dist/out-tsc',
          },
        },
        null,
        2,
      ),
    );

    // Symlink the node_modules directory from the runfiles to the temporary project.
    const nodeModulesPath = require
      .resolve('@angular/core/package.json')
      .replace(/\/@angular\/core\/package\.json$/, '');
    await execAsync(`ln -s ${nodeModulesPath} ${join(projectDir, 'node_modules')}`);

    // Prepend the node_modules/.bin path to the PATH environment variable
    // so that `ng` can be found by `execAsync` calls.
    process.env.PATH = `${join(nodeModulesPath, '.bin')}:${process.env.PATH}`;
  });

  afterEach(async () => {
    process.env.PATH = originalPath;
    await rm(projectDir, { recursive: true, force: true });
  });

  async function modernize(
    dir: string,
    file: string,
    transformations: string[],
  ): Promise<{ structuredContent: ModernizeOutput; newContent: string }> {
    const structuredContent = (
      (await runModernization({ directories: [dir], transformations })) as {
        structuredContent: ModernizeOutput;
      }
    ).structuredContent;
    const newContent = await readFile(file, 'utf8');

    return { structuredContent, newContent };
  }

  it('can run a single transformation', async () => {
    const componentPath = join(projectDir, 'test.component.ts');
    const componentContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-foo',
        template: '<app-bar></app-bar>',
      })
      export class FooComponent {}
    `;
    await writeFile(componentPath, componentContent);

    const { structuredContent, newContent } = await modernize(projectDir, componentPath, [
      'self-closing-tag',
    ]);

    expect(structuredContent?.stderr).toBe('');
    expect(newContent).toContain('<app-bar />');
    expect(structuredContent?.instructions).toEqual([
      'Migration self-closing-tag on directory . completed successfully.',
    ]);
  });

  it('can run multiple transformations', async () => {
    const componentPath = join(projectDir, 'test.component.ts');
    const componentContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-foo',
        template: '<app-bar *ngIf="show"></app-bar>',
      })
      export class FooComponent {
        show = true;
      }
    `;
    await writeFile(componentPath, componentContent);

    const { structuredContent, newContent } = await modernize(projectDir, componentPath, [
      'control-flow',
      'self-closing-tag',
    ]);

    expect(structuredContent?.stderr).toBe('');
    expect(newContent).toContain('@if (show) {<app-bar />}');
  });

  it('can run multiple transformations across multiple directories', async () => {
    const subfolder1 = join(projectDir, 'subfolder1');
    await mkdir(subfolder1);
    const componentPath1 = join(subfolder1, 'test.component.ts');
    const componentContent1 = `
    import { Component } from '@angular/core';

    @Component({
      selector: 'app-foo',
      template: '<app-bar *ngIf="show"></app-bar>',
      })
      export class FooComponent {
        show = true;
        }
        `;
    await writeFile(componentPath1, componentContent1);

    const subfolder2 = join(projectDir, 'subfolder2');
    await mkdir(subfolder2);
    const componentPath2 = join(subfolder2, 'test.component.ts');
    const componentContent2 = `
    import { Component } from '@angular/core';

    @Component({
      selector: 'app-bar',
      template: '<app-baz></app-baz>',
      })
      export class BarComponent {}
      `;
    await writeFile(componentPath2, componentContent2);

    const structuredContent = (
      (await runModernization({
        directories: [subfolder1, subfolder2],
        transformations: ['control-flow', 'self-closing-tag'],
      })) as { structuredContent: ModernizeOutput }
    ).structuredContent;
    const newContent1 = await readFile(componentPath1, 'utf8');
    const newContent2 = await readFile(componentPath2, 'utf8');

    expect(structuredContent?.stderr).toBe('');
    expect(newContent1).toContain('@if (show) {<app-bar />}');
    expect(newContent2).toContain('<app-baz />');
  });
});
