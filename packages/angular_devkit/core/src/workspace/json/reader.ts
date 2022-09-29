/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Node, findNodeAtLocation, getNodeValue, parseTree } from 'jsonc-parser';
import { JsonValue, isJsonObject } from '../../json/utils';
import {
  DefinitionCollectionListener,
  ProjectDefinition,
  ProjectDefinitionCollection,
  TargetDefinition,
  TargetDefinitionCollection,
  WorkspaceDefinition,
} from '../definitions';
import { WorkspaceHost } from '../host';
import { JsonWorkspaceMetadata, JsonWorkspaceSymbol } from './metadata';
import { createVirtualAstObject } from './utilities';

const ANGULAR_WORKSPACE_EXTENSIONS = Object.freeze([
  'cli',
  'defaultProject',
  'newProjectRoot',
  'schematics',
]);
const ANGULAR_PROJECT_EXTENSIONS = Object.freeze(['cli', 'schematics', 'projectType', 'i18n']);

interface ParserContext {
  readonly host: WorkspaceHost;
  readonly metadata: JsonWorkspaceMetadata;
  readonly trackChanges: boolean;
  readonly unprefixedWorkspaceExtensions: ReadonlySet<string>;
  readonly unprefixedProjectExtensions: ReadonlySet<string>;
  error(message: string, node: JsonValue): void;
  warn(message: string, node: JsonValue): void;
}

export interface JsonWorkspaceOptions {
  allowedProjectExtensions?: string[];
  allowedWorkspaceExtensions?: string[];
}

export async function readJsonWorkspace(
  path: string,
  host: WorkspaceHost,
  options: JsonWorkspaceOptions = {},
): Promise<WorkspaceDefinition> {
  const raw = await host.readFile(path);
  if (raw === undefined) {
    throw new Error('Unable to read workspace file.');
  }

  const ast = parseTree(raw, undefined, { allowTrailingComma: true, disallowComments: false });
  if (ast?.type !== 'object' || !ast.children) {
    throw new Error('Invalid workspace file - expected JSON object.');
  }

  // Version check
  const versionNode = findNodeAtLocation(ast, ['version']);
  if (!versionNode) {
    throw new Error('Unknown format - version specifier not found.');
  }
  const version = versionNode.value;
  if (version !== 1) {
    throw new Error(`Invalid format version detected - Expected:[ 1 ] Found: [ ${version} ]`);
  }

  const context: ParserContext = {
    host,
    metadata: new JsonWorkspaceMetadata(path, ast, raw),
    trackChanges: true,
    unprefixedWorkspaceExtensions: new Set([
      ...ANGULAR_WORKSPACE_EXTENSIONS,
      ...(options.allowedWorkspaceExtensions ?? []),
    ]),
    unprefixedProjectExtensions: new Set([
      ...ANGULAR_PROJECT_EXTENSIONS,
      ...(options.allowedProjectExtensions ?? []),
    ]),
    error(message, _node) {
      // TODO: Diagnostic reporting support
      throw new Error(message);
    },
    warn(message, _node) {
      // TODO: Diagnostic reporting support
      // eslint-disable-next-line no-console
      console.warn(message);
    },
  };

  const workspace = parseWorkspace(ast, context);

  return workspace;
}

function parseWorkspace(workspaceNode: Node, context: ParserContext): WorkspaceDefinition {
  const jsonMetadata = context.metadata;
  let projects;
  let extensions: Record<string, JsonValue> | undefined;
  if (!context.trackChanges) {
    extensions = Object.create(null);
  }

  // TODO: `getNodeValue` - looks potentially expensive since it walks the whole tree and instantiates the full object structure each time.
  // Might be something to look at moving forward to optimize.
  const workspaceNodeValue = getNodeValue(workspaceNode);
  for (const [name, value] of Object.entries<JsonValue>(workspaceNodeValue)) {
    if (name === '$schema' || name === 'version') {
      // skip
    } else if (name === 'projects') {
      const nodes = findNodeAtLocation(workspaceNode, ['projects']);
      if (!isJsonObject(value) || !nodes) {
        context.error('Invalid "projects" field found; expected an object.', value);
        continue;
      }

      projects = parseProjectsObject(nodes, context);
    } else {
      if (!context.unprefixedWorkspaceExtensions.has(name) && !/^[a-z]{1,3}-.*/.test(name)) {
        context.warn(`Workspace extension with invalid name (${name}) found.`, name);
      }
      if (extensions) {
        extensions[name] = value;
      }
    }
  }

  let collectionListener: DefinitionCollectionListener<ProjectDefinition> | undefined;
  if (context.trackChanges) {
    collectionListener = (name, newValue) => {
      jsonMetadata.addChange(['projects', name], newValue, 'project');
    };
  }

  const projectCollection = new ProjectDefinitionCollection(projects, collectionListener);

  return {
    [JsonWorkspaceSymbol]: jsonMetadata,
    projects: projectCollection,
    // If not tracking changes the `extensions` variable will contain the parsed
    // values.  Otherwise the extensions are tracked via a virtual AST object.
    extensions:
      extensions ??
      createVirtualAstObject(workspaceNodeValue, {
        exclude: ['$schema', 'version', 'projects'],
        listener(path, value) {
          jsonMetadata.addChange(path, value);
        },
      }),
  } as WorkspaceDefinition;
}

