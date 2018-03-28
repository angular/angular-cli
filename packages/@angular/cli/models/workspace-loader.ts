import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { concatMap, tap } from 'rxjs/operators';
import * as fs from 'fs';
import { homedir } from 'os';
import { findUp } from '../utilities/find-up';

// devkit/local bridge types and imports.
import {
  Path as PathT,
  experimental as experimentalT,
  virtualFs as virtualFsT
} from '@angular-devkit/core';
import { core } from '../utilities/devkit-local-bridge';
const { basename, experimental, dirname, join, normalize } = core;


// TODO: error out instead of returning null when workspace cannot be found.
export class WorkspaceLoader {
  private _workspaceCacheMap = new Map<string, experimentalT.workspace.Workspace>();
  // TODO: add remaining fallbacks.
  private _configFileNames = [
    normalize('.angular.json'),
    normalize('angular.json'),
  ];
  constructor(private _host: virtualFsT.Host) { }

  loadGlobalWorkspace(): Observable<experimentalT.workspace.Workspace | null> {
    return this._getGlobalWorkspaceFilePath().pipe(
      concatMap(globalWorkspacePath => this._loadWorkspaceFromPath(globalWorkspacePath))
    );
  }

  loadWorkspace(): Observable<experimentalT.workspace.Workspace | null> {
    return this._getProjectWorkspaceFilePath().pipe(
      concatMap(globalWorkspacePath => this._loadWorkspaceFromPath(globalWorkspacePath))
    );
  }

  // TODO: do this with the host instead of fs.
  private _getProjectWorkspaceFilePath(projectPath?: string): Observable<PathT | null> {
    // Find the workspace file, either where specified, in the Angular CLI project
    // (if it's in node_modules) or from the current process.
    const workspaceFilePath = (projectPath && findUp(this._configFileNames, projectPath))
      || findUp(this._configFileNames, process.cwd())
      || findUp(this._configFileNames, __dirname);

    if (workspaceFilePath) {
      return of(normalize(workspaceFilePath));
    } else {
      return of(null);
    }
  }

  // TODO: do this with the host instead of fs.
  private _getGlobalWorkspaceFilePath(): Observable<PathT | null> {
    for (const fileName of this._configFileNames) {
      const workspaceFilePath = join(normalize(homedir()), fileName);

      if (fs.existsSync(workspaceFilePath)) {
        return of(normalize(workspaceFilePath));
      }
    }

    return of(null);
  }

  private _loadWorkspaceFromPath(workspacePath: PathT) {
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
}
