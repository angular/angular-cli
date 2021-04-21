/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestProjectHost, TestingArchitectHost } from '@angular-devkit/architect/testing';
import {
  getSystemPath,
  join,
  normalize,
  schema,
  virtualFs,
  workspaces,
} from '@angular-devkit/core';
import { debounceTime, map, take, tap } from 'rxjs/operators';

// Default timeout for large specs is 2.5 minutes.
jasmine.DEFAULT_TIMEOUT_INTERVAL = 150000;


describe('NgPackagr Builder', () => {
  const workspaceRoot = join(normalize(__dirname), `../../test/hello-world-lib/`);
  const host = new TestProjectHost(workspaceRoot);
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();

    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    const workspaceSysPath = getSystemPath(host.root());
    const { workspace } = await workspaces.readWorkspace(
      workspaceSysPath,
      workspaces.createWorkspaceHost(host),
    );
    const architectHost = new TestingArchitectHost(
      workspaceSysPath,
      workspaceSysPath,
      new WorkspaceNodeModulesArchitectHost(workspace, workspaceSysPath),
    );

    architect = new Architect(architectHost, registry);
  });

  afterEach(() => host.restore().toPromise());

  it('builds and packages a library', async () => {
    const run = await architect.scheduleTarget({ project: 'lib', target: 'build' });

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(normalize('./dist/lib/fesm2015/lib.js'))).toBe(true);
    const content = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('./dist/lib/fesm2015/lib.js')),
    );
    expect(content).toContain('lib works');

    expect(content).toContain('ɵcmp');
  });

  it('rebuilds on TS file changes', async () => {
    const goldenValueFiles: { [path: string]: string } = {
      'projects/lib/src/lib/lib.component.ts': `
      import { Component } from '@angular/core';

      @Component({
        selector: 'lib',
        template: 'lib update works!'
      })
      export class LibComponent { }
      `,
    };

    const run = await architect.scheduleTarget(
      { project: 'lib', target: 'build' },
      { watch: true },
    );

    let buildNumber = 0;

    await run.output.pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      debounceTime(1000),
      map(() => {
        const fileName = './dist/lib/fesm2015/lib.js';
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(normalize(fileName)),
        );

        return content;
      }),
      tap(content => {
        buildNumber += 1;
        switch (buildNumber) {
          case 1:
            expect(content).toMatch(/lib works/);
            host.writeMultipleFiles(goldenValueFiles);
            break;

          case 2:
            expect(content).toMatch(/lib update works/);
            break;
          default:
            break;
        }
      }),
      take(2),
    ).toPromise();

    await run.stop();
  });
});
