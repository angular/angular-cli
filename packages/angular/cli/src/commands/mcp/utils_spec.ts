/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { CommandError, LocalWorkspaceHost } from './host';
import { addProjectToWorkspace, createMockContext } from './testing/test-utils';
import {
  createStructuredContentOutput,
  findAngularJsonDir,
  getCommandErrorLogs,
  getDefaultProjectName,
  getProject,
} from './utils';

describe('MCP Utils', () => {
  describe('createStructuredContentOutput', () => {
    it('should create valid structured content output', () => {
      const data = { foo: 'bar' };
      const output = createStructuredContentOutput(data);

      expect(output.structuredContent).toEqual(data);
      expect(output.content).toEqual([{ type: 'text', text: JSON.stringify(data, null, 2) }]);
    });
  });

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
      expect(getDefaultProjectName(emptyContext)).toBeUndefined();
    });

    it('should return defaultProject from extensions', () => {
      const { context, workspace } = createMockContext();
      workspace.extensions['defaultProject'] = 'my-app';
      expect(getDefaultProjectName(context)).toBe('my-app');
    });

    it('should return single project name if only one exists and no defaultProject', () => {
      const { context, projects } = createMockContext();
      addProjectToWorkspace(projects, 'only-app', {}, '');
      expect(getDefaultProjectName(context)).toBe('only-app');
    });

    it('should return undefined if multiple projects exist and no defaultProject', () => {
      const { context, projects } = createMockContext();
      addProjectToWorkspace(projects, 'app1', {}, '');
      addProjectToWorkspace(projects, 'app2', {}, '');
      expect(getDefaultProjectName(context)).toBeUndefined();
    });
  });

  describe('getCommandErrorLogs', () => {
    it('should extract logs from CommandError', () => {
      const logs = ['log1', 'log2'];
      const err = new CommandError('failed', logs, 1);
      expect(getCommandErrorLogs(err)).toEqual([...logs, 'failed']);
    });

    it('should extract message from Error', () => {
      const err = new Error('oops');
      expect(getCommandErrorLogs(err)).toEqual(['oops']);
    });

    it('should stringify unknown error', () => {
      expect(getCommandErrorLogs('weird error')).toEqual(['weird error']);
    });
  });
});
