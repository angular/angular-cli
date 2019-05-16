/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function

import { tap } from 'rxjs/operators';
import { schema } from '../..';
import { NodeJsSyncHost } from '../../../node';
import { AdditionalPropertiesValidatorError } from '../../json/schema/interface';
import { dirname, join, normalize } from '../../virtual-fs';
import {
  ProjectNotFoundException,
  Workspace,
  WorkspaceNotYetLoadedException,
} from './workspace';
import { WorkspaceProject, WorkspaceSchema, WorkspaceTool } from './workspace-schema';


describe('Workspace', () => {
  const host = new NodeJsSyncHost();
  const root = normalize(__dirname);
  // The content of this JSON object should be kept in sync with the path below:
  // tests/angular_devkit/core/workspace/angular-workspace.json
  const workspaceJson: WorkspaceSchema = {
    version: 1,
    newProjectRoot: './projects',
    defaultProject: 'app',
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
    targets: {},
    projects: {
      app: {
        root: 'projects/app',
        sourceRoot: 'projects/app/src',
        projectType: 'application',
        prefix: 'app',
        cli: {},
        schematics: {
          '@schematics/angular': {
            '*': {
              spec: false,
            },
          },
        },
        targets: {
          build: {
            builder: '@angular-devkit/build-angular:browser',
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
                optimize: true,
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
  // Tools should not be returned when getting a project.
  const appProject = { ...workspaceJson.projects['app'] };
  delete appProject['cli'];
  delete appProject['schematics'];
  delete appProject['targets'];

  it('loads workspace from json', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProject('app').root).toEqual(workspaceJson.projects['app'].root)),
    ).toPromise().then(done, done.fail);
  });

  it('loads workspace from host', (done) => {
    const workspacePath = require.resolve('./test/test-workspace.json');
    const workspaceRoot = dirname(normalize(workspacePath));
    const workspace = new Workspace(workspaceRoot, host);
    workspace.loadWorkspaceFromHost(normalize('test-workspace.json')).pipe(
      tap((ws) => expect(ws.getProject('app').root).toEqual(workspaceJson.projects['app'].root)),
    ).toPromise().then(done, done.fail);
  });

  it('errors when workspace fails validation', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson({ foo: 'bar' })
      .toPromise().then(() => done.fail, (err) => {
        const validationErrors = [{
          keyword: 'additionalProperties',
          dataPath: '',
          schemaPath: '#/additionalProperties',
          params: { additionalProperty: 'foo' },
          message: 'should NOT have additional properties',
        } as AdditionalPropertiesValidatorError];
        expect(err).toEqual(new schema.SchemaValidationException(validationErrors));
        done();
      });
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
    ).toPromise().then(done, done.fail);
  });

  it('gets workspace new project root', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.newProjectRoot).toEqual(workspaceJson.newProjectRoot)),
    ).toPromise().then(done, done.fail);
  });

  it('lists project names', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.listProjectNames()).toEqual(['app'])),
    ).toPromise().then(done, done.fail);
  });

  it('gets project by name', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProject('app')).toEqual(appProject)),
    ).toPromise().then(done, done.fail);
  });

  it('throws on missing project', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(() => ws.getProject('abc')).toThrow(new ProjectNotFoundException('abc'))),
    ).toPromise().then(done, done.fail);
  });

  it('gets default project', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getDefaultProjectName()).toEqual('app')),
    ).toPromise().then(done, done.fail);
  });

  it('gets default project when there is a single one', (done) => {
    const customWorkspaceJson = { ...workspaceJson, defaultProject: undefined };
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(customWorkspaceJson).pipe(
      tap((ws) => expect(ws.getDefaultProjectName()).toEqual('app')),
    ).toPromise().then(done, done.fail);
  });

  it('gets default project returns null when there is none', (done) => {
    const customWorkspaceJson = { ...workspaceJson, defaultProject: undefined, projects: {} };
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(customWorkspaceJson).pipe(
      tap((ws) => expect(ws.getDefaultProjectName()).toEqual(null)),
    ).toPromise().then(done, done.fail);
  });

  it('gets project by path', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectByPath(ws.root)).toEqual('app')),
    ).toPromise().then(done, done.fail);
  });

  it('gets closest project by path', (done) => {
    const app = workspaceJson.projects['app'];
    const anotherAppRoot = join(normalize(app.root), 'folder');
    const customWorkspaceJson = { ...workspaceJson, projects: {
      'app': app,
      'another-app': { ...app, root: anotherAppRoot},
    } };
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(customWorkspaceJson).pipe(
      tap((ws) => expect(ws.getProjectByPath(anotherAppRoot)).toEqual('another-app')),
    ).toPromise().then(done, done.fail);
  });

  it('gets workspace cli', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getCli()).toEqual(workspaceJson.cli as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets workspace schematics', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getSchematics()).toEqual(workspaceJson.schematics as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets workspace targets', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getTargets()).toEqual(workspaceJson.targets as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets workspace architect when targets is not there', (done) => {
    const workspace = new Workspace(root, host);
    const workspaceJsonClone = { ...workspaceJson };
    workspaceJsonClone['architect'] = workspaceJsonClone['targets'];
    delete workspaceJsonClone['targets'];
    workspace.loadWorkspaceFromJson(workspaceJsonClone).pipe(
      tap((ws) => expect(ws.getTargets()).toEqual(workspaceJson.targets as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets project cli', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectCli('app'))
        .toEqual(workspaceJson.projects.app.cli as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets project schematics', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectSchematics('app'))
        .toEqual(workspaceJson.projects.app.schematics as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets project targets', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectTargets('app'))
        .toEqual(workspaceJson.projects.app.targets as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

  it('gets project architect when targets is not there', (done) => {
    const workspace = new Workspace(root, host);
    const appJsonClone = { ...workspaceJson.projects.app };
    appJsonClone['architect'] = appJsonClone['targets'];
    delete appJsonClone['targets'];
    const simpleWorkspace = {
      version: 1,
      projects: { app: appJsonClone },
    };
    workspace.loadWorkspaceFromJson(simpleWorkspace).pipe(
      tap((ws) => expect(ws.getProjectTargets('app'))
        .toEqual(workspaceJson.projects.app.targets as WorkspaceTool)),
    ).toPromise().then(done, done.fail);
  });

});
