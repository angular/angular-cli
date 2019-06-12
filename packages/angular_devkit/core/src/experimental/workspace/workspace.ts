/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { existsSync } from 'fs';
import * as path from 'path';
import { Observable, of, throwError } from 'rxjs';
import { concatMap, first, map, tap } from 'rxjs/operators';
import { BaseException } from '../../exception';
import {
  JsonObject,
  JsonParseMode,
  parseJson,
  schema,
} from '../../json';
import { SchemaValidatorResult } from '../../json/schema/interface';
import {
  Path,
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  virtualFs,
} from '../../virtual-fs';
import { WorkspaceProject, WorkspaceSchema, WorkspaceTool } from './workspace-schema';


export class WorkspaceFileNotFoundException extends BaseException {
  constructor(path: Path) {
    super(`Workspace could not be found from path ${path}.`);
  }
}

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

export class AmbiguousProjectPathException extends BaseException {
  constructor(public readonly path: Path, public readonly projects: ReadonlyArray<string>) {
    super(`Current active project is ambiguous (${projects.join(',')}) using path: '${path}'`);
  }
}

async function _findUp(host: virtualFs.Host, names: string[], from: Path): Promise<Path | null> {
  if (!Array.isArray(names)) {
    names = [names];
  }

  do {
    for (const name of names) {
      const p = join(from, name);
      if (await host.exists(p).toPromise()) {
        return p;
      }
    }

    from = dirname(from);
  } while (from && from !== dirname(from));

  return null;
}

export class Workspace {
  protected static _workspaceFileNames = [
    'angular.json',
    '.angular.json',
  ];

  private readonly _workspaceSchemaPath = normalize(require.resolve('./workspace-schema.json'));
  private _workspaceSchema: JsonObject;
  private _workspace: WorkspaceSchema;
  private _registry: schema.CoreSchemaRegistry;

  constructor(
    private _root: Path,
    private _host: virtualFs.Host<{}>,
    registry?: schema.CoreSchemaRegistry,
  ) {
    if (registry) {
      this._registry = registry;
    } else {
      this._registry = new schema.CoreSchemaRegistry();
      this._registry.addPostTransform(schema.transforms.addUndefinedDefaults);
    }
  }

  static async findWorkspaceFile(host: virtualFs.Host<{}>, path: Path): Promise<Path | null> {
    return await _findUp(host, this._workspaceFileNames, path);
  }
  static async fromPath(
    host: virtualFs.Host<{}>,
    path: Path,
    registry: schema.CoreSchemaRegistry,
  ): Promise<Workspace> {
    const maybePath = await this.findWorkspaceFile(host, path);

    if (!maybePath) {
      throw new WorkspaceFileNotFoundException(path);
    }

    return new Workspace(dirname(maybePath), host, registry)
      .loadWorkspaceFromHost(basename(maybePath))
      .pipe(first())
      .toPromise();
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

    // Return only the project properties, and remove the tools.
    const workspaceProjectClone = {...workspaceProject};
    delete workspaceProjectClone['cli'];
    delete workspaceProjectClone['schematics'];
    delete workspaceProjectClone['architect'];
    delete workspaceProjectClone['targets'];

    return workspaceProjectClone;
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
      // Sort tuples by depth, with the deeper ones first. Since the first member is a path and
      // we filtered all invalid paths, the longest will be the deepest (and in case of equality
      // the sort is stable and the first declared project will win).
      .sort((a, b) => b[0].length - a[0].length);

    if (projects.length === 0) {
      return null;
    } else if (projects.length > 1) {
      const found = new Set<Path>();
      const sameRoots = projects.filter(v => {
        if (!found.has(v[0])) {
          found.add(v[0]);

          return false;
        }

        return true;
      });
      if (sameRoots.length > 0) {
        throw new AmbiguousProjectPathException(path, sameRoots.map(v => v[1]));
      }
    }

    return projects[0][1];
  }

  getCli() {
    return this._getTool('cli');
  }

  getSchematics() {
    return this._getTool('schematics');
  }

  getTargets() {
    return this._getTool('targets');
  }

  getProjectCli(projectName: string) {
    return this._getProjectTool(projectName, 'cli');
  }

  getProjectSchematics(projectName: string) {
    return this._getProjectTool(projectName, 'schematics');
  }

  getProjectTargets(projectName: string) {
    return this._getProjectTool(projectName, 'targets');
  }

  private _getTool(toolName: 'cli' | 'schematics' | 'targets'): WorkspaceTool {
    this._assertLoaded();

    let workspaceTool = this._workspace[toolName];

    // Try falling back to 'architect' if 'targets' is not there or is empty.
    if ((!workspaceTool || Object.keys(workspaceTool).length === 0)
        && toolName === 'targets'
        && this._workspace['architect']) {
      workspaceTool = this._workspace['architect'];
    }

    if (!workspaceTool) {
      throw new WorkspaceToolNotFoundException(toolName);
    }

    return workspaceTool;
  }

  private _getProjectTool(
    projectName: string, toolName: 'cli' | 'schematics' | 'targets',
  ): WorkspaceTool {
    this._assertLoaded();

    const workspaceProject = this._workspace.projects[projectName];

    if (!workspaceProject) {
      throw new ProjectNotFoundException(projectName);
    }

    let projectTool = workspaceProject[toolName];

    // Try falling back to 'architect' if 'targets' is not there or is empty.
    if ((!projectTool || Object.keys(projectTool).length === 0)
        && workspaceProject['architect']
        && toolName === 'targets') {
      projectTool = workspaceProject['architect'];
    }

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
      concatMap((validatorResult: SchemaValidatorResult) => {
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
