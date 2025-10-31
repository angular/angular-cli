/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ConfigOptions, Type as ConfigType } from './schema';

describe('Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '15.0.0',
  };

  const defaultAppOptions: ApplicationOptions = {
    name: 'foo',
    inlineStyle: true,
    inlineTemplate: true,
    routing: false,
    skipPackageJson: false,
  };

  let applicationTree: UnitTestTree;
  function runConfigSchematic(type: ConfigType): Promise<UnitTestTree> {
    return schematicRunner.runSchematic<ConfigOptions>(
      'config',
      {
        project: 'foo',
        type,
      },
      applicationTree,
    );
  }

  beforeEach(async () => {
    const workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    applicationTree = await schematicRunner.runSchematic(
      'application',
      defaultAppOptions,
      workspaceTree,
    );

    // Set builder to a karma builder for testing purposes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const angularJson = applicationTree.readJson('angular.json') as any;
    angularJson['projects']['foo']['architect']['test']['builder'] = '@angular/build:karma';
    applicationTree.overwrite('angular.json', JSON.stringify(angularJson));
  });

  describe(`when 'type' is 'karma'`, () => {
    it('should create a karma.conf.js file', async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      expect(tree.exists('projects/foo/karma.conf.js')).toBeTrue();
    });

    it('should not include devkit karma plugin by default', async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      const karmaConf = tree.readText('projects/foo/karma.conf.js');
      expect(karmaConf).not.toContain(`'@angular-devkit/build-angular'`);
    });

    it('should include devkit karma plugin when angular-devkit/build-angular:karma is used', async () => {
      applicationTree.overwrite(
        'angular.json',
        applicationTree
          .readText('angular.json')
          .replace('@angular/build:karma', '@angular-devkit/build-angular:karma'),
      );
      const tree = await runConfigSchematic(ConfigType.Karma);
      const karmaConf = tree.readText('projects/foo/karma.conf.js');
      expect(karmaConf).toContain(`'@angular-devkit/build-angular'`);
    });

    it('should set the right coverage folder', async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      const karmaConf = tree.readText('projects/foo/karma.conf.js');
      expect(karmaConf).toContain(`dir: require('path').join(__dirname, '../../coverage/foo')`);
    });

    it(`should set 'karmaConfig' in test builder`, async () => {
      const tree = await runConfigSchematic(ConfigType.Karma);
      const config = JSON.parse(tree.readContent('/angular.json'));
      const prj = config.projects.foo;
      const { karmaConfig } = prj.architect.test.options;
      expect(karmaConfig).toBe('projects/foo/karma.conf.js');
    });

    describe('with "unit-test" builder', () => {
      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const angularJson = applicationTree.readJson('angular.json') as any;
        angularJson.projects.foo.architect.test.builder = '@angular/build:unit-test';
        applicationTree.overwrite('angular.json', JSON.stringify(angularJson));
      });

      it(`should not set 'karmaConfig' in test builder`, async () => {
        const tree = await runConfigSchematic(ConfigType.Karma);
        const config = JSON.parse(tree.readContent('/angular.json'));
        const prj = config.projects.foo;
        const { karmaConfig } = prj.architect.test.options;
        expect(karmaConfig).toBeUndefined();
      });

      it(`should warn when 'runner' is not specified`, async () => {
        const logs: string[] = [];
        schematicRunner.logger.subscribe(({ message }) => logs.push(message));
        await runConfigSchematic(ConfigType.Karma);
        expect(
          logs.some((v) => v.includes('may not be used as the default runner is "vitest"')),
        ).toBeTrue();
      });

      it(`should warn when 'runner' is 'vitest' in options`, async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const angularJson = applicationTree.readJson('angular.json') as any;
        angularJson.projects.foo.architect.test.options ??= {};
        angularJson.projects.foo.architect.test.options.runner = 'vitest';
        applicationTree.overwrite('angular.json', JSON.stringify(angularJson));

        const logs: string[] = [];
        schematicRunner.logger.subscribe(({ message }) => logs.push(message));
        await runConfigSchematic(ConfigType.Karma);
        expect(
          logs.some((v) => v.includes('runner other than "karma" in the main options')),
        ).toBeTrue();
      });

      it(`should warn when 'runner' is 'vitest' in a configuration`, async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const angularJson = applicationTree.readJson('angular.json') as any;
        angularJson.projects.foo.architect.test.configurations ??= {};
        angularJson.projects.foo.architect.test.configurations.ci = { runner: 'vitest' };
        applicationTree.overwrite('angular.json', JSON.stringify(angularJson));

        const logs: string[] = [];
        schematicRunner.logger.subscribe(({ message }) => logs.push(message));
        await runConfigSchematic(ConfigType.Karma);
        expect(
          logs.some((v) => v.includes(`"ci" configuration is configured to use a runner`)),
        ).toBeTrue();
      });

      it(`should not warn when 'runner' is 'karma' in options`, async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const angularJson = applicationTree.readJson('angular.json') as any;
        angularJson.projects.foo.architect.test.options ??= {};
        angularJson.projects.foo.architect.test.options.runner = 'karma';
        applicationTree.overwrite('angular.json', JSON.stringify(angularJson));

        const logs: string[] = [];
        schematicRunner.logger.subscribe(({ message }) => logs.push(message));
        await runConfigSchematic(ConfigType.Karma);
        expect(logs.length).toBe(0);
      });

      it(`should not warn when 'runner' is 'karma' in a configuration`, async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const angularJson = applicationTree.readJson('angular.json') as any;
        angularJson.projects.foo.architect.test.configurations ??= {};
        angularJson.projects.foo.architect.test.configurations.ci = { runner: 'karma' };
        applicationTree.overwrite('angular.json', JSON.stringify(angularJson));

        const logs: string[] = [];
        schematicRunner.logger.subscribe(({ message }) => logs.push(message));
        await runConfigSchematic(ConfigType.Karma);
        expect(logs.length).toBe(0);
      });
    });
  });

  describe(`when 'type' is 'browserslist'`, () => {
    it('should create a .browserslistrc file', async () => {
      const tree = await runConfigSchematic(ConfigType.Browserslist);
      expect(tree.exists('projects/foo/.browserslistrc')).toBeTrue();
    });
  });
});
