/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AngularWorkspace } from '../../../utilities/config';
import { type Devserver } from '../devserver';
import { Host } from '../host';
import { McpToolContext } from '../tools/tool-registry';
import { MockHost } from './mock-host';

/**
 * Creates a mock implementation of the Host interface for testing purposes.
 * Each method is a Jasmine spy that can be configured.
 */
export function createMockHost(): MockHost {
  return {
    runCommand: jasmine.createSpy<Host['runCommand']>('runCommand').and.resolveTo({ logs: [] }),
    stat: jasmine.createSpy<Host['stat']>('stat'),
    existsSync: jasmine.createSpy<Host['existsSync']>('existsSync'),
    spawn: jasmine.createSpy<Host['spawn']>('spawn'),
    getAvailablePort: jasmine
      .createSpy<Host['getAvailablePort']>('getAvailablePort')
      .and.resolveTo(0),
  } as unknown as MockHost;
}

/**
 * Options for configuring the mock MCP tool context.
 */
export interface MockContextOptions {
  /** An optional pre-configured mock host. If not provided, a default mock host will be created. */
  host?: MockHost;

  /** Initial set of projects to populate the mock workspace with. */
  projects?: Record<string, workspaces.ProjectDefinition>;
}

/**
 * Creates a comprehensive mock for the McpToolContext, including a mock Host,
 * an AngularWorkspace, and a ProjectDefinitionCollection. This simplifies testing
 * MCP tools by providing a consistent and configurable testing environment.
 * @param options Configuration options for the mock context.
 * @returns An object containing the mock host, context, projects collection, and workspace instance.
 */
export function createMockContext(options: MockContextOptions = {}): {
  host: MockHost;
  context: McpToolContext;
  projects: workspaces.ProjectDefinitionCollection;
  workspace: AngularWorkspace;
} {
  const host = options.host ?? createMockHost();
  const projects = new workspaces.ProjectDefinitionCollection(options.projects);
  const workspace = new AngularWorkspace({ projects, extensions: {} }, '/test/angular.json');

  const context: McpToolContext = {
    server: {} as unknown as McpServer,
    workspace,
    logger: { warn: () => {} },
    devservers: new Map<string, Devserver>(),
    host,
  };

  return { host, context, projects, workspace };
}

/**
 * Adds a project to the provided mock ProjectDefinitionCollection.
 * This is a helper function to easily populate a mock Angular workspace.
 * @param projects The ProjectDefinitionCollection to add the project to.
 * @param name The name of the project.
 * @param targets A record of target definitions for the project (e.g., build, test, e2e).
 * @param root The root path of the project, relative to the workspace root. Defaults to `projects/${name}`.
 */
export function addProjectToWorkspace(
  projects: workspaces.ProjectDefinitionCollection,
  name: string,
  targets: Record<string, workspaces.TargetDefinition> = {},
  root = `projects/${name}`,
) {
  projects.set(name, {
    root,
    extensions: {},
    targets: new workspaces.TargetDefinitionCollection(targets),
  });
}
