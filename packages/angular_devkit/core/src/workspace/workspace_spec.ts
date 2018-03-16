/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tap } from 'rxjs/operators';
import { NodeJsSyncHost } from '../../node';
import { join, normalize } from '../virtual-fs';
import {
  ProjectNotFoundException,
  SchemaValidationException,
  Workspace,
  WorkspaceJson,
  WorkspaceNotYetLoadedException,
} from './workspace';


describe('Workspace', () => {
  const host = new NodeJsSyncHost();
  const root = normalize(__dirname);
  // The content of this JSON object should be kept in sync with the path below:
  // tests/@angular_devkit/workspace/angular-workspace.json
  const workspaceJson: WorkspaceJson = {
    version: 1,
    newProjectRoot: './projects',
    cli: {
      '$globalOverride': '${HOME}/.angular-cli.json',
      'schematics': {
        'defaultCollection': '@schematics/angular',
      },
      'warnings': {
        'showDeprecation': false,
      },
    },
    schematics: {
      '@schematics/angular': {
        '*': {
          skipImport: true,
          'packageManager': 'yarn',
        },
        'application': {
          spec: false,
        },
      },
    },
    architect: {},
    projects: {
      app: {
        root: 'projects/app',
        projectType: 'application',
        cli: {},
        schematics: {
          '@schematics/angular': {
            '*': {
              spec: false,
            },
          },
        },
        architect: {
          build: {
            builder: '@angular-devkit/build-webpack:browser',
            transforms: [
              {
                plugin: '@angular-devkit/architect-transforms:replacement',
                file: 'environments/environment.ts',
                configurations: {
                  production: 'environments/environment.prod.ts',
                },
              },
            ],
            options: {
              outputPath: '../dist',
              index: 'index.html',
              main: 'main.ts',
              polyfills: 'polyfills.ts',
              tsConfig: 'tsconfig.app.json',
              progress: false,
            },
            configurations: {
              production: {
                optimizationLevel: 1,
                outputHashing: 'all',
                sourceMap: false,
                extractCss: true,
                namedChunks: false,
                aot: true,
                extractLicenses: true,
                vendorChunk: false,
                buildOptimizer: true,
              },
            },
          },
        },
      },
    },
  };

  it('loads workspace from json', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProject('app').root).toEqual(workspaceJson.projects['app'].root)),
    ).subscribe(undefined, done.fail, done);
  });

  it('loads workspace from host', (done) => {
    const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
    const workspaceRoot = join(devkitRoot, 'tests/@angular_devkit/core/workspace');
    const workspace = new Workspace(workspaceRoot, host);
    workspace.loadWorkspaceFromHost(normalize('angular-workspace.json')).pipe(
      tap((ws) => expect(ws.getProject('app').root).toEqual(workspaceJson.projects['app'].root)),
    ).subscribe(undefined, done.fail, done);
  });

  it('errors when workspace fails validation', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson({ foo: 'bar' })
      .subscribe(undefined, (err) => {
        expect(err).toEqual(jasmine.any(SchemaValidationException));
        done();
      }, done.fail);
  });

  it('throws when getting information before workspace is loaded', () => {
    const workspace = new Workspace(root, host);
    expect(() => workspace.version).toThrow(new WorkspaceNotYetLoadedException());
  });

  it('throws when getting workspace tool before workspace is loaded', () => {
    const workspace = new Workspace(root, host);
    expect(() => workspace.getCli()).toThrow(new WorkspaceNotYetLoadedException());
  });

  it('gets workspace root', () => {
    const workspace = new Workspace(root, host);
    expect(workspace.root).toBe(root);
  });

  it('gets workspace host', () => {
    const workspace = new Workspace(root, host);
    expect(workspace.host).toBe(host);
  });

  it('gets workspace version', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.version).toEqual(workspaceJson.version)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace new project root', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.newProjectRoot).toEqual(workspaceJson.newProjectRoot)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project by name', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProject('app')).toEqual({
        ...workspaceJson.projects['app'],
        // Tools should not be returned when getting a project.
        cli: {},
        schematics: {},
        architect: {},
      })),
    ).subscribe(undefined, done.fail, done);
  });

  it('throws on missing project', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(() => ws.getProject('abc')).toThrow(new ProjectNotFoundException('abc'))),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace cli', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getCli()).toEqual(workspaceJson.cli)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace schematics', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getSchematics()).toEqual(workspaceJson.schematics)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace architect', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getArchitect()).toEqual(workspaceJson.architect)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project cli', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectCli('app')).toEqual(workspaceJson.projects.app.cli)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project schematics', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectSchematics('app'))
        .toEqual(workspaceJson.projects.app.schematics)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project architect', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectArchitect('app'))
        .toEqual(workspaceJson.projects.app.architect)),
    ).subscribe(undefined, done.fail, done);
  });

});
