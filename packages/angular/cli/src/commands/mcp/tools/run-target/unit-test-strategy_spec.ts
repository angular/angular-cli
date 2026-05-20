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
import { UnitTestTargetStrategy } from './unit-test-strategy';

describe('UnitTestTargetStrategy', () => {
  let mockHost: MockHost;
  let mockContext: MockMcpToolContext;
  let strategy: UnitTestTargetStrategy;

  beforeEach(() => {
    const mock = createMockContext();
    mockHost = mock.host;
    mockContext = mock.context;
    addProjectToWorkspace(mock.projects, 'my-app');
    strategy = new UnitTestTargetStrategy();
  });

  describe('canHandle', () => {
    it('should match test target with official builders', () => {
      expect(strategy.canHandle('test', '@angular-devkit/build-angular:karma')).toBeTrue();
      expect(strategy.canHandle('test', '@angular/build:karma')).toBeTrue();
      expect(strategy.canHandle('test', '@angular/build:unit-test')).toBeTrue();
    });

    it('should not match test target with custom builders', () => {
      expect(strategy.canHandle('test', 'custom-test-builder')).toBeFalse();
      expect(strategy.canHandle('test', undefined)).toBeFalse();
    });

    it('should not match other targets', () => {
      expect(strategy.canHandle('build', '@angular-devkit/build-angular:karma')).toBeFalse();
    });
  });

  describe('execute', () => {
    it('should append configuration arguments if provided', async () => {
      mockContext.workspace.projects.get('my-app')?.targets.set('test', {
        builder: '@angular-devkit/build-angular:karma',
      });
      mockHost.executeNgCommand.and.resolveTo({ logs: ['Karma success'] });

      await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'test',
          configuration: 'ci',
          targetDefinition: {
            builder: '@angular-devkit/build-angular:karma',
          },
        },
        mockContext,
      );

      expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
        ['test', 'my-app', '-c', 'ci', '--browsers', 'ChromeHeadless', '--watch', 'false'],
        { cwd: '/test' },
      );
    });

    it('should auto-inject no-watch and --browsers ChromeHeadless for Karma devkit builder', async () => {
      mockContext.workspace.projects.get('my-app')?.targets.set('test', {
        builder: '@angular-devkit/build-angular:karma',
      });
      mockHost.executeNgCommand.and.resolveTo({ logs: ['Karma success'] });

      await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'test',
          targetDefinition: {
            builder: '@angular-devkit/build-angular:karma',
          },
        },
        mockContext,
      );

      expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
        ['test', 'my-app', '--browsers', 'ChromeHeadless', '--watch', 'false'],
        { cwd: '/test' },
      );
    });

    it('should auto-inject no-watch and --browsers ChromeHeadless for Karma build builder', async () => {
      mockContext.workspace.projects.get('my-app')?.targets.set('test', {
        builder: '@angular/build:karma',
      });
      mockHost.executeNgCommand.and.resolveTo({ logs: ['Karma success'] });

      await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'test',
          targetDefinition: {
            builder: '@angular/build:karma',
          },
        },
        mockContext,
      );

      expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
        ['test', 'my-app', '--browsers', 'ChromeHeadless', '--watch', 'false'],
        { cwd: '/test' },
      );
    });

    it('should inject --headless true for modern unit-test builder with non-karma runner', async () => {
      mockContext.workspace.projects.get('my-app')?.targets.set('test', {
        builder: '@angular/build:unit-test',
        options: { runner: 'vitest' },
      });
      mockHost.executeNgCommand.and.resolveTo({ logs: ['Vite success'] });

      await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'test',
          targetDefinition: {
            builder: '@angular/build:unit-test',
            options: { runner: 'vitest' },
          },
        },
        mockContext,
      );

      expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
        ['test', 'my-app', '--headless', 'true', '--watch', 'false'],
        { cwd: '/test' },
      );
    });

    it('should override watch options passed explicitly by LLM', async () => {
      mockContext.workspace.projects.get('my-app')?.targets.set('test', {
        builder: '@angular/build:unit-test',
        options: { runner: 'vitest' },
      });
      mockHost.executeNgCommand.and.resolveTo({ logs: ['Vite success'] });

      await strategy.execute(
        {
          workspacePath: '/test',
          projectName: 'my-app',
          targetName: 'test',
          targetDefinition: {
            builder: '@angular/build:unit-test',
            options: { runner: 'vitest' },
          },
          options: { watch: true, browsers: 'Firefox' },
        },
        mockContext,
      );

      expect(mockHost.executeNgCommand).toHaveBeenCalledWith(
        ['test', 'my-app', '--headless', 'true', '--watch', 'false', '--browsers=Firefox'],
        { cwd: '/test' },
      );
    });
  });
});
