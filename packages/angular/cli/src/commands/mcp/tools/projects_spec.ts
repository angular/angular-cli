/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import assert from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempDir = mkdtempSync(join(baseTmpDir, 'mcp-projects-tool-'));
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

    const projects = workspaces[0].projects;
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe('my-app');
    expect(projects[0].targets).toEqual(['build', 'test', 'lint', 'e2e']);
    expect(projects[0].unitTestFramework).toBe('vitest');
  });

  it('should use configured roots when client roots capability is absent', async () => {
    mockContext.server = {
      server: {
        getClientCapabilities: jasmine.createSpy('getClientCapabilities').and.returnValue({}),
      },
    } as unknown as NonNullable<Parameters<typeof LIST_PROJECTS_TOOL.factory>[0]['server']>;
    mockContext.roots = [allowedRoot];

    const handler = await LIST_PROJECTS_TOOL.factory(mockContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any)({});

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.workspaces.length).toBe(1);
    expect(result.structuredContent.workspaces[0].projects[0].name).toBe('my-app');
  });

  it('should fall back to configured roots when client supports roots but returns an empty list', async () => {
    mockContext.server = {
      server: {
        getClientCapabilities: jasmine.createSpy('getClientCapabilities').and.returnValue({
          roots: { listChanged: false },
        }),
        listRoots: jasmine.createSpy('listRoots').and.resolveTo({
          roots: [],
        }),
      },
    } as unknown as NonNullable<Parameters<typeof LIST_PROJECTS_TOOL.factory>[0]['server']>;
    mockContext.roots = [allowedRoot];

    const handler = await LIST_PROJECTS_TOOL.factory(mockContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any)({});

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.workspaces.length).toBe(1);
    expect(result.structuredContent.workspaces[0].projects[0].name).toBe('my-app');
  });

  describe('frameworkVersion', () => {
    function installAngularCore(dir: string, version: string): void {
      const packageDir = join(dir, 'node_modules', '@angular', 'core');
      mkdirSync(packageDir, { recursive: true });
      writeFileSync(
        join(packageDir, 'package.json'),
        JSON.stringify({ name: '@angular/core', version }),
      );
    }

    async function listProjects() {
      const handler = await LIST_PROJECTS_TOOL.factory(mockContext);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (handler as any)({});
    }

    it('should use the installed version when the dependency is declared with a catalog', async () => {
      writeFileSync(
        join(workspaceDir, 'package.json'),
        JSON.stringify({ dependencies: { '@angular/core': 'catalog:' } }),
      );
      installAngularCore(workspaceDir, '22.3.0');

      const result = await listProjects();

      expect(result.structuredContent.workspaces.length).toBe(1);
      expect(result.structuredContent.workspaces[0].frameworkVersion).toBe('22');
      expect(result.structuredContent.versioningErrors).toEqual([]);
      expect(result.content[0].text).not.toContain('could not be determined');
    });

    it('should not set a version or report an error when @angular/core is not installed', async () => {
      writeFileSync(
        join(workspaceDir, 'package.json'),
        JSON.stringify({ dependencies: { '@angular/core': 'catalog:' } }),
      );

      const result = await listProjects();

      expect(result.structuredContent.workspaces.length).toBe(1);
      expect(result.structuredContent.workspaces[0].frameworkVersion).toBeUndefined();
      expect(result.structuredContent.versioningErrors).toEqual([]);
      expect(result.content[0].text).not.toContain('could not be determined');
    });

    it(`should resolve the version from a nested workspace's own node_modules`, async () => {
      const appDir = join(allowedRoot, 'apps', 'web');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'angular.json'), '{}');
      writeFileSync(
        join(appDir, 'package.json'),
        JSON.stringify({ dependencies: { '@angular/core': 'catalog:angular' } }),
      );
      installAngularCore(appDir, '21.1.4');

      const result = await listProjects();

      const appWorkspace = result.structuredContent.workspaces.find(
        (ws: { path: string }) => ws.path === join(appDir, 'angular.json'),
      );
      expect(appWorkspace).toBeDefined();
      expect(appWorkspace.frameworkVersion).toBe('21');
      expect(result.structuredContent.versioningErrors).toEqual([]);
    });

    it('should resolve the version from a node_modules directory in a parent directory', async () => {
      installAngularCore(allowedRoot, '20.0.2');

      const result = await listProjects();

      expect(result.structuredContent.workspaces.length).toBe(1);
      expect(result.structuredContent.workspaces[0].frameworkVersion).toBe('20');
    });
  });
});
