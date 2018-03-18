/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concatMap, map, tap } from 'rxjs/operators';
import {
  JsonObject,
  JsonParseMode,
  Path,
  join,
  normalize,
  parseJson,
  schema,
  virtualFs,
} from '..';
import { BaseException } from '../exception/exception';
// Note: importing BaseException from '..' seems to lead to odd circular dependency errors.
// TypeError: Class extends value undefined is not a constructor or null
// at Object.<anonymous> (<path>\packages\angular_devkit\core\src\workspace\workspace.ts:19:44)


export class ProjectNotFoundException extends BaseException {
  constructor(name: string) {
    super(`Project '${name}' could not be found in workspace.`);
  }
}

export class WorkspaceToolNotFoundException extends BaseException {
  constructor(name: string) {
    super(`Tool ${name} could not be found in workspace.`);
  }
}

export class ProjectToolNotFoundException extends BaseException {
  constructor(name: string) {
    super(`Tool ${name} could not be found in project.`);
  }
}

export class SchemaValidationException extends BaseException {
  constructor(errors: string[]) {
    super(`Schema validation failed with the following errors:\n  ${errors.join('\n  ')}`);
  }
}

export class WorkspaceNotYetLoadedException extends BaseException {
  constructor() { super(`Workspace needs to be loaded before it is used.`); }
}

export interface WorkspaceJson {
  version: number;
  // TODO: figure out if newProjectRoot should stay here.
  newProjectRoot: Path;
  cli: WorkspaceTool;
  schematics: WorkspaceTool;
  architect: WorkspaceTool;
  projects: { [k: string]: WorkspaceProject };
}

export interface WorkspaceProject {
  projectType: 'application' | 'library';
  root: Path;
  cli: WorkspaceTool;
  schematics: WorkspaceTool;
  architect: WorkspaceTool;
}

export interface WorkspaceTool extends JsonObject { }

export class Workspace {
  private readonly _workspaceSchemaPath = join(normalize(__dirname), 'workspace-schema.json');
  private _workspaceSchema: JsonObject;
  private _workspace: WorkspaceJson;
  private _registry: schema.CoreSchemaRegistry;

  constructor(private _root: Path, private _host: virtualFs.Host<{}>) {
    this._registry = new schema.CoreSchemaRegistry();
  }

  loadWorkspaceFromJson(json: {}) {
    return this._loadWorkspaceSchema().pipe(
      concatMap((workspaceSchema) => this.validateAgainstSchema(json, workspaceSchema)),
      tap((validatedWorkspace: WorkspaceJson) => this._workspace = validatedWorkspace),
      map(() => this),
    );
  }

  loadWorkspaceFromHost(workspacePath: Path) {
    return this._loadWorkspaceSchema().pipe(
      concatMap(() => this._loadJsonFile(join(this._root, workspacePath))),
      concatMap(json => this.loadWorkspaceFromJson(json)),
    );
  }

  private _loadWorkspaceSchema() {
    if (this._workspaceSchema) {
      return of(this._workspaceSchema);
    } else {
      return this._loadJsonFile(this._workspaceSchemaPath).pipe(
        tap((workspaceSchema) => this._workspaceSchema = workspaceSchema),
      );
    }
  }

  private _assertLoaded() {
    if (!this._workspace) {
      throw new WorkspaceNotYetLoadedException();
    }
  }

  get root() {
    return this._root;
  }

  get host() {
    return this._host;
  }

  get version() {
    this._assertLoaded();

    return this._workspace.version;
  }

  get newProjectRoot() {
    this._assertLoaded();

    return this._workspace.newProjectRoot;
  }

  listProjectNames(): string[] {
    return Object.keys(this._workspace.projects);
  }

  getProject(projectName: string): WorkspaceProject {
    this._assertLoaded();

    const workspaceProject = this._workspace.projects[projectName];

    if (!workspaceProject) {
      throw new ProjectNotFoundException(projectName);
    }

    return {
      ...workspaceProject,
      // Return only the project properties, and remove the tools.
      cli: {},
      schematics: {},
      architect: {},
    };
  }

  getCli() {
    return this._getTool('cli');
  }

  getSchematics() {
    return this._getTool('schematics');
  }

  getArchitect() {
    return this._getTool('architect');
  }

  getProjectCli(projectName: string) {
    return this._getProjectTool(projectName, 'cli');
  }

  getProjectSchematics(projectName: string) {
    return this._getProjectTool(projectName, 'schematics');
  }

  getProjectArchitect(projectName: string) {
    return this._getProjectTool(projectName, 'architect');
  }

  private _getTool(toolName: 'cli' | 'schematics' | 'architect'): WorkspaceTool {
    this._assertLoaded();

    const workspaceTool = this._workspace[toolName];

    if (!workspaceTool) {
      throw new WorkspaceToolNotFoundException(toolName);
    }

    return workspaceTool;
  }

  private _getProjectTool(
    projectName: string, toolName: 'cli' | 'schematics' | 'architect',
  ): WorkspaceTool {
    this._assertLoaded();

    const workspaceProject = this._workspace.projects[projectName];

    if (!workspaceProject) {
      throw new ProjectNotFoundException(projectName);
    }

    const projectTool = workspaceProject[toolName];

    if (!projectTool) {
      throw new ProjectToolNotFoundException(toolName);
    }

    return projectTool;
  }

  // TODO: add transforms to resolve paths.
  validateAgainstSchema<T = {}>(contentJson: {}, schemaJson: JsonObject): Observable<T> {
    // JSON validation modifies the content, so we validate a copy of it instead.
    const contentJsonCopy = JSON.parse(JSON.stringify(contentJson));

    return this._registry.compile(schemaJson).pipe(
      concatMap(validator => validator(contentJsonCopy)),
      concatMap(validatorResult => {
        if (validatorResult.success) {
          return of(contentJsonCopy as T);
        } else {
          return _throw(new SchemaValidationException(validatorResult.errors as string[]));
        }
      }),
    );
  }

  private _loadJsonFile(path: Path): Observable<JsonObject> {
    return this._host.read(normalize(path)).pipe(
      map(buffer => virtualFs.fileBufferToString(buffer)),
      map(str => parseJson(str, JsonParseMode.Loose) as {} as JsonObject),
    );
  }
}
