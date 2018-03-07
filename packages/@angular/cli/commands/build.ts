import { ArchitectCommand } from '../models/architect-command';
import { Option, CommandScope } from '../models/command';
// import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
// import { getAppFromConfig } from '../utilities/app-utils';
// import { join } from 'path';
// import { RenderUniversalTaskOptions } from '../tasks/render-universal';
// import { run as runArchitect } from '../utilities/architect';

// const SilentError = require('silent-error');

export interface RunOptions {
  app?: string;
  prod: boolean;
}

export default class BuildCommand extends ArchitectCommand {
  public readonly name = 'build';
  public readonly target = 'browser';
  public readonly description =
    'Builds your app and places it into the output path (dist/ by default).';
  public static aliases = ['b'];
  public scope = CommandScope.inProject;
  public arguments: string[];
  public options: Option[] = [this.prodOption];

  public validate(_options: RunOptions) {
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return true;
  }

  public async run(options: RunOptions) {
    let configuration;
    if (options.prod) {
      configuration = 'production';
    }
    const overrides = {...options};
    delete overrides.app;
    delete overrides.prod;
    return this.runArchitect({
      app: options.app,
      configuration,
      overrides
    });
    // Add trailing slash if missing to prevent https://github.com/angular/angular-cli/issues/7295
    // if (options.deployUrl && options.deployUrl.substr(-1) !== '/') {
    //   options.deployUrl += '/';
    // }

    // const BuildTask = require('../tasks/build').default;

    // const buildTask = new BuildTask({
    //   project: this.project,
    //   ui: this.ui,
    // });

    // const clientApp = getAppFromConfig(options.app);

    // const doAppShell = options.target === 'production' &&
    //   (options.aot === undefined || options.aot === true) &&
    //   !options.skipAppShell;

    // let serverApp: any = null;
    // if (clientApp.appShell && doAppShell) {
    //   serverApp = getAppFromConfig(clientApp.appShell.app);
    //   if (serverApp.platform !== 'server') {
    //     throw new SilentError(`Shell app's platform is not "server"`);
    //   }
    // }

    // // const buildTaskResult = await buildTask.run(options);
    // const buildTaskResult = await this.runArchitect({project: options.project});
    // if (!clientApp.appShell || !doAppShell) {
    //   return buildTaskResult;
    // }

    // const serverOptions = {
    //   ...options,
    //   app: clientApp.appShell.app
    // };
    // await buildTask.run(serverOptions);

    // const RenderUniversalTask = require('../tasks/render-universal').default;

    // const renderUniversalTask = new RenderUniversalTask({
    //   project: this.project,
    //   ui: this.ui,
    // });
    // const renderUniversalOptions: RenderUniversalTaskOptions = {
    //   inputIndexPath: join(this.project.root, clientApp.outDir, clientApp.index),
    //   route: clientApp.appShell.route,
    //   serverOutDir: join(this.project.root, serverApp.outDir),
    //   outputIndexPath: join(this.project.root, clientApp.outDir, clientApp.index)
    // };

    // return await renderUniversalTask.run(renderUniversalOptions);
  }
}
