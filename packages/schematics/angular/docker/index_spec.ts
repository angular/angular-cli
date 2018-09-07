/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as DockerOptions } from './schema';


// tslint:disable:max-line-length
describe('Docker Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );

  const defaultOptions: DockerOptions = {
    project: 'bar',
    name: 'foo',
    environment: 'prod',
    imageName: 'null',
    useImage: false,
    imageOrg: 'temp',
    imageRegistry: 'registry.hub.docker.com',
    servicePort: 8000,
    serviceName: 'bar',
    machineName: 'my-machine',
  };

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
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };

  const initialWorkspaceAppOptions: ApplicationOptions = {
    name: 'workspace',
    projectRoot: '',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };

  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', initialWorkspaceAppOptions, appTree);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  it('should create docker default files', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('docker', options, appTree);
    const files = tree.files;
    const path = '/projects/bar';

    expect(files.indexOf(`${path}/.dockerignore`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${path}/Dockerfile`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${path}/docker-compose.yml`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${path}/docker-compose.${options.environment}.yml`)).toBeGreaterThanOrEqual(0);
    expect(files.indexOf(`${path}/nginx.conf`)).toBeGreaterThanOrEqual(0);
  });

});
