/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { applyEdits, modify } from 'jsonc-parser';
import { JsonObject, JsonValue } from '../../json';
import { ProjectDefinition, TargetDefinition, WorkspaceDefinition } from '../definitions';
import { WorkspaceHost } from '../host';
import {
  JsonChange,
  JsonWorkspaceDefinition,
  JsonWorkspaceMetadata,
  JsonWorkspaceSymbol,
} from './metadata';

export async function writeJsonWorkspace(
  workspace: WorkspaceDefinition,
  host: WorkspaceHost,
  path?: string,
  options: {
    schema?: string;
  } = {},
): Promise<void> {
  const metadata = (workspace as JsonWorkspaceDefinition)[JsonWorkspaceSymbol];

  if (metadata) {
    if (!metadata.hasChanges) {
      return;
    }
    // update existing JSON workspace
    const data = updateJsonWorkspace(metadata);

    return host.writeFile(path ?? metadata.filePath, data);
  } else {
    // serialize directly
    if (!path) {
      throw new Error('path option is required');
    }

    const obj = convertJsonWorkspace(workspace, options.schema);
    const data = JSON.stringify(obj, null, 2);

    return host.writeFile(path, data);
  }
}

function convertJsonWorkspace(workspace: WorkspaceDefinition, schema?: string): JsonObject {
  const obj = {
    $schema: schema || './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    ...workspace.extensions,
    ...(isEmpty(workspace.projects)
      ? {}
      : { projects: convertJsonProjectCollection(workspace.projects) }),
  };

  return obj;
}

function convertJsonProjectCollection(
  collection: Iterable<[string, ProjectDefinition]>,
): JsonObject {
  const projects = Object.create(null) as JsonObject;

  for (const [projectName, project] of collection) {
    projects[projectName] = convertJsonProject(project);
  }

  return projects;
}

function convertJsonProject(project: ProjectDefinition): JsonObject {
  let targets: JsonObject | undefined;
  if (project.targets.size > 0) {
    targets = Object.create(null) as JsonObject;
    for (const [targetName, target] of project.targets) {
      targets[targetName] = convertJsonTarget(target);
    }
  }

  const obj = {
    ...project.extensions,
    root: project.root,
    ...(project.sourceRoot === undefined ? {} : { sourceRoot: project.sourceRoot }),
    ...(project.prefix === undefined ? {} : { prefix: project.prefix }),
    ...(targets === undefined ? {} : { architect: targets }),
  };

  return obj;
}

function isEmpty(obj: object | undefined): boolean {
  return obj === undefined || Object.keys(obj).length === 0;
}

function convertJsonTarget(target: TargetDefinition): JsonObject {
  return {
    builder: target.builder,
    ...(isEmpty(target.options) ? {} : { options: target.options as JsonObject }),
    ...(isEmpty(target.configurations)
      ? {}
      : { configurations: target.configurations as JsonObject }),
    ...(target.defaultConfiguration === undefined
      ? {}
      : { defaultConfiguration: target.defaultConfiguration }),
  };
}

function convertJsonTargetCollection(collection: Iterable<[string, TargetDefinition]>): JsonObject {
  const targets = Object.create(null) as JsonObject;

  for (const [projectName, target] of collection) {
    targets[projectName] = convertJsonTarget(target);
  }

  return targets;
}

function normalizeValue(
  value: JsonChange['value'] | undefined,
  type: JsonChange['type'],
): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  switch (type) {
    case 'project':
      return convertJsonProject(value as ProjectDefinition);
    case 'projectcollection':
      const projects = convertJsonProjectCollection(value as Iterable<[string, ProjectDefinition]>);

      return isEmpty(projects) ? undefined : projects;
    case 'target':
      return convertJsonTarget(value as TargetDefinition);
    case 'targetcollection':
      const targets = convertJsonTargetCollection(value as Iterable<[string, TargetDefinition]>);

      return isEmpty(targets) ? undefined : targets;
    default:
      return value as JsonValue;
  }
}

function updateJsonWorkspace(metadata: JsonWorkspaceMetadata): string {
  let { raw: content } = metadata;
  const { changes, hasLegacyTargetsName } = metadata;

  for (const { jsonPath, value, type } of changes.values()) {
    // Determine which key to use if (architect or targets)
    if (hasLegacyTargetsName && jsonPath[2] === 'targets') {
      jsonPath[2] = 'architect';
    }

    // modify
    const newJsonPath = jsonPath.map((v) => (isFinite(+v) ? +v : v));
    // TODO: `modify` re-parses the content every time.
    // See: https://github.com/microsoft/node-jsonc-parser/blob/35d94cd71bd48f9784453b2439262c938e21d49b/src/impl/edit.ts#L18
    // Ideally this should accept a string or an AST to avoid the potentially expensive repeat parsing operation.
    const edits = modify(content, newJsonPath, normalizeValue(value, type), {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
      },
    });

    content = applyEdits(content, edits);
  }

  return content;
}
