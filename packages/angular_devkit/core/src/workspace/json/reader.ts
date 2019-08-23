/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstKeyValue,
  JsonAstNode,
  JsonAstObject,
  JsonParseMode,
  JsonValue,
  parseJsonAst,
} from '../../json';
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
import { createVirtualAstObject, escapeKey } from './utilities';

interface ParserContext {
  readonly host: WorkspaceHost;
  readonly metadata: JsonWorkspaceMetadata;
  readonly trackChanges: boolean;
  error(message: string, node: JsonAstNode | JsonAstKeyValue): void;
  warn(message: string, node: JsonAstNode | JsonAstKeyValue): void;
}

export async function readJsonWorkspace(
  path: string,
  host: WorkspaceHost,
): Promise<WorkspaceDefinition> {
  const raw = await host.readFile(path);

  if (raw === undefined) {
    throw new Error('Unable to read workspace file.');
  }

  const ast = parseJsonAst(raw, JsonParseMode.Loose);
  if (ast.kind !== 'object') {
    throw new Error('Invalid workspace file - expected JSON object.');
  }

  // Version check
  const versionNode = ast.properties.find(pair => pair.key.value === 'version');
  if (!versionNode) {
    throw new Error('Unknown format - version specifier not found.');
  }
  const formatVersion = versionNode.value.value;
  if (formatVersion !== 1) {
    throw new Error(`Invalid format version detected - Expected:[ 1 ] Found: [ ${formatVersion} ]`);
  }

  const context: ParserContext = {
    host,
    metadata: new JsonWorkspaceMetadata(path, ast, raw),
    trackChanges: true,
    error(message, _node) {
      // TODO: Diagnostic reporting support
      throw new Error(message);
    },
    warn(_message, _node) {
      // TODO: Diagnostic reporting support
    },
  };

  const workspace = parseWorkspace(ast, context);

  return workspace;
}

const specialWorkspaceExtensions = ['cli', 'defaultProject', 'newProjectRoot', 'schematics'];

const specialProjectExtensions = ['cli', 'schematics', 'projectType'];

function parseWorkspace(workspaceNode: JsonAstObject, context: ParserContext): WorkspaceDefinition {
  const jsonMetadata = context.metadata;
  let projects;
  let projectsNode: JsonAstObject | undefined;
  let extensions: Record<string, JsonValue> | undefined;
  if (!context.trackChanges) {
    extensions = Object.create(null);
  }

  for (const { key, value } of workspaceNode.properties) {
    const name = key.value;

    if (name === '$schema' || name === 'version') {
      // skip
    } else if (name === 'projects') {
      if (value.kind !== 'object') {
        context.error('Invalid "projects" field found; expected an object.', value);
        continue;
      }

      projectsNode = value;
      projects = parseProjectsObject(value, context);
    } else {
      if (!specialWorkspaceExtensions.includes(name) && !/^[a-z]{1,3}-.*/.test(name)) {
        context.warn(`Project extension with invalid name found.`, key);
      }
      if (extensions) {
        extensions[name] = value.value;
      }
    }
  }

  let collectionListener: DefinitionCollectionListener<ProjectDefinition> | undefined;
  if (context.trackChanges && projectsNode) {
    const parentNode = projectsNode;
    collectionListener = (name, action, newValue) => {
      jsonMetadata.addChange(
        action,
        `/projects/${escapeKey(name)}`,
        parentNode,
        newValue,
        'project',
      );
    };
  }

  const projectCollection = new ProjectDefinitionCollection(projects, collectionListener);

  return {
    [JsonWorkspaceSymbol]: jsonMetadata,
    projects: projectCollection,
    // If not tracking changes the `extensions` variable will contain the parsed
    // values.  Otherwise the extensions are tracked via a virtual AST object.
    extensions:
      extensions ||
      createVirtualAstObject(workspaceNode, {
        exclude: ['$schema', 'version', 'projects'],
        listener(op, path, node, value) {
          jsonMetadata.addChange(op, path, node, value);
        },
      }),
  } as WorkspaceDefinition;
}

function parseProjectsObject(
  projectsNode: JsonAstObject,
  context: ParserContext,
): Record<string, ProjectDefinition> {
  const projects: Record<string, ProjectDefinition> = Object.create(null);

  for (const { key, value } of projectsNode.properties) {
    if (value.kind !== 'object') {
      context.warn('Skipping invalid project value; expected an object.', value);
      continue;
    }

    const name = key.value;
    projects[name] = parseProject(name, value, context);
  }

  return projects;
}

