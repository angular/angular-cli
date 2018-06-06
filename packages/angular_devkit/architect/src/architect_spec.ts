/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, experimental, normalize, schema } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { concatMap, tap, toArray } from 'rxjs/operators';
import { BrowserTargetOptions } from '../test/browser';
import {
  Architect,
  BuilderCannotBeResolvedException,
  ConfigurationNotFoundException,
  TargetNotFoundException,
} from './architect';


describe('Architect', () => {
  const host = new NodeJsSyncHost();
  const root = normalize(__dirname);
  const workspace = new experimental.workspace.Workspace(root, host);
  let architect: Architect;
  const workspaceJson = {
    version: 1,
    newProjectRoot: 'src',
    projects: {
      app: {
        root: 'app',
        sourceRoot: 'app/src',
        projectType: 'application',
        architect: {
          browser: {
            builder: '../test:browser',
            options: {
              browserOption: 1,
            },
            configurations: {
              prod: {
                optionalBrowserOption: false,
              },
            },
          },
          badBrowser: {
            builder: '../test:browser',
            options: {
              badBrowserOption: 1,
            },
          },
          karma: {
            builder: '../test:karma',
            options: {},
          },
        },
      },
    },
  };

  beforeAll((done) => workspace.loadWorkspaceFromJson(workspaceJson).pipe(
    concatMap(ws => new Architect(ws).loadArchitect()),
    tap(arch => architect = arch),
  ).toPromise().then(done, done.fail));

  it('works', () => {
    const targetSpec = { project: 'app', target: 'browser', configuration: 'prod' };
    const builderConfig = architect.getBuilderConfiguration<BrowserTargetOptions>(targetSpec);
    expect(builderConfig.root).toBe('app');
    expect(builderConfig.sourceRoot).toBe('app/src' as Path);
    expect(builderConfig.projectType).toBe('application');
    expect(builderConfig.builder).toBe('../test:browser');
    expect(builderConfig.options.browserOption).toBe(1);
    expect(builderConfig.options.optionalBrowserOption).toBe(false);
  });

  it('lists targets by name', () => {
    expect(architect.listProjectTargets('app')).toEqual(['browser', 'badBrowser', 'karma']);
  });

  it('errors when missing target is used', () => {
    const targetSpec = { project: 'app', target: 'missing', configuration: 'prod' };
    expect(() => architect.getBuilderConfiguration<BrowserTargetOptions>(targetSpec))
      .toThrow(new TargetNotFoundException(targetSpec.project, targetSpec.target));
  });

  it('throws when missing configuration is used', () => {
    const targetSpec = { project: 'app', target: 'browser', configuration: 'missing' };
    expect(() => architect.getBuilderConfiguration<BrowserTargetOptions>(targetSpec))
      .toThrow(new ConfigurationNotFoundException(targetSpec.project, targetSpec.configuration));
  });

  it('runs targets', (done) => {
    const targetSpec = { project: 'app', target: 'browser', configuration: 'prod' };
    const builderConfig = architect.getBuilderConfiguration<BrowserTargetOptions>(targetSpec);
    architect.run(builderConfig).pipe(
      toArray(),
      tap(events => {
        expect(events.length).toBe(3);
        expect(events[0].success).toBe(true);
        expect(events[1].success).toBe(false);
        expect(events[2].success).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('errors when builder cannot be resolved', (done) => {
    const targetSpec = { project: 'app', target: 'karma' };
    const builderConfig = architect.getBuilderConfiguration<BrowserTargetOptions>(targetSpec);
    architect.run(builderConfig).toPromise().then(() => done.fail(), (err: Error) => {
      expect(err).toEqual(jasmine.any(BuilderCannotBeResolvedException));
      done();
    });
  });

  it('errors when builder options fail validation', (done) => {
    const targetSpec = { project: 'app', target: 'badBrowser' };
    const builderConfig = architect.getBuilderConfiguration<BrowserTargetOptions>(targetSpec);
    architect.run(builderConfig).toPromise().then(() => done.fail(), (err: Error) => {
      expect(err).toEqual(jasmine.any(schema.SchemaValidationException));
      done();
    });
  });
});
