/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { Path, getSystemPath, normalize, resolve } from '@angular-devkit/core';
import * as karma from 'karma'; // tslint:disable-line:no-implicit-dependencies
import { Observable } from 'rxjs';
import { BuildKarmaOptions } from './karma-plugin';
import { KarmaBuilderSchema } from './schema';


// NOTE: Karma should be a peerDependency but isn't because @angular-devkit/build-angular
// needs to use this builder and doesn't depend on Karma itself.

export declare type KarmaConfigWithBuilderOptions =
  karma.ConfigOptions
  & karma.ConfigFile
  & { buildKarma?: BuildKarmaOptions };

export class KarmaBuilder implements Builder<KarmaBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<KarmaBuilderSchema>): Observable<BuildEvent> {
    const root = this.context.workspace.root;
    const options = builderConfig.options;

    const configPath = getSystemPath(resolve(root, normalize(options.karmaConfig)));
    const karmaOptions: KarmaConfigWithBuilderOptions = { configFile: configPath };

    if (options.singleRun !== undefined) {
      karmaOptions.singleRun = options.singleRun;
    }

    return this.runKarma(karmaOptions);
  }

  public runKarma(karmaOptions: KarmaConfigWithBuilderOptions): Observable<BuildEvent> {
    return new Observable(obs => {
      // TODO: replace Karma logger with a context.logger adapter.
      // This seems to be extremely hard due to the tight integration Karma has with log4js.

      // Add reporter callbacks to notify us about run success.
      karmaOptions.buildKarma = {
        successCb: () => obs.next({ success: true }),
        failureCb: () => obs.next({ success: false }),
      };

      // Complete the observable once the Karma server returns.
      const karmaServer = new karma.Server(karmaOptions, () => obs.complete());
      karmaServer.start();

      // Teardown, signal Karma to exit.
      return () => {
        // Karma does not seem to have a way to exit the server gracefully.
        // It has karma.stopper.stop(karmaOptions), but that does process.kill().
        // See https://github.com/karma-runner/karma/issues/2867#issuecomment-369912167
        // TODO: make a PR for karma to add `karmaServer.close(code)`, that
        // calls `disconnectBrowsers(code);`
        // karmaServer.close();
      };
    });
  }
}

export default KarmaBuilder;
