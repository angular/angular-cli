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
  BuilderContext,
  BuilderDescription,
  Target,
} from '@angular-devkit/architect';
import { getSystemPath, tags } from '@angular-devkit/core';
import { resolve } from 'path';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { concatMap, take } from 'rxjs/operators';
import * as url from 'url';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import { DevServerBuilderOptions } from '../dev-server';
import { runModuleAsObservableFork } from '../utils';


export interface ProtractorBuilderOptions {
  protractorConfig: string;
  devServerTarget?: string;
  specs: string[];
  suite?: string;
  elementExplorer: boolean;
  webdriverUpdate: boolean;
  port?: number;
  host: string;
  baseUrl: string;
}

export class ProtractorBuilder implements Builder<ProtractorBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(target: Target<ProtractorBuilderOptions>): Observable<BuildEvent> {

    const root = getSystemPath(target.root);
    const options = target.options;

    // TODO: verify using of(null) to kickstart things is a pattern.
    return of(null).pipe(
      concatMap(() => options.devServerTarget ? this._startDevServer(options) : of(null)),
      concatMap(() => options.webdriverUpdate ? this._updateWebdriver(root) : of(null)),
      concatMap(() => this._runProtractor(root, options)),
      take(1),
    );
  }

  private _startDevServer(options: ProtractorBuilderOptions) {
    const [project, targetName, configuration] = (options.devServerTarget as string).split(':');
    // Override browser build watch setting.
    const overrides = { watch: false, host: options.host, port: options.port };
    const browserTargetOptions = { project, target: targetName, configuration, overrides };
    const devServerTarget = this.context.architect
      .getTarget<DevServerBuilderOptions>(browserTargetOptions);
    let devServerDescription: BuilderDescription;
    let baseUrl: string;

    return this.context.architect.getBuilderDescription(devServerTarget).pipe(
      concatMap(description => {
        devServerDescription = description;

        return this.context.architect.validateBuilderOptions(devServerTarget,
          devServerDescription);
      }),
      concatMap(() => {
        // Compute baseUrl from devServerOptions.
        if (options.devServerTarget && devServerTarget.options.publicHost) {
          let publicHost = devServerTarget.options.publicHost;
          if (!/^\w+:\/\//.test(publicHost)) {
            publicHost = `${devServerTarget.options.ssl
              ? 'https'
              : 'http'}://${publicHost}`;
          }
          const clientUrl = url.parse(publicHost);
          baseUrl = url.format(clientUrl);
        } else if (options.devServerTarget) {
          baseUrl = url.format({
            protocol: devServerTarget.options.ssl ? 'https' : 'http',
            hostname: options.host,
            port: devServerTarget.options.port.toString(),
          });
        }

        // Save the computed baseUrl back so that Protractor can use it.
        options.baseUrl = baseUrl;

        return of(this.context.architect.getBuilder(devServerDescription, this.context));
      }),
      concatMap(builder => builder.run(devServerTarget)),
    );
  }

  private _updateWebdriver(root: string) {
    // The webdriver-manager update command can only be accessed via a deep import.
    const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
    let webdriverUpdate: any; // tslint:disable-line:no-any

    try {
      // When using npm, webdriver is within protractor/node_modules.
      webdriverUpdate = requireProjectModule(root,
        `protractor/node_modules/${webdriverDeepImport}`);
    } catch (e) {
      try {
        // When using yarn, webdriver is found as a root module.
        webdriverUpdate = requireProjectModule(root, webdriverDeepImport);
      } catch (e) {
        throw new Error(tags.stripIndents`
          Cannot automatically find webdriver-manager to update.
          Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
        `);
      }
    }

    // run `webdriver-manager update --standalone false --gecko false --quiet`
    // if you change this, update the command comment in prev line, and in `eject` task
    return fromPromise(webdriverUpdate.program.run({
      standalone: false,
      gecko: false,
      quiet: true,
    }));
  }

  private _runProtractor(root: string, options: ProtractorBuilderOptions): Observable<BuildEvent> {
    const additionalProtractorConfig = {
      elementExplorer: options.elementExplorer,
      baseUrl: options.baseUrl,
      spec: options.specs.length ? options.specs : undefined,
      suite: options.suite,
    };

    // TODO: Protractor manages process.exit itself, so this target will allways quit the
    // process. To work around this we run it in a subprocess.
    // https://github.com/angular/protractor/issues/4160
    return runModuleAsObservableFork(
      root,
      'protractor/built/launcher',
      'init',
      [resolve(root, options.protractorConfig), additionalProtractorConfig],
    );
  }
}

export default ProtractorBuilder;
