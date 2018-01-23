import { normalize } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { Architect, BuildEvent } from '@angular-devkit/architect';
import { concatMap } from 'rxjs/operators';
import { CliConfig } from '../models/config';
import { getAppFromConfig } from '../utilities/app-utils';
import {
  createArchitectWorkspace,
  getProjectName,
  convertOptions,
} from './build-webpack-compat';
import { Observable } from 'rxjs/Observable';

export function runTarget(root: string, target: string, options: any): Observable<BuildEvent> {

  // We assume the default build-webpack package, so we need to add it here for the dep checker.
  // require('@angular-devkit/build-webpack')
  const host = new NodeJsSyncHost();
  const logger = createConsoleLogger();
  const cliConfig = CliConfig.fromProject().config;
  const architect = new Architect(normalize(root), host);

  const app = getAppFromConfig(options.app);
  const workspaceConfig = createArchitectWorkspace(cliConfig);
  const project = getProjectName(app, options.app);
  const overrides: any = convertOptions({ ...options });
  const targetOptions = { project, target, overrides };
  const context = { logger };

  return architect.loadWorkspaceFromJson(workspaceConfig).pipe(
    concatMap(() => architect.run(architect.getTarget(targetOptions), context)),
  );
}

export interface RunOptions {
  root: string;
  app: string;
  target: string;
  configuration?: string;
  overrides?: object;
}

export function run(options: RunOptions) {
  const {root, app, target, configuration, overrides} = options;

  const host = new NodeJsSyncHost();
  const logger = createConsoleLogger();
  const cliConfig = CliConfig.fromProject().config;
  const architect = new Architect(normalize(root), host);

  const appConfig = getAppFromConfig(app);
  const workspaceConfig = createArchitectWorkspace(cliConfig);
  const project = getProjectName(appConfig, app);
  const convertOverrides: any = convertOptions({ ...overrides });
  const context = { logger };

  const targetOptions = {
    project,
    target,
    configuration,
    overrides: convertOverrides
  };

  return architect.loadWorkspaceFromJson(workspaceConfig).pipe(
    concatMap(() => architect.run(architect.getTarget(targetOptions), context)),
  );
}