function parseProject(
  projectName: string,
  projectNode: JsonAstObject,
  context: ParserContext,
): ProjectDefinition {
  const jsonMetadata = context.metadata;
  let targets;
  let targetsNode: JsonAstObject | undefined;
  let extensions: Record<string, JsonValue> | undefined;
  let properties: Record<'root' | 'sourceRoot' | 'prefix', string> | undefined;
  if (!context.trackChanges) {
    // If not tracking changes, the parser will store the values directly in standard objects
    extensions = Object.create(null);
    properties = Object.create(null);
  }

  for (const { key, value } of projectNode.properties) {
    const name = key.value;
    switch (name) {
      case 'targets':
      case 'architect':
        if (value.kind !== 'object') {
          context.error(`Invalid "${name}" field found; expected an object.`, value);
          break;
        }
        targetsNode = value;
        targets = parseTargetsObject(projectName, value, context);
        break;
      case 'prefix':
      case 'root':
      case 'sourceRoot':
        if (value.kind !== 'string') {
          context.warn(`Project property "${name}" should be a string.`, value);
        }
        if (properties) {
          properties[name] = value.value as string;
        }
        break;
      default:
        if (!specialProjectExtensions.includes(name) && !/^[a-z]{1,3}-.*/.test(name)) {
          context.warn(`Project extension with invalid name found.`, key);
        }
        if (extensions) {
          extensions[name] = value.value;
        }
        break;
    }
  }

  let collectionListener: DefinitionCollectionListener<TargetDefinition> | undefined;
  if (context.trackChanges) {
    if (targetsNode) {
      const parentNode = targetsNode;
      collectionListener = (name, action, newValue) => {
        jsonMetadata.addChange(
          action,
          `/projects/${projectName}/targets/${escapeKey(name)}`,
          parentNode,
          newValue,
          'target',
        );
      };
    } else {
      let added = false;
      collectionListener = (_name, action, _new, _old, collection) => {
        if (added || action !== 'add') {
          return;
        }

        jsonMetadata.addChange(
          'add',
          `/projects/${projectName}/targets`,
          projectNode,
          collection,
          'targetcollection',
        );
        added = true;
      };
    }
  }

  const base = {
    targets: new TargetDefinitionCollection(targets, collectionListener),
    // If not tracking changes the `extensions` variable will contain the parsed
    // values.  Otherwise the extensions are tracked via a virtual AST object.
    extensions:
      extensions ||
      createVirtualAstObject(projectNode, {
        exclude: ['architect', 'prefix', 'root', 'sourceRoot', 'targets'],
        listener(op, path, node, value) {
          jsonMetadata.addChange(op, `/projects/${projectName}${path}`, node, value);
        },
      }),
  };

  let project: ProjectDefinition;
  if (context.trackChanges) {
    project = createVirtualAstObject<ProjectDefinition>(projectNode, {
      base,
      include: ['prefix', 'root', 'sourceRoot'],
      listener(op, path, node, value) {
        jsonMetadata.addChange(op, `/projects/${projectName}${path}`, node, value);
      },
    });
  } else {
    project = {
      ...base,
      ...properties,
    } as ProjectDefinition;
  }

  return project;
}

function parseTargetsObject(
  projectName: string,
  targetsNode: JsonAstObject,
  context: ParserContext,
): Record<string, TargetDefinition> {
  const jsonMetadata = context.metadata;
  const targets: Record<string, TargetDefinition> = Object.create(null);

  for (const { key, value } of targetsNode.properties) {
    if (value.kind !== 'object') {
      context.warn('Skipping invalid target value; expected an object.', value);
      continue;
    }

    const name = key.value;
    if (context.trackChanges) {
      targets[name] = createVirtualAstObject<TargetDefinition>(value, {
        include: [ 'builder', 'options', 'configurations' ],
        listener(op, path, node, value) {
          jsonMetadata.addChange(
            op,
            `/projects/${projectName}/targets/${name}${path}`,
            node,
            value,
          );
        },
      });
    } else {
      targets[name] = value.value as unknown as TargetDefinition;
    }
  }

  return targets;
}
