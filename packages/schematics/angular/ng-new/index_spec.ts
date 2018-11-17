/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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

  it('should create files of a workspace', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toContain('/bar/angular.json');
  });

  it('should create files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toEqual(jasmine.arrayContaining([
      '/bar/src/tsconfig.app.json',
      '/bar/src/main.ts',
      '/bar/src/app/app.module.ts',
    ]));
  });

  it('should should set the prefix in angular.json and in app.component.ts', () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const content = tree.readContent('/bar/angular.json');
    expect(content).toMatch(/"prefix": "pre"/);
  });

  it('should set up the app module', () => {
    const options: NgNewOptions = {
      name: 'foo',
      version: '6.0.0',
    };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const moduleContent = tree.readContent('/foo/src/app/app.module.ts');
    expect(moduleContent).toMatch(/declarations:\s*\[\s*AppComponent\s*\]/m);
  });

  it('createApplication=false should create an empty workspace', () => {
    const options = { ...defaultOptions, createApplication: false };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toContain('/bar/angular.json');
    expect(files).not.toContain('/bar/src');
  });

  it('minimal=true should not create e2e project', () => {
    const options = { ...defaultOptions, minimal: true };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).not.toContain('/bar/e2e');
    const confContent = JSON.parse(tree.readContent('/bar/angular.json'));
    expect(confContent.projects['foo-e2e']).toBeUndefined();
  });
});
