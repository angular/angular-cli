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

  it('should set the prefix in angular.json and in app.ts', async () => {
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

  it('should add ai config file when aiConfig is set', async () => {
    const options = { ...defaultOptions, aiConfig: ['gemini', 'claude'] };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toContain('/bar/.gemini/GEMINI.md');
    expect(files).toContain('/bar/.claude/CLAUDE.md');
  });

  it('should create a tailwind project when style is tailwind', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { ...defaultOptions, style: 'tailwind' as any };
    const tree = await schematicRunner.runSchematic('ng-new', options);

    expect(tree.exists('/bar/.postcssrc.json')).toBe(true);

    const packageJson = JSON.parse(tree.readContent('/bar/package.json'));
    expect(packageJson.devDependencies['tailwindcss']).toBeDefined();
    expect(packageJson.devDependencies['postcss']).toBeDefined();
    expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();

    const stylesContent = tree.readContent('/bar/src/styles.css');
    expect(stylesContent).toContain('@import "tailwindcss";');
  });

  it(`should create files with file name style guide '2016'`, async () => {
    const options = { ...defaultOptions, fileNameStyleGuide: '2016' };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files).toEqual(
      jasmine.arrayContaining([
        '/bar/src/app/app.component.css',
        '/bar/src/app/app.component.html',
        '/bar/src/app/app.component.spec.ts',
        '/bar/src/app/app.component.ts',
      ]),
    );

    const {
      projects: {
        'foo': { schematics },
      },
    } = JSON.parse(tree.readContent('/bar/angular.json'));
    expect(schematics['@schematics/angular:component'].type).toBe('component');
    expect(schematics['@schematics/angular:directive'].type).toBe('directive');
    expect(schematics['@schematics/angular:service'].type).toBe('service');
    expect(schematics['@schematics/angular:guard'].typeSeparator).toBe('.');
    expect(schematics['@schematics/angular:interceptor'].typeSeparator).toBe('.');
    expect(schematics['@schematics/angular:module'].typeSeparator).toBe('.');
    expect(schematics['@schematics/angular:pipe'].typeSeparator).toBe('.');
    expect(schematics['@schematics/angular:resolver'].typeSeparator).toBe('.');
  });

  it(`should not add type to class name when file name style guide is '2016'`, async () => {
    const options = { ...defaultOptions, fileNameStyleGuide: '2016' };

    const tree = await schematicRunner.runSchematic('ng-new', options);
    const appComponentContent = tree.readContent('/bar/src/app/app.component.ts');
    expect(appComponentContent).toContain('export class App {');
    expect(appComponentContent).not.toContain('export class AppComponent {');
  });
});
