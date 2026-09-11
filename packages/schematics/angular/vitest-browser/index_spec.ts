/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';

describe('Vitest Browser Provider Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = await schematicRunner.runSchematic('workspace', {
      name: 'workspace',
      newProjectRoot: 'projects',
      version: '6.0.0',
    });

    tree = await schematicRunner.runSchematic(
      'application',
      {
        name: 'app',
        skipInstall: true,
        testRunner: 'vitest',
      },
      tree,
    );
  });

  [
    { pkg: '@vitest/browser-playwright', browser: 'chromium', extraDeps: ['playwright'] },
    { pkg: '@vitest/browser-webdriverio', browser: 'chrome', extraDeps: ['webdriverio'] },
    { pkg: '@vitest/browser-preview', browser: 'chromium', extraDeps: [] as string[] },
  ].forEach(({ pkg, browser, extraDeps }) => {
    it(`should add ${browser} to browsers option in angular.json for ${pkg}`, async () => {
      const options = {
        project: 'app',
        package: pkg,
        skipInstall: true,
      };

      const resultTree = await schematicRunner.runSchematic('vitest-browser', options, tree);

      const angularJson = parse(resultTree.readContent('/angular.json'));
      const project = angularJson.projects.app;
      const targets = project.architect || project.targets;
      expect(targets.test.options.browsers).toEqual([browser]);
    });

    it(`should add dependencies and update tsconfig.spec.json for ${pkg}`, async () => {
      const options = {
        project: 'app',
        package: pkg,
        skipInstall: true,
      };

      const resultTree = await schematicRunner.runSchematic('vitest-browser', options, tree);

      const packageJson = parse(resultTree.readContent('/package.json'));
      expect(packageJson.devDependencies[pkg]).toBeDefined();
      for (const dep of extraDeps) {
        expect(packageJson.devDependencies[dep]).toBeDefined();
      }

      const tsConfig = parse(resultTree.readContent('/projects/app/tsconfig.spec.json'));
      expect(tsConfig.compilerOptions.types).toContain('vitest/globals');
      expect(tsConfig.compilerOptions.types).toContain(pkg);
      expect(tsConfig.compilerOptions.types).not.toContain('jasmine');
    });
  });

  it('should not overwrite existing browsers option in angular.json', async () => {
    // Set up existing browsers option
    const angularJson = parse(tree.readContent('/angular.json'));
    const project = angularJson.projects.app;
    const targets = project.architect || project.targets;
    targets.test.options ??= {};
    targets.test.options.browsers = ['firefox'];
    tree.overwrite('/angular.json', JSON.stringify(angularJson));

    const options = {
      project: 'app',
      package: '@vitest/browser-playwright',
      skipInstall: true,
    };

    const resultTree = await schematicRunner.runSchematic('vitest-browser', options, tree);

    const updatedAngularJson = parse(resultTree.readContent('/angular.json'));
    const updatedProject = updatedAngularJson.projects.app;
    const updatedTargets = updatedProject.architect || updatedProject.targets;
    expect(updatedTargets.test.options.browsers).toEqual(['firefox']);
  });

  it('should update tsconfig.spec.json for a library project', async () => {
    tree = await schematicRunner.runSchematic(
      'library',
      {
        name: 'lib',
        skipInstall: true,
      },
      tree,
    );

    const options = {
      project: 'lib',
      package: '@vitest/browser-playwright',
      skipInstall: true,
    };

    const resultTree = await schematicRunner.runSchematic('vitest-browser', options, tree);

    const tsConfig = parse(resultTree.readContent('/projects/lib/tsconfig.spec.json'));
    expect(tsConfig.compilerOptions.types).toContain('vitest/globals');
    expect(tsConfig.compilerOptions.types).toContain('@vitest/browser-playwright');
    // Library schematic might put jasmine types by default.
    expect(tsConfig.compilerOptions.types).not.toContain('jasmine');
  });

  it('should throw if project does not exist', async () => {
    const options = {
      project: 'invalid',
      package: '@vitest/browser-playwright',
    };

    await expectAsync(
      schematicRunner.runSchematic('vitest-browser', options, tree),
    ).toBeRejectedWithError('Project "invalid" does not exist.');
  });

  it('should throw if project uses Karma', async () => {
    const angularJson = parse(tree.readContent('/angular.json'));
    const project = angularJson.projects.app;
    const targets = project.architect || project.targets;

    targets.test.options ??= {};
    targets.test.options.runner = 'karma';
    tree.overwrite('/angular.json', JSON.stringify(angularJson));

    const options = {
      project: 'app',
      package: '@vitest/browser-playwright',
    };

    await expectAsync(
      schematicRunner.runSchematic('vitest-browser', options, tree),
    ).toBeRejectedWithError(
      'Project "app" is configured to use Karma. Please migrate to Vitest before adding browser testing support.',
    );
  });
});