function parseProjectsObject(
  projectsNode: Node,
  context: ParserContext,
): Record<string, ProjectDefinition> {
  const projects: Record<string, ProjectDefinition> = Object.create(null);

  for (const [name, value] of Object.entries<JsonValue>(getNodeValue(projectsNode))) {
    const nodes = findNodeAtLocation(projectsNode, [name]);
    if (!isJsonObject(value) || !nodes) {
      context.warn('Skipping invalid project value; expected an object.', value);
      continue;
    }

    projects[name] = parseProject(name, nodes, context);
  }

  return projects;
}

function parseProject(
  projectName: string,
  projectNode: Node,
  context: ParserContext,
): ProjectDefinition {
  const jsonMetadata = context.metadata;
  let targets;
  let hasTargets = false;
  let extensions: Record<string, JsonValue> | undefined;
  let properties: Record<'root' | 'sourceRoot' | 'prefix', string> | undefined;
  if (!context.trackChanges) {
    // If not tracking changes, the parser will store the values directly in standard objects
    extensions = Object.create(null);
    properties = Object.create(null);
  }

  const projectNodeValue = getNodeValue(projectNode);
  if (!('root' in projectNodeValue)) {
    throw new Error(`Project "${projectName}" is missing a required property "root".`);
  }

  for (const [name, value] of Object.entries<JsonValue>(projectNodeValue)) {
    switch (name) {
      case 'targets':
      case 'architect':
        const nodes = findNodeAtLocation(projectNode, [name]);
        if (!isJsonObject(value) || !nodes) {
          context.error(`Invalid "${name}" field found; expected an object.`, value);
          break;
        }
        hasTargets = true;
        targets = parseTargetsObject(projectName, nodes, context);
        jsonMetadata.hasLegacyTargetsName = name === 'architect';
        break;
      case 'prefix':
      case 'root':
      case 'sourceRoot':
        if (typeof value !== 'string') {
          context.warn(`Project property "${name}" should be a string.`, value);
        }
        if (properties) {
          properties[name] = value as string;
        }
        break;
      default:
        if (!context.unprefixedProjectExtensions.has(name) && !/^[a-z]{1,3}-.*/.test(name)) {
          context.warn(
            `Project '${projectName}' contains extension with invalid name (${name}).`,
            name,
          );
        }
        if (extensions) {
          extensions[name] = value;
        }
        break;
    }
  }

  let collectionListener: DefinitionCollectionListener<TargetDefinition> | undefined;
  if (context.trackChanges) {
    collectionListener = (name, newValue, collection) => {
      if (hasTargets) {
        jsonMetadata.addChange(['projects', projectName, 'targets', name], newValue, 'target');
      } else {
        jsonMetadata.addChange(
          ['projects', projectName, 'targets'],
          collection,
          'targetcollection',
        );
      }
    };
  }

  const base = {
    targets: new TargetDefinitionCollection(targets, collectionListener),
    // If not tracking changes the `extensions` variable will contain the parsed
    // values.  Otherwise the extensions are tracked via a virtual AST object.
    extensions:
      extensions ??
      createVirtualAstObject(projectNodeValue, {
        exclude: ['architect', 'prefix', 'root', 'sourceRoot', 'targets'],
        listener(path, value) {
          jsonMetadata.addChange(['projects', projectName, ...path], value);
        },
      }),
  };

  const baseKeys = new Set(Object.keys(base));
  const project =
    properties ??
    createVirtualAstObject<ProjectDefinition>(projectNodeValue, {
      include: ['prefix', 'root', 'sourceRoot', ...baseKeys],
      listener(path, value) {
        if (!baseKeys.has(path[0])) {
          jsonMetadata.addChange(['projects', projectName, ...path], value);
        }
      },
    });

  return Object.assign(project, base) as ProjectDefinition;
}

function parseTargetsObject(
  projectName: string,
  targetsNode: Node,
  context: ParserContext,
): Record<string, TargetDefinition> {
  const jsonMetadata = context.metadata;
  const targets: Record<string, TargetDefinition> = Object.create(null);

  for (const [name, value] of Object.entries<JsonValue>(getNodeValue(targetsNode))) {
    if (!isJsonObject(value)) {
      context.warn('Skipping invalid target value; expected an object.', value);
      continue;
    }

    if (context.trackChanges) {
      targets[name] = createVirtualAstObject<TargetDefinition>(value, {
        include: ['builder', 'options', 'configurations', 'defaultConfiguration'],
        listener(path, value) {
          jsonMetadata.addChange(['projects', projectName, 'targets', name, ...path], value);
        },
      });
    } else {
      targets[name] = value as unknown as TargetDefinition;
    }
  }

  return targets;
}
