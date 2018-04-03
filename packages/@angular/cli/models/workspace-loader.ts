import {
  Path,
  basename,
  experimental,
  dirname,
  join,
  normalize,
  virtualFs
} from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import * as fs from 'fs';
import { homedir } from 'os';
import { stripIndent } from 'common-tags';
import { findUp } from '../utilities/find-up';


// TODO: error out instead of returning null when workspace cannot be found.
export class WorkspaceLoader {
  private _workspaceCacheMap = new Map<string, experimental.workspace.Workspace>();
  // TODO: add remaining fallbacks.
  private _configFileNames = [
    normalize('.angular.json'),
    normalize('angular.json'),
  ];
  constructor(private _host: virtualFs.Host) { }

  loadGlobalWorkspace(): Observable<experimental.workspace.Workspace | null> {
    return this._getGlobalWorkspaceFilePath().pipe(
      concatMap(globalWorkspacePath => this._loadWorkspaceFromPath(globalWorkspacePath))
    );
  }

  loadWorkspace(): Observable<experimental.workspace.Workspace | null> {
    return this._getProjectWorkspaceFilePath().pipe(
      concatMap(globalWorkspacePath => this._loadWorkspaceFromPath(globalWorkspacePath))
    );
  }

  // TODO: do this with the host instead of fs.
  private _getProjectWorkspaceFilePath(projectPath?: string): Observable<Path | null> {
    this._assertUpdatedWorkspace(projectPath);
    // Find the workspace file, either where specified, in the Angular CLI project
    // (if it's in node_modules) or from the current process.
    const workspaceFilePath = (projectPath && findUp(this._configFileNames, projectPath))
      || findUp(this._configFileNames, process.cwd())
      || findUp(this._configFileNames, __dirname);

    if (workspaceFilePath) {
      return of(normalize(workspaceFilePath));
    } else {
      throw new Error(`Local workspace file ('angular.json') could not be found.`);
    }
  }

  // TODO: do this with the host instead of fs.
  private _getGlobalWorkspaceFilePath(): Observable<Path | null> {
    for (const fileName of this._configFileNames) {
      const workspaceFilePath = join(normalize(homedir()), fileName);

      if (fs.existsSync(workspaceFilePath)) {
        return of(normalize(workspaceFilePath));
      }
    }

    return of(null);
  }

  private _loadWorkspaceFromPath(workspacePath: Path) {
    if (!workspacePath) {
      return of(null);
    }

    if (this._workspaceCacheMap.has(workspacePath)) {
      return of(this._workspaceCacheMap.get(workspacePath));
    }

    const workspaceRoot = dirname(workspacePath);
    const workspaceFileName = basename(workspacePath);
    const workspace = new experimental.workspace.Workspace(workspaceRoot, this._host);

    return workspace.loadWorkspaceFromHost(workspaceFileName).pipe(
      tap(workspace => this._workspaceCacheMap.set(workspacePath, workspace))
    );
  }

  private _assertUpdatedWorkspace(projectPath?: string) {
    const oldConfigFileNames = [
      normalize('.angular-cli.json'),
      normalize('angular-cli.json'),
    ];

    const oldConfigFilePath = (projectPath && findUp(oldConfigFileNames, projectPath))
      || findUp(oldConfigFileNames, process.cwd())
      || findUp(oldConfigFileNames, __dirname);

    if (oldConfigFilePath) {
      throw new Error(stripIndent`
        An old project has been detected, which needs to be updated to Angular CLI 6.

        Please run the following commands to update this project.

          ng update @angular/cli --migrate-only --from=1.7.1
          npm i
      `);
    }
  }
}
