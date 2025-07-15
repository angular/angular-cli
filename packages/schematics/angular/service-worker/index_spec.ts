/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Builders } from '../utility/workspace-models';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ServiceWorkerOptions } from './schema';

describe('Service Worker Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );
  const defaultOptions: ServiceWorkerOptions = {
    project: 'bar',
    target: 'build',
  };

  let appTree: UnitTestTree;

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
    skipTests: false,
    skipPackageJson: false,
  };

  beforeEach(async () => {
    appTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = await schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should add `serviceWorker` option to build target', async () => {
    const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const configText = tree.readContent('/angular.json');
    const buildConfig = JSON.parse(configText).projects.bar.architect.build;

    expect(buildConfig.configurations.production.serviceWorker).toBe(
      'projects/bar/ngsw-config.json',
    );
  });

  it('should add the necessary dependency', async () => {
    const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/package.json');
    const pkg = JSON.parse(pkgText);
    const version = pkg.dependencies['@angular/core'];
    expect(pkg.dependencies['@angular/service-worker']).toEqual(version);
  });

  it('should put the ngsw-config.json file in the project root', async () => {
    const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const path = '/projects/bar/ngsw-config.json';
    expect(tree.exists(path)).toEqual(true);

    const { projects } = JSON.parse(tree.readContent('/angular.json'));
    expect(projects.bar.architect.build.configurations.production.serviceWorker).toBe(
      'projects/bar/ngsw-config.json',
    );
  });

  it('should add $schema in ngsw-config.json with correct relative path', async () => {
    const pathToNgswConfigSchema = 'node_modules/@angular/service-worker/config/schema.json';

    const name = 'foo';
    const rootAppOptions: ApplicationOptions = {
      ...appOptions,
      name,
      projectRoot: '',
    };
    const rootSWOptions: ServiceWorkerOptions = {
      ...defaultOptions,
      project: name,
    };
    const rootAppTree = await schematicRunner.runSchematic('application', rootAppOptions, appTree);
    const treeInRoot = await schematicRunner.runSchematic(
      'service-worker',
      rootSWOptions,
      rootAppTree,
    );
    const pkgTextInRoot = treeInRoot.readContent('/ngsw-config.json');
    const configInRoot = JSON.parse(pkgTextInRoot);
    expect(configInRoot.$schema).toBe(`./${pathToNgswConfigSchema}`);

    const treeNotInRoot = await schematicRunner.runSchematic(
      'service-worker',
      defaultOptions,
      appTree,
    );
    const pkgTextNotInRoot = treeNotInRoot.readContent('/projects/bar/ngsw-config.json');
    const configNotInRoot = JSON.parse(pkgTextNotInRoot);
    expect(configNotInRoot.$schema).toBe(`../../${pathToNgswConfigSchema}`);
  });

  it('should generate ngsw-config.json in root when the application is at root level', async () => {
    const name = 'foo';
    const rootAppOptions: ApplicationOptions = {
      ...appOptions,
      name,
      projectRoot: '',
    };
    const rootSWOptions: ServiceWorkerOptions = {
      ...defaultOptions,
      project: name,
    };

    let tree = await schematicRunner.runSchematic('application', rootAppOptions, appTree);
    tree = await schematicRunner.runSchematic('service-worker', rootSWOptions, tree);
    expect(tree.exists('/ngsw-config.json')).toBe(true);
  });

  it(`should add the 'provideServiceWorker' to providers`, async () => {
    const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const content = tree.readContent('/projects/bar/src/app/app.config.ts');
    expect(content.replace(/\s/g, '')).toContain(
      `provideServiceWorker('ngsw-worker.js',{enabled:!isDevMode(),registrationStrategy:'registerWhenStable:30000'})`,
    );
  });

  it(`should import 'isDevMode' from '@angular/core'`, async () => {
    const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const content = tree.readContent('/projects/bar/src/app/app.config.ts');
    expect(content).toContain(
      `import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';`,
    );
  });

  it(`should import 'provideServiceWorker' from '@angular/service-worker'`, async () => {
    const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const content = tree.readContent('/projects/bar/src/app/app.config.ts');
    expect(content).toContain(`import { provideServiceWorker } from '@angular/service-worker';`);
  });

  describe('standalone=false', () => {
    const name = 'buz';
    const nonStandaloneAppOptions: ApplicationOptions = {
      ...appOptions,
      name,
      standalone: false,
    };
    const nonStandaloneSWOptions: ServiceWorkerOptions = {
      ...defaultOptions,
      project: name,
    };

    beforeEach(async () => {
      appTree = await schematicRunner.runSchematic('application', nonStandaloneAppOptions, appTree);
    });

    it('should import ServiceWorkerModule', async () => {
      const tree = await schematicRunner.runSchematic(
        'service-worker',
        nonStandaloneSWOptions,
        appTree,
      );
      const pkgText = tree.readContent('/projects/buz/src/app/app-module.ts');
      expect(pkgText).toMatch(/import \{ ServiceWorkerModule \} from '@angular\/service-worker'/);
    });

    it('should add the SW import to the NgModule imports', async () => {
      const tree = await schematicRunner.runSchematic(
        'service-worker',
        nonStandaloneSWOptions,
        appTree,
      );
      const pkgText = tree.readContent('/projects/buz/src/app/app-module.ts');
      expect(pkgText).toMatch(
        new RegExp(
          "(\\s+)ServiceWorkerModule\\.register\\('ngsw-worker\\.js', \\{\\n" +
            '\\1  enabled: !isDevMode\\(\\),\\n' +
            '\\1  // Register the ServiceWorker as soon as the application is stable\\n' +
            '\\1  // or after 30 seconds \\(whichever comes first\\)\\.\\n' +
            "\\1  registrationStrategy: 'registerWhenStable:30000'\\n" +
            '\\1}\\)',
        ),
      );
    });
  });

  describe('Legacy browser builder', () => {
    function convertBuilderToLegacyBrowser(): void {
      const config = JSON.parse(appTree.readContent('/angular.json'));
      const build = config.projects.bar.architect.build;

      build.builder = Builders.Browser;
      build.options = {
        ...build.options,
        main: 'projects/bar/src/main.ts',
        browser: undefined,
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
        buildOptimizer: false,
      };

      appTree.overwrite('/angular.json', JSON.stringify(config, undefined, 2));
    }

    beforeEach(() => {
      convertBuilderToLegacyBrowser();
    });

    it('should add `serviceWorker` option to build target', async () => {
      const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
      const configText = tree.readContent('/angular.json');
      const buildConfig = JSON.parse(configText).projects.bar.architect.build;

      expect(buildConfig.options.serviceWorker).toBeTrue();
    });

    it('should add `ngswConfigPath` option to build target', async () => {
      const tree = await schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
      const configText = tree.readContent('/angular.json');
      const buildConfig = JSON.parse(configText).projects.bar.architect.build;

      expect(buildConfig.options.ngswConfigPath).toBe('projects/bar/ngsw-config.json');
    });
  });
});
