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
  BuilderDescription,
} from '@angular-devkit/architect';
import { Path, getSystemPath, normalize, resolve, tags } from '@angular-devkit/core';
import { Observable, from, of } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
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

  run(builderConfig: BuilderConfiguration<ProtractorBuilderOptions>): Observable<BuildEvent> {

    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    // const projectSystemRoot = getSystemPath(projectRoot);

    // TODO: verify using of(null) to kickstart things is a pattern.
    return of(null).pipe(
      concatMap(() => options.devServerTarget ? this._startDevServer(options) : of(null)),
      concatMap(() => options.webdriverUpdate ? this._updateWebdriver(projectRoot) : of(null)),
      concatMap(() => this._runProtractor(root, options)),
      take(1),
    );
  }

  // Note: this method mutates the options argument.
  private _startDevServer(options: ProtractorBuilderOptions) {
    const architect = this.context.architect;
    const [project, targetName, configuration] = (options.devServerTarget as string).split(':');
    // Override browser build watch setting.
    const overrides = { watch: false, host: options.host, port: options.port };
    const targetSpec = { project, target: targetName, configuration, overrides };
    const builderConfig = architect.getBuilderConfiguration<DevServerBuilderOptions>(targetSpec);
    let devServerDescription: BuilderDescription;
    let baseUrl: string;

    return architect.getBuilderDescription(builderConfig).pipe(
      tap(description => devServerDescription = description),
      concatMap(devServerDescription => architect.validateBuilderOptions(
        builderConfig, devServerDescription)),
      concatMap(() => {
        // Compute baseUrl from devServerOptions.
        if (options.devServerTarget && builderConfig.options.publicHost) {
          let publicHost = builderConfig.options.publicHost;
          if (!/^\w+:\/\//.test(publicHost)) {
            publicHost = `${builderConfig.options.ssl
              ? 'https'
              : 'http'}://${publicHost}`;
          }
          const clientUrl = url.parse(publicHost);
          baseUrl = url.format(clientUrl);
        } else if (options.devServerTarget) {
          baseUrl = url.format({
            protocol: builderConfig.options.ssl ? 'https' : 'http',
            hostname: options.host,
            port: builderConfig.options.port.toString(),
          });
        }

        // Save the computed baseUrl back so that Protractor can use it.
        options.baseUrl = baseUrl;

        return of(this.context.architect.getBuilder(devServerDescription, this.context));
      }),
      concatMap(builder => builder.run(builderConfig)),
    );
  }

  private _updateWebdriver(projectRoot: Path) {
    // The webdriver-manager update command can only be accessed via a deep import.
    const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
    let webdriverUpdate: any; // tslint:disable-line:no-any

    try {
      // When using npm, webdriver is within protractor/node_modules.
      webdriverUpdate = requireProjectModule(getSystemPath(projectRoot),
        `protractor/node_modules/${webdriverDeepImport}`);
    } catch (e) {
      try {
        // When using yarn, webdriver is found as a root module.
        webdriverUpdate = requireProjectModule(getSystemPath(projectRoot), webdriverDeepImport);
      } catch (e) {
        throw new Error(tags.stripIndents`
          Cannot automatically find webdriver-manager to update.
          Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
        `);
      }
    }

    // run `webdriver-manager update --standalone false --gecko false --quiet`
    // if you change this, update the command comment in prev line, and in `eject` task
    return from(webdriverUpdate.program.run({
      standalone: false,
      gecko: false,
      quiet: true,
    }));
  }

  private _runProtractor(root: Path, options: ProtractorBuilderOptions): Observable<BuildEvent> {
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
      [
        getSystemPath(resolve(root, normalize(options.protractorConfig))),
        additionalProtractorConfig,
      ],
    );
  }
}

export default ProtractorBuilder;
