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
import { Path, getSystemPath, join, normalize, virtualFs } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { merge } from 'rxjs/observable/merge';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concatMap, map, switchMap } from 'rxjs/operators';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import { BuildWebpackServerSchema } from '../server/schema';
import { BuildWebpackAppShellSchema } from './schema';


export class AppShellBuilder implements Builder<BuildWebpackAppShellSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<BuildWebpackAppShellSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;

    return new Observable<BuildEvent>(obs => {
      let success = true;
      const subscription = merge(
        this.build(options.serverTarget, {}),
        this.build(options.browserTarget, { watch: false }),
      ).subscribe((event: BuildEvent) => {
        // TODO: once we support a better build event, add support for merging two event streams
        // together.
        success = success && event.success;
      }, error => {
        obs.error(error);
      }, () => {
        obs.next({ success });
        obs.complete();
      });

      // Allow subscriptions to us to unsubscribe from each builds at the same time.
      return () => subscription.unsubscribe();
    }).pipe(
      switchMap(event => {
        if (!event.success) {
          return of(event);
        }

        return this.renderUniversal(options);
      }),
    );
  }

  build(targetString: string, overrides: {}) {
    const architect = this.context.architect;
    const [project, target, configuration] = targetString.split(':');

    // Override browser build watch setting.
    const builderConfig = architect.getBuilderConfiguration<{}>({
      project,
      target,
      configuration,
      overrides,
    });

    return architect.run(builderConfig, this.context);
  }

  getServerModuleBundlePath(options: BuildWebpackAppShellSchema) {
    const architect = this.context.architect;

    return new Observable<Path>(obs => {
      if (options.appModuleBundle) {
        obs.next(join(this.context.workspace.root, options.appModuleBundle));

        return obs.complete();
      } else {
        const [project, target, configuration] = options.serverTarget.split(':');
        const builderConfig = architect.getBuilderConfiguration<BuildWebpackServerSchema>({
          project,
          target,
          configuration,
        });

        return architect.getBuilderDescription(builderConfig).pipe(
          concatMap(description => architect.validateBuilderOptions(builderConfig, description)),
          switchMap(config => {
            const outputPath = join(this.context.workspace.root, config.options.outputPath);

            return this.context.host.list(outputPath).pipe(
              switchMap(files => {
                const re = /^main\.(?:[a-zA-Z0-9]{20}\.)?(?:bundle\.)?js$/;
                const maybeMain = files.filter(x => re.test(x))[0];

                if (!maybeMain) {
                  return _throw(new Error('Could not find the main bundle.'));
                } else {
                  return of(join(outputPath, maybeMain));
                }
              }),
            );
          }),
        ).subscribe(obs);
      }
    });
  }

  getBrowserIndexOutputPath(options: BuildWebpackAppShellSchema) {
    const architect = this.context.architect;
    const [project, target, configuration] = options.browserTarget.split(':');
    const builderConfig = architect.getBuilderConfiguration<BuildWebpackServerSchema>({
      project,
      target,
      configuration,
    });

    return architect.getBuilderDescription(builderConfig).pipe(
      concatMap(description => architect.validateBuilderOptions(builderConfig, description)),
      map(config => join(normalize(config.options.outputPath), 'index.html')),
    );
  }

  renderUniversal(options: BuildWebpackAppShellSchema): Observable<BuildEvent> {
    return forkJoin(
      this.getBrowserIndexOutputPath(options).pipe(
        switchMap(browserIndexOutputPath => {
          const path = join(this.context.workspace.root, browserIndexOutputPath);

          return this.context.host.read(path).pipe(
            map<virtualFs.FileBuffer, [Path, virtualFs.FileBuffer]>(x => {
              return [browserIndexOutputPath, x];
            }),
          );
        }),
      ),
      this.getServerModuleBundlePath(options),
    ).pipe(
      switchMap(([[browserIndexOutputPath, indexContent], serverBundlePath]) => {
        const root = this.context.workspace.root;
        requireProjectModule(getSystemPath(root), 'zone.js/dist/zone-node');

        const renderModuleFactory = requireProjectModule(
          getSystemPath(root),
          '@angular/platform-server',
        ).renderModuleFactory;
        const AppServerModuleNgFactory = require(
          getSystemPath(serverBundlePath),
        ).AppServerModuleNgFactory;
        const indexHtml = virtualFs.fileBufferToString(indexContent);
        const outputPath = join(root, options.outputIndexPath || browserIndexOutputPath);

        // Render to HTML and overwrite the client index file.
        return fromPromise(
          renderModuleFactory(AppServerModuleNgFactory, {
            document: indexHtml,
            url: options.route,
          })
          .then((html: string) => {
            return this.context.host
              .write(outputPath, virtualFs.stringToFileBuffer(html))
              .toPromise();
          })
          .then(() => ({ success: true })),
        );
      }),
    );
  }
}

export default AppShellBuilder;
