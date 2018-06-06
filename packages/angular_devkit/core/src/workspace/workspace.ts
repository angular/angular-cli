/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable, of, throwError } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import { BaseException } from '../exception';
import {
  JsonObject,
  JsonParseMode,
  parseJson,
  schema,
} from '../json';
import {
  Path,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  virtualFs,
} from '../virtual-fs';
import { WorkspaceProject, WorkspaceSchema, WorkspaceTool } from './workspace-schema';


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

export class WorkspaceNotYetLoadedException extends BaseException {
  constructor() { super(`Workspace needs to be loaded before it is used.`); }
}


export class Workspace {
  private readonly _workspaceSchemaPath = join(normalize(__dirname), 'workspace-schema.json');
  private _workspaceSchema: JsonObject;
  private _workspace: WorkspaceSchema;
  private _registry: schema.CoreSchemaRegistry;

  constructor(private _root: Path, private _host: virtualFs.Host<{}>) {
    this._registry = new schema.CoreSchemaRegistry();
  }

  loadWorkspaceFromJson(json: {}) {
    return this._loadWorkspaceSchema().pipe(
      concatMap((workspaceSchema) => this.validateAgainstSchema(json, workspaceSchema)),
      tap((validatedWorkspace: WorkspaceSchema) => this._workspace = validatedWorkspace),
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

  getDefaultProjectName(): string | null {
    this._assertLoaded();

    if (this._workspace.defaultProject) {
      // If there is a default project name, return it.
      return this._workspace.defaultProject;
    } else if (this.listProjectNames().length === 1) {
      // If there is only one project, return that one.
      return this.listProjectNames()[0];
    }

    // Otherwise return null.
    return null;
  }

  getProjectByPath(path: Path): string | null {
    this._assertLoaded();

    const projectNames = this.listProjectNames();
    if (projectNames.length === 1) {
      return projectNames[0];
    }

    const isInside = (base: Path, potential: Path): boolean => {
      const absoluteBase = resolve(this.root, base);
      const absolutePotential = resolve(this.root, potential);
      const relativePotential = relative(absoluteBase, absolutePotential);
      if (!relativePotential.startsWith('..') && !isAbsolute(relativePotential)) {
        return true;
      }

      return false;
    };

    const projects = this.listProjectNames()
      .map(name => [this.getProject(name).root, name] as [Path, string])
      .filter(tuple => isInside(tuple[0], path))
      // Sort tuples by depth, with the deeper ones first.
      .sort((a, b) => isInside(a[0], b[0]) ? 1 : 0);

    if (projects[0]) {
      return projects[0][1];
    }

    return null;
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
          return throwError(new schema.SchemaValidationException(validatorResult.errors));
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
