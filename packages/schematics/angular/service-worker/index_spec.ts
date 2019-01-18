/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
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
    configuration: 'production',
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

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should update the production configuration', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const swFlag = config.projects.bar.architect
      .build.configurations.production.serviceWorker;
    expect(swFlag).toEqual(true);
  });

  it('should update the target options if no configuration is set', () => {
    const options = { ...defaultOptions, configuration: '' };
    const tree = schematicRunner.runSchematic('service-worker', options, appTree);
    const configText = tree.readContent('/angular.json');
    const config = JSON.parse(configText);
    const swFlag = config.projects.bar.architect
      .build.options.serviceWorker;
    expect(swFlag).toEqual(true);
  });

  it('should add the necessary dependency', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/package.json');
    const pkg = JSON.parse(pkgText);
    const version = pkg.dependencies['@angular/core'];
    expect(pkg.dependencies['@angular/service-worker']).toEqual(version);
  });

  it('should import ServiceWorkerModule', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(pkgText).toMatch(/import \{ ServiceWorkerModule \} from '@angular\/service-worker'/);
  });

  it('should import environment', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
    expect(pkgText).toMatch(/import \{ environment \} from '\.\.\/environments\/environment'/);
  });

  it('should add the SW import to the NgModule imports', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
    // tslint:disable-next-line:max-line-length
    const expectedText = 'ServiceWorkerModule.register(\'ngsw-worker.js\', { enabled: environment.production })';
    expect(pkgText).toContain(expectedText);
  });

  it('should put the ngsw-config.json file in the project root', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const path = '/projects/bar/ngsw-config.json';
    expect(tree.exists(path)).toEqual(true);

    const { projects } = JSON.parse(tree.readContent('/angular.json'));
    expect(projects.bar.architect.build.configurations.production.ngswConfigPath)
      .toBe('projects/bar/ngsw-config.json');
  });

  it('should add root assets RegExp', () => {
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/ngsw-config.json');
    const config = JSON.parse(pkgText);
    expect(config.assetGroups[1].resources.files)
      .toContain('/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)');
  });

  it('should add resourcesOutputPath to root assets when specified', () => {
    const config = JSON.parse(appTree.readContent('/angular.json'));
    config.projects.bar.architect.build.configurations.production.resourcesOutputPath = 'outDir';
    appTree.overwrite('/angular.json', JSON.stringify(config));
    const tree = schematicRunner.runSchematic('service-worker', defaultOptions, appTree);
    const pkgText = tree.readContent('/projects/bar/ngsw-config.json');
    const ngswConfig = JSON.parse(pkgText);
    expect(ngswConfig.assetGroups[1].resources.files)
      .toContain('/outDir/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)');
  });

  it('should generate ngsw-config.json in src when the application is at root level', () => {
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

    let tree = schematicRunner.runSchematic('application', rootAppOptions, appTree);
    tree = schematicRunner.runSchematic('service-worker', rootSWOptions, tree);
    expect(tree.exists('/src/ngsw-config.json')).toBe(true);

    const { projects } = JSON.parse(tree.readContent('/angular.json'));
    expect(projects.foo.architect.build.configurations.production.ngswConfigPath)
      .toBe('src/ngsw-config.json');
  });

});
