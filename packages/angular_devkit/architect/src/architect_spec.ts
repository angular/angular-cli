/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { concatMap, tap, toArray } from 'rxjs/operators';
import { BrowserTargetOptions } from '../test/browser';
import {
  Architect,
  BuilderCannotBeResolvedException,
  ConfigurationNotFoundException,
  ProjectNotFoundException,
  Target,
  TargetNotFoundException,
} from './architect';
import { Workspace } from './workspace';


describe('Architect', () => {
  const host = new NodeJsSyncHost();
  const root = normalize(__dirname);
  const workspace: Workspace = {
    name: 'spec',
    version: 1,
    root: 'src',
    defaultProject: 'app',
    projects: {
      app: {
        root: 'app',
        projectType: 'application',
        defaultTarget: 'browser',
        targets: {
          browser: {
            builder: '../test:browser',
            options: {
              browserOption: 1,
            },
            configurations: {
              prod: {
                optimizationLevel: 1,
              },
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

  it('works', (done) => {
    const architect = new Architect(root, host);
    architect.loadWorkspaceFromJson(workspace).subscribe({
      complete: () => {
        const target = architect.getTarget<BrowserTargetOptions>();
        const options = target.options;

        // Check options were composed properly.
        expect(target.root).toBe(join(root, 'app'));
        expect(target.projectType).toBe('application');
        expect(target.builder).toBe('../test:browser');
        expect(options.browserOption).toBe(1);

        done();
      },
      error: done.fail,
    });
  });

  it('composes project with target and configuration', (done) => {
    const architect = new Architect(root, host);
    const targetOptions = {
      project: 'app',
      target: 'browser',
      configuration: 'prod',
    };
    architect.loadWorkspaceFromJson(workspace).subscribe({
      complete: () => {
        const target = architect.getTarget<BrowserTargetOptions>(targetOptions);
        const options = target.options;

        // Check options were composed properly.
        expect(target.root).toBe(join(root, 'app'));
        expect(target.projectType).toBe('application');
        expect(target.builder).toBe('../test:browser');
        expect(options.browserOption).toBe(1);
        expect(options.optimizationLevel).toBe(1);

        done();
      },
      error: done.fail,
    });
  });

  it('throws when missing project is used', (done) => {
    const architect = new Architect(root, host);
    const targetOptions = { project: 'missing' };
    architect.loadWorkspaceFromJson(workspace).subscribe({
      complete: () => {
        const err = new ProjectNotFoundException('missing');
        expect(() => architect.getTarget(targetOptions)).toThrow(err);
        done();
      },
      error: done.fail,
    });
  });

  it('throws when missing target is used', (done) => {
    const architect = new Architect(root, host);
    const targetOptions = { target: 'missing' };
    architect.loadWorkspaceFromJson(workspace).subscribe({
      complete: () => {
        const err = new TargetNotFoundException('missing');
        expect(() => architect.getTarget(targetOptions)).toThrow(err);
        done();
      },
      error: done.fail,
    });
  });

  it('throws when missing configuration is used', (done) => {
    const architect = new Architect(root, host);
    const targetOptions = { configuration: 'missing' };
    architect.loadWorkspaceFromJson(workspace).subscribe({
      complete: () => {
        const err = new ConfigurationNotFoundException('missing');
        expect(() => architect.getTarget(targetOptions)).toThrow(err);
        done();
      },
      error: done.fail,
    });
  });

  it('runs targets', (done) => {
    const architect = new Architect(root, host);
    const targetOptions = { project: 'app', target: 'browser' };
    architect.loadWorkspaceFromJson(workspace).pipe(
      concatMap((architect) => architect.run(architect.getTarget(targetOptions))),
      toArray(),
      tap(events => {
        expect(events.length).toBe(3);
        expect(events[0].success).toBe(true);
        expect(events[1].success).toBe(false);
        expect(events[2].success).toBe(true);
      }),
    ).subscribe(done, done.fail);

  });

  it('throws when invalid target is used', (done) => {
    let target: Target;
    const architect = new Architect(root, host);
    const targetOptions = { project: 'app', target: 'karma' };
    architect.loadWorkspaceFromJson(workspace).pipe(
      concatMap((architect) => {
        target = architect.getTarget(targetOptions);

        return architect.run(target);
      }),
    ).subscribe(() => done.fail(), (err: Error) => {
      const expectedErr = new BuilderCannotBeResolvedException(target.builder);
      expect(err.message).toEqual(expectedErr.message);
      done();
    });
  });
});
