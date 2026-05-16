/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AngularWorkspace } from '../../../utilities/config';
import { createMockContext } from '../testing/test-utils';
import { LIST_PROJECTS_TOOL } from './projects';

describe('List Projects Tool', () => {
  let mockWorkspace: AngularWorkspace;
  let mockContext: ReturnType<typeof createMockContext>['context'];
  let tempDir: string;
  let allowedRoot: string;
  let workspaceDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mcp-projects-tool-'));
    allowedRoot = join(tempDir, 'allowed-root');
    workspaceDir = join(allowedRoot, 'workspace');
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(join(workspaceDir, 'angular.json'), '{}');
    writeFileSync(
      join(workspaceDir, 'package.json'),
      JSON.stringify({ dependencies: { '@angular/core': '18.0.0' } }),
    );

    const projects = new workspaces.ProjectDefinitionCollection();
    const targets = new workspaces.TargetDefinitionCollection();
    targets.set('build', { builder: '@angular-devkit/build-angular:application' });
    targets.set('test', { builder: '@angular/build:unit-test', options: { runner: 'vitest' } });
    targets.set('lint', { builder: '@angular-eslint/builder:lint' });
    targets.set('e2e', { builder: '@cypress/schematic:cypress' });

    projects.set('my-app', {
      root: 'projects/my-app',
      extensions: { projectType: 'application', prefix: 'app' },
      targets,
    });

    mockWorkspace = {
      projects,
      extensions: {},
      basePath: workspaceDir,
      filePath: join(workspaceDir, 'angular.json'),
    } as unknown as AngularWorkspace;

    spyOn(AngularWorkspace, 'load').and.resolveTo(mockWorkspace);

    const { context } = createMockContext();
    mockContext = context;
    mockContext.server = {
      server: {
        getClientCapabilities: jasmine.createSpy('getClientCapabilities').and.returnValue({
          roots: { listChanged: false },
        }),
        listRoots: jasmine.createSpy('listRoots').and.resolveTo({
          roots: [{ uri: pathToFileURL(allowedRoot).href, name: 'allowed-root' }],
        }),
      },
    } as unknown as NonNullable<Parameters<typeof LIST_PROJECTS_TOOL.factory>[0]['server']>;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list workspaces and extract available architect targets', async () => {
    const handler = await LIST_PROJECTS_TOOL.factory(mockContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any)({});

    expect(result.structuredContent).toBeDefined();
    const workspaces = result.structuredContent.workspaces;
    expect(workspaces.length).toBe(1);
    expect(workspaces[0].frameworkVersion).toBe('18');

    const projects = workspaces[0].projects;
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe('my-app');
    expect(projects[0].targets).toEqual(['build', 'test', 'lint', 'e2e']);
    expect(projects[0].unitTestFramework).toBe('vitest');
  });
});
