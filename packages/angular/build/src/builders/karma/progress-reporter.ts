/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderOutput } from '@angular-devkit/architect';
import type { Config, ConfigOptions } from 'karma';
import type { ReadableStreamController } from 'node:stream/web';
import { writeTestFiles } from '../../utils/test-files';
import type { ApplicationBuilderInternalOptions } from '../application/options';
import type { Result } from '../application/results';
import { ResultKind } from '../application/results';
import type { LatestBuildFiles } from './assets-middleware';

const LATEST_BUILD_FILES_TOKEN = 'angularLatestBuildFiles';

interface BuildOptions extends ApplicationBuilderInternalOptions {
  // We know that it's always a string since we set it.
  outputPath: string;
}

export function injectKarmaReporter(
  buildOptions: BuildOptions,
  buildIterator: AsyncIterator<Result>,
  karmaConfig: Config & ConfigOptions,
  controller: ReadableStreamController<BuilderOutput>,
): void {
  const reporterName = 'angular-progress-notifier';

  interface RunCompleteInfo {
    exitCode: number;
  }

  interface KarmaEmitter {
    refreshFiles(): void;
  }

  class ProgressNotifierReporter {
    static $inject = ['emitter', LATEST_BUILD_FILES_TOKEN];

    constructor(
      private readonly emitter: KarmaEmitter,
      private readonly latestBuildFiles: LatestBuildFiles,
    ) {
      this.startWatchingBuild();
    }

    private startWatchingBuild() {
      void (async () => {
        // This is effectively "for await of but skip what's already consumed".
        let isDone = false; // to mark the loop condition as "not constant".
        while (!isDone) {
          const { done, value: buildOutput } = await buildIterator.next();
          if (done) {
            isDone = true;
            break;
          }

          if (buildOutput.kind === ResultKind.Failure) {
            controller.enqueue({ success: false, message: 'Build failed' });
          } else if (
            buildOutput.kind === ResultKind.Incremental ||
            buildOutput.kind === ResultKind.Full
          ) {
            if (buildOutput.kind === ResultKind.Full) {
              this.latestBuildFiles.files = buildOutput.files;
            } else {
              this.latestBuildFiles.files = {
                ...this.latestBuildFiles.files,
                ...buildOutput.files,
              };
            }
            await writeTestFiles(buildOutput.files, buildOptions.outputPath);
            this.emitter.refreshFiles();
          }
        }
      })();
    }

    onRunComplete = function (_browsers: unknown, results: RunCompleteInfo): void {
      if (results.exitCode === 0) {
        controller.enqueue({ success: true });
      } else {
        controller.enqueue({ success: false });
      }
    };
  }

  karmaConfig.reporters ??= [];
  karmaConfig.reporters.push(reporterName);

  karmaConfig.plugins ??= [];
  karmaConfig.plugins.push({
    [`reporter:${reporterName}`]: [
      'factory',
      Object.assign(
        (...args: ConstructorParameters<typeof ProgressNotifierReporter>) =>
          new ProgressNotifierReporter(...args),
        ProgressNotifierReporter,
      ),
    ],
  });
}
