/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { Schema as NgNewOptions } from './schema';

describe('Ng New Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: NgNewOptions = {
    name: 'foo',
    directory: 'bar',
    version: '6.0.0',
  };

  it('should create files of a workspace', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toContain('/bar/angular.json');
  });

  it('should create files of an application', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/bar/tsconfig.app.json',
        '/bar/src/main.ts',
        '/bar/src/app/app.config.ts',
      ]),
    );

    expect(files).not.toEqual(jasmine.arrayContaining(['/bar/src/app/app-module.ts']));
  });

  it('should create module files of a standalone=false application', async () => {
    const options = { ...defaultOptions, standalone: false };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/bar/tsconfig.app.json',
        '/bar/src/main.ts',
        '/bar/src/app/app-module.ts',
      ]),
    );
  });

  it('should should set the prefix in angular.json and in app.ts', async () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const content = tree.readContent('/bar/angular.json');
    expect(content).toMatch(/"prefix": "pre"/);
  });

  it('should set up the app module when standalone=false', async () => {
    const options: NgNewOptions = {
      name: 'foo',
      version: '6.0.0',
      standalone: false,
    };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const moduleContent = tree.readContent('/foo/src/app/app-module.ts');
    expect(moduleContent).toMatch(/declarations:\s*\[\s*App\s*\]/m);
  });

  it('createApplication=false should create an empty workspace', async () => {
    const options = { ...defaultOptions, createApplication: false };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toContain('/bar/angular.json');
    expect(files).not.toContain('/bar/src');
  });

  it('minimal=true should not create an e2e target', async () => {
    const options = { ...defaultOptions, minimal: true };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const confContent = JSON.parse(tree.readContent('/bar/angular.json'));
    expect(confContent.projects.foo.e2e).toBeUndefined();
  });

  it('should add packageManager option in angular.json', async () => {
    const tree = await schematicRunner.runSchematic('ng-new', {
      ...defaultOptions,
      packageManager: 'npm',
    });
    const { cli } = JSON.parse(tree.readContent('/bar/angular.json'));
    expect(cli.packageManager).toBe('npm');
  });
});
