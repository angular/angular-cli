/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../../application/schema';
import { Schema as WorkspaceOptions } from '../../workspace/schema';

describe('Jasmine to Vitest Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../../collection.json'),
  );

  let appTree: UnitTestTree;

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '20.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipTests: false,
    skipPackageJson: false,
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should transform a basic Jasmine test file', async () => {
    const specFilePath = 'projects/bar/src/app/app.spec.ts';
    const content = `
      describe('AppComponent', () => {
        it('should create the app', () => {
          const service = { myMethod: () => {} };
          spyOn(service, 'myMethod');
          service.myMethod();
          expect(service.myMethod).toHaveBeenCalled();
        });
      });
    `;
    appTree.overwrite(specFilePath, content);

    const tree = await schematicRunner.runSchematic(
      'jasmine-to-vitest',
      { project: 'bar' },
      appTree,
    );

    const newContent = tree.readContent(specFilePath);
    expect(newContent).toContain(`vi.spyOn(service, 'myMethod');`);
  });

  it('should only transform files matching the fileSuffix option', async () => {
    const specFilePath = 'projects/bar/src/app/app.spec.ts';
    const specFileContent = `
      describe('AppComponent', () => {
        it('should test something', () => {
          spyOn(window, 'alert');
        });
      });
    `;
    appTree.overwrite(specFilePath, specFileContent);

    const testFilePath = 'projects/bar/src/app/app.test.ts';
    const testFileContent = `
      describe('AppComponent Test', () => {
        it('should test another thing', () => {
          spyOn(window, 'confirm');
        });
      });
    `;
    appTree.create(testFilePath, testFileContent);

    const tree = await schematicRunner.runSchematic(
      'jasmine-to-vitest',
      { project: 'bar', fileSuffix: '.test.ts' },
      appTree,
    );

    const unchangedContent = tree.readContent(specFilePath);
    expect(unchangedContent).toContain(`spyOn(window, 'alert');`);
    expect(unchangedContent).not.toContain(`vi.spyOn(window, 'alert');`);

    const changedContent = tree.readContent(testFilePath);
    expect(changedContent).toContain(`vi.spyOn(window, 'confirm');`);
  });

  it('should print verbose logs when the verbose option is true', async () => {
    const specFilePath = 'projects/bar/src/app/app.spec.ts';
    const content = `
      describe('AppComponent', () => {
        it('should create the app', () => {
          const service = { myMethod: () => {} };
          spyOn(service, 'myMethod');
        });
      });
    `;
    appTree.overwrite(specFilePath, content);

    const logs: string[] = [];
    schematicRunner.logger.subscribe((entry) => logs.push(entry.message));

    await schematicRunner.runSchematic(
      'jasmine-to-vitest',
      { project: 'bar', verbose: true },
      appTree,
    );

    expect(logs).toContain('Detailed Transformation Log:');
    expect(logs).toContain(`Processing: /${specFilePath}`);
    expect(logs.some((log) => log.includes('Transformed `spyOn` to `vi.spyOn`'))).toBe(true);
  });

  it('should print a summary report after running', async () => {
    const specFilePath = 'projects/bar/src/app/app.spec.ts';
    const content = `
      describe('AppComponent', () => {
        it('should create the app', () => {
          const service = { myMethod: () => {} };
          jasmine.spyOnAllFunctions(service);
        });
      });
    `;
    appTree.overwrite(specFilePath, content);

    const logs: string[] = [];
    schematicRunner.logger.subscribe((entry) => logs.push(entry.message));

    await schematicRunner.runSchematic('jasmine-to-vitest', { include: specFilePath }, appTree);

    expect(logs).toContain('Jasmine to Vitest Refactoring Summary:');
    expect(logs).toContain('- 1 test file(s) scanned.');
    expect(logs).toContain('- 1 file(s) transformed.');
    expect(logs).toContain('- 1 TODO(s) added for manual review:');
    expect(logs).toContain('  - 1x spyOnAllFunctions');
  });
});
