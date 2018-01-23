import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
import { getAppFromConfig } from '../utilities/app-utils';
import { join } from 'path';
import { RenderUniversalTaskOptions } from '../tasks/render-universal';

const Command = require('../ember-cli/lib/models/command');
const SilentError = require('silent-error');

// defaults for BuildOptions
export const baseBuildCommandOptions: any = [];

export interface BuildTaskOptions extends BuildOptions {
  statsJson?: boolean;
}

const BuildCommand = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: [],

  run: function (commandOptions: BuildTaskOptions) {
    // Check Angular and TypeScript versions.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);

    // Add trailing slash if missing to prevent https://github.com/angular/angular-cli/issues/7295
    if (commandOptions.deployUrl && commandOptions.deployUrl.substr(-1) !== '/') {
      commandOptions.deployUrl += '/';
    }

    const BuildTask = require('../tasks/build').default;

    const buildTask = new BuildTask({
      project: this.project,
      ui: this.ui,
    });

    const clientApp = getAppFromConfig(commandOptions.app);

    const doAppShell = commandOptions.target === 'production' &&
      (commandOptions.aot === undefined || commandOptions.aot === true) &&
      !commandOptions.skipAppShell;

    let serverApp: any = null;
    if (clientApp.appShell && doAppShell) {
      serverApp = getAppFromConfig(clientApp.appShell.app);
      if (serverApp.platform !== 'server') {
        throw new SilentError(`Shell app's platform is not "server"`);
      }
    }

    const buildPromise = buildTask.run(commandOptions);

    if (!clientApp.appShell || !doAppShell) {
      return buildPromise;
    }

    return buildPromise
      .then(() => {

        const serverOptions = {
          ...commandOptions,
          app: clientApp.appShell.app
        };
        return buildTask.run(serverOptions);
      })
      .then(() => {
        const RenderUniversalTask = require('../tasks/render-universal').default;

        const renderUniversalTask = new RenderUniversalTask({
          project: this.project,
          ui: this.ui,
        });
        const renderUniversalOptions: RenderUniversalTaskOptions = {
          inputIndexPath: join(this.project.root, clientApp.outDir, clientApp.index),
          route: clientApp.appShell.route,
          serverOutDir: join(this.project.root, serverApp.outDir),
          outputIndexPath: join(this.project.root, clientApp.outDir, clientApp.index)
        };

        return renderUniversalTask.run(renderUniversalOptions);
      });
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
