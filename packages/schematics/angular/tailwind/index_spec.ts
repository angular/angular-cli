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

async function createTestApp(
  runner: SchematicTestRunner,
  appOptions: ApplicationOptions,
  style = Style.Css,
): Promise<UnitTestTree> {
  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appTree = await runner.runSchematic('workspace', workspaceOptions);

  return runner.runSchematic('application', { ...appOptions, style }, appTree);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWorkspace(tree: UnitTestTree): any {
  return JSON.parse(tree.readContent('/angular.json'));
}

describe('Tailwind Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

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
    appTree = await createTestApp(schematicRunner, appOptions);
  });

  it('should add tailwind dependencies', async () => {
    const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    const packageJson = JSON.parse(tree.readContent('/package.json'));
    expect(packageJson.devDependencies['tailwindcss']).toBeDefined();
    expect(packageJson.devDependencies['postcss']).toBeDefined();
    expect(packageJson.devDependencies['@tailwindcss/postcss']).toBeDefined();
  });

  it('should add tailwind imports to styles.css', async () => {
    const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    const stylesContent = tree.readContent('/projects/bar/src/styles.css');
    expect(stylesContent).toContain('@import "tailwindcss";');
  });

  it('should not add duplicate tailwind imports to styles.css', async () => {
    let tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
    const stylesContent = tree.readContent('/projects/bar/src/styles.css');
    expect(stylesContent.match(/@import "tailwindcss";/g)?.length).toBe(1);

    tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, tree);
    const stylesContentAfter = tree.readContent('/projects/bar/src/styles.css');
    expect(stylesContentAfter.match(/@import "tailwindcss";/g)?.length).toBe(1);
  });

  describe('with scss styles', () => {
    beforeEach(async () => {
      appTree = await createTestApp(schematicRunner, appOptions, Style.Scss);
    });

    it('should create a tailwind.css file', async () => {
      const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
      expect(tree.exists('/projects/bar/src/tailwind.css')).toBe(true);
      const stylesContent = tree.readContent('/projects/bar/src/tailwind.css');
      expect(stylesContent).toContain('@import "tailwindcss";');
    });

    it('should add tailwind.css to angular.json', async () => {
      const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
      const workspace = getWorkspace(tree);
      const styles = workspace.projects.bar.architect.build.options.styles;
      expect(styles).toEqual(['projects/bar/src/tailwind.css', 'projects/bar/src/styles.scss']);
    });

    it('should not add tailwind imports to styles.scss', async () => {
      const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
      const stylesContent = tree.readContent('/projects/bar/src/styles.scss');
      expect(stylesContent).not.toContain('@import "tailwindcss";');
    });
  });

  describe('with postcss configuration', () => {
    it('should create a .postcssrc.json if one does not exist', async () => {
      const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
      expect(tree.exists('/projects/bar/.postcssrc.json')).toBe(true);
    });

    it('should update an existing .postcssrc.json in the project root', async () => {
      appTree.create(
        '/projects/bar/.postcssrc.json',
        JSON.stringify({ plugins: { autoprefixer: {} } }),
      );
      const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
      const postCssConfig = JSON.parse(tree.readContent('/projects/bar/.postcssrc.json'));
      expect(postCssConfig.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(postCssConfig.plugins['autoprefixer']).toBeDefined();
    });

    it('should update an existing postcss.config.json in the workspace root', async () => {
      appTree.create('/postcss.config.json', JSON.stringify({ plugins: { autoprefixer: {} } }));
      const tree = await schematicRunner.runSchematic('tailwind', { project: 'bar' }, appTree);
      const postCssConfig = JSON.parse(tree.readContent('/postcss.config.json'));
      expect(postCssConfig.plugins['@tailwindcss/postcss']).toBeDefined();
      expect(postCssConfig.plugins['autoprefixer']).toBeDefined();
      expect(tree.exists('/projects/bar/.postcssrc.json')).toBe(false);
    });
  });
});
