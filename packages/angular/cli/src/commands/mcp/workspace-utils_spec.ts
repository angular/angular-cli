/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { join } from 'node:path';
import { AngularWorkspace } from '../../utilities/config';
import { LocalWorkspaceHost } from './host';
import { addProjectToWorkspace, createMockContext, createMockHost } from './testing/test-utils';
import {
  findAngularJsonDir,
  getDefaultProjectName,
  getProject,
  resolveWorkspaceAndProject,
} from './workspace-utils';

describe('MCP Workspace Utils', () => {
  describe('findAngularJsonDir', () => {
    let mockHost: typeof LocalWorkspaceHost;

    beforeEach(() => {
      mockHost = {
        existsSync: jasmine.createSpy('existsSync'),
      } as unknown as typeof LocalWorkspaceHost;
    });

    it('should return dir if angular.json exists in it', () => {
      (mockHost.existsSync as jasmine.Spy).and.callFake(
        (path: string) => path === join('/app', 'angular.json'),
      );
      expect(findAngularJsonDir('/app', mockHost)).toBe('/app');
    });

    it('should traverse up directory tree', () => {
      (mockHost.existsSync as jasmine.Spy).and.callFake(
        (path: string) => path === join('/app', 'angular.json'),
      );
      expect(findAngularJsonDir('/app/src/app', mockHost)).toBe('/app');
    });

    it('should return null if not found', () => {
      (mockHost.existsSync as jasmine.Spy).and.returnValue(false);
      expect(findAngularJsonDir('/app', mockHost)).toBeNull();
    });
  });

  describe('getProject', () => {
    it('should return undefined if workspace has no projects', () => {
      const { context } = createMockContext();
      const emptyContext = { ...context };
      expect(getProject(emptyContext, 'app')).toBeUndefined();
    });

    it('should return undefined if project not found', () => {
      const { context, projects } = createMockContext();
      addProjectToWorkspace(projects, 'existing-app', {}, 'root');
      expect(getProject(context, 'non-existent')).toBeUndefined();
    });

    it('should return project definition if found', () => {
      const { context, projects } = createMockContext();
      addProjectToWorkspace(projects, 'app', {}, 'root');

      const project = getProject(context, 'app');
      expect(project).toBeDefined();
      expect(project?.root).toBe('root');
    });
  });

  describe('getDefaultProjectName', () => {
    it('should return undefined if workspace is missing', () => {
      const { context } = createMockContext();
      const emptyContext = { ...context, workspace: undefined };
      expect(getDefaultProjectName(emptyContext.workspace)).toBeUndefined();
    });

    it('should return defaultProject from extensions', () => {
      const { context } = createMockContext();
      context.workspace.extensions['defaultProject'] = 'my-app';
      expect(getDefaultProjectName(context.workspace)).toBe('my-app');
    });

    it('should return single project name if only one exists and no defaultProject', () => {
      const { context, projects } = createMockContext();
      addProjectToWorkspace(projects, 'only-app', {}, '');
      expect(getDefaultProjectName(context.workspace)).toBe('only-app');
    });

    it('should return undefined if multiple projects exist and no defaultProject', () => {
      const { context, projects } = createMockContext();
      addProjectToWorkspace(projects, 'app1', {}, '');
      addProjectToWorkspace(projects, 'app2', {}, '');
      expect(getDefaultProjectName(context.workspace)).toBeUndefined();
    });
  });

  describe('resolveWorkspaceAndProject', () => {
    let mockHost: ReturnType<typeof createMockHost>;
    let mockWorkspace: AngularWorkspace;
    const cwd = './';

    beforeEach(() => {
      mockHost = createMockHost();
      spyOn(process, 'cwd').and.returnValue(cwd);

      // Setup default mocks
      mockHost.existsSync.and.callFake((p) => {
        // Mock presence of angular.json in CWD
        if (p === join(cwd, 'angular.json')) {
          return true;
        }
        // Mock presence of specific workspace
        if (p === '/my/workspace') {
          return true;
        }
        if (p === '/my/workspace/angular.json') {
          return true;
        }

        return false;
      });

      const projects = new workspaces.ProjectDefinitionCollection();
      projects.set('app', {
        root: 'app',
        extensions: {},
        targets: new workspaces.TargetDefinitionCollection(),
      });

      mockWorkspace = {
        projects,
        extensions: { defaultProject: 'app' },
        basePath: cwd,
        filePath: join(cwd, 'angular.json'),
      } as unknown as AngularWorkspace;

      spyOn(AngularWorkspace, 'load').and.resolveTo(mockWorkspace);
    });

    it('should resolve workspace from CWD if not provided and mcpWorkspace is absent', async () => {
      const result = await resolveWorkspaceAndProject({
        host: mockHost,
      });
      expect(result.workspacePath).toBe(cwd);
      expect(result.projectName).toBe('app');
      expect(AngularWorkspace.load).toHaveBeenCalledWith(join(cwd, 'angular.json'));
    });

    it('should use mcpWorkspace if provided and no input path', async () => {
      const result = await resolveWorkspaceAndProject({
        host: mockHost,
        mcpWorkspace: mockWorkspace,
      });
      expect(result.workspace).toBe(mockWorkspace);
      expect(result.workspacePath).toBe(mockWorkspace.basePath);
      expect(AngularWorkspace.load).not.toHaveBeenCalled();
    });

    it('should prefer workspacePathInput over mcpWorkspace', async () => {
      const result = await resolveWorkspaceAndProject({
        host: mockHost,
        workspacePathInput: '/my/workspace',
        mcpWorkspace: mockWorkspace,
      });
      expect(result.workspacePath).toBe('/my/workspace');
      expect(AngularWorkspace.load).toHaveBeenCalledWith('/my/workspace/angular.json');
    });

    it('should resolve provided workspace', async () => {
      const result = await resolveWorkspaceAndProject({
        host: mockHost,
        workspacePathInput: '/my/workspace',
      });
      expect(result.workspacePath).toBe('/my/workspace');
      expect(AngularWorkspace.load).toHaveBeenCalledWith('/my/workspace/angular.json');
    });

    it('should throw if provided workspace does not exist', async () => {
      mockHost.existsSync.and.returnValue(false);
      await expectAsync(
        resolveWorkspaceAndProject({
          host: mockHost,
          workspacePathInput: '/bad/path',
        }),
      ).toBeRejectedWithError(/Workspace path does not exist: \/bad\/path/);
    });

    it('should throw if provided workspace has no angular.json', async () => {
      mockHost.existsSync.and.callFake((p) => p === '/path');
      await expectAsync(
        resolveWorkspaceAndProject({
          host: mockHost,
          workspacePathInput: '/path',
        }),
      ).toBeRejectedWithError(/No angular.json found at \/path/);
    });

    it('should resolve provided project', async () => {
      const result = await resolveWorkspaceAndProject({
        host: mockHost,
        projectNameInput: 'app',
      });
      expect(result.projectName).toBe('app');
    });

    it('should throw if provided project does not exist', async () => {
      await expectAsync(
        resolveWorkspaceAndProject({
          host: mockHost,
          projectNameInput: 'bad-app',
        }),
      ).toBeRejectedWithError(/Project 'bad-app' not found in workspace path/);
    });

    it('should throw if no project resolved', async () => {
      mockWorkspace.extensions['defaultProject'] = undefined;
      mockWorkspace.projects.set('app2', {
        root: 'app2',
        extensions: {},
        targets: new workspaces.TargetDefinitionCollection(),
      });

      await expectAsync(
        resolveWorkspaceAndProject({
          host: mockHost,
        }),
      ).toBeRejectedWithError(/No project name provided and no default project found/);
    });

    it('should throw if mcpWorkspace is absent and no workspace found in CWD', async () => {
      mockHost.existsSync.and.returnValue(false);
      await expectAsync(
        resolveWorkspaceAndProject({
          host: mockHost,
        }),
      ).toBeRejectedWithError(/Could not find an Angular workspace/);
    });
  });
});
