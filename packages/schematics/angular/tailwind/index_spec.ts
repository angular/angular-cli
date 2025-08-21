/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions, Style } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';

describe('Tailwind Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: Style.Css,
    skipTests: false,
    skipPackageJson: false,
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should add tailwind dependencies', async () => {
    const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    const packageJson = JSON.parse(tree.readContent('/package.json'));
    expect(packageJson.devDependencies['tailwindcss']).toBeDefined();
    expect(packageJson.devDependencies['postcss']).toBeDefined();
    expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();
  });

  it('should create a .postcssrc.json file in the project root', async () => {
    const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    expect(tree.exists('/projects/bar/.postcssrc.json')).toBe(true);
  });

  it('should configure tailwindcss plugin in .postcssrc.json', async () => {
    const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    const postCssConfig = JSON.parse(tree.readContent('/projects/bar/.postcssrc.json'));
    expect(postCssConfig.plugins['@tailwindcss/postcss']).toBeDefined();
  });

  it('should add tailwind imports to styles.css', async () => {
    const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    const stylesContent = tree.readContent('/projects/bar/src/styles.css');
    expect(stylesContent).toContain('@import "tailwindcss";');
  });
});
