/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { MockHost } from '../../testing/mock-host';
import {
  type MockMcpToolContext,
  addProjectToWorkspace,
  createMockContext,
} from '../../testing/test-utils';
import { BuildTargetStrategy } from './build-target-strategy';

describe('BuildTargetStrategy', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;
  let strategy: BuildTargetStrategy;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;
    addProjectToWorkspace(mock.projects, 'my-app');
    strategy = new BuildTargetStrategy();
  });

  describe('canHandle', () => {
    it('should match build target with official builders', () => {
      expect(strategy.canHandle('build', '@angular-devkit/build-angular:application')).toBeTrue();
      expect(strategy.canHandle('build', '@angular-devkit/build-angular:browser')).toBeTrue();
      expect(strategy.canHandle('build', '@angular/build:application')).toBeTrue();
      expect(strategy.canHandle('build', '@angular-devkit/build-angular:ng-packagr')).toBeTrue();
    });

    it('should not match build target with custom builders', () => {
      expect(strategy.canHandle('build', 'custom-builder')).toBeFalse();
      expect(strategy.canHandle('build', undefined)).toBeFalse();
    });

    it('should not match other targets', () => {
      expect(strategy.canHandle('test', '@angular-devkit/build-angular:browser')).toBeFalse();
    });
  });

  describe('execute', () => {
    it('should spawn ng build and parse outputPath successfully', async () => {
      const buildLogs = ['Build successful!', 'Output location: dist/my-app'];
      mockHost.executeNgCommand.and.resolveTo({ logs: buildLogs });

      const result = await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'build',
          targetDefinition: {
            builder: '@angular/build:application',
          },
        },
        mockContext,
      );

      expect(mockHost.executeNgCommand).toHaveBeenCalledWith(['build', 'my-app'], {
        cwd: '/test',
      });
      expect(result.status).toBe('success');
      expect(result.logs).toEqual(buildLogs);
      expect(result.extensions).toEqual({ outputPath: 'dist/my-app' });
    });

    it('should return undefined outputPath if parsing matches nothing', async () => {
      const buildLogs = ['Build successful!'];
      mockHost.executeNgCommand.and.resolveTo({ logs: buildLogs });

      const result = await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'build',
          targetDefinition: {
            builder: '@angular/build:application',
          },
        },
        mockContext,
      );

      expect(result.status).toBe('success');
      expect(result.extensions).toBeUndefined();
    });
  });
});
