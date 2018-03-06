import { normalize } from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import { Architect } from '@angular-devkit/architect';
import { concatMap } from 'rxjs/operators';

import { E2eTaskOptions } from '../commands/e2e';
import { getAppFromConfig } from '../utilities/app-utils';
import { CliConfig } from '../models/config';
import {
  createArchitectWorkspace,
  getProjectName,
  convertOptions,
} from '../utilities/build-webpack-compat';

const Task = require('../ember-cli/lib/models/task');


export const E2eTask = Task.extend({
  run: function (options: E2eTaskOptions) {
    const config = CliConfig.fromProject().config;
    const app = getAppFromConfig(options.app);

    const host = new NodeJsSyncHost();
    const logger = createConsoleLogger();
    const architect = new Architect(normalize(this.project.root), host);

    const workspaceConfig = createArchitectWorkspace(config);
    const project = getProjectName(app, options.app);
    const overrides: any = convertOptions({ ...options });
    const targetOptions = {
      project,
      target: 'protractor',
      overrides
    };
    const context = { logger };

    return architect.loadWorkspaceFromJson(workspaceConfig).pipe(
      concatMap(() => architect.run(architect.getTarget(targetOptions), context)),
    ).toPromise().then(buildEvent => {
      if (buildEvent.success === false) {
        return Promise.reject('Build failed');
      }
    });
  }
});
