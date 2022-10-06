/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Target } from '@angular-devkit/architect';
import {
  NodeModulesBuilderInfo,
  WorkspaceNodeModulesArchitectHost,
} from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { isPackageNameSafeForAnalytics } from '../analytics/analytics';
import { EventCustomDimension, EventCustomMetric } from '../analytics/analytics-parameters';
import { assertIsError } from '../utilities/error';
import { askConfirmation, askQuestion } from '../utilities/prompt';
import { isTTY } from '../utilities/tty';
import {
  CommandModule,
  CommandModuleError,
  CommandModuleImplementation,
  CommandScope,
  OtherOptions,
} from './command-module';
import { Option, parseJsonSchemaToOptions } from './utilities/json-schema';

export interface MissingTargetChoice {
  name: string;
  value: string;
}

export abstract class ArchitectBaseCommandModule<T extends object>
  extends CommandModule<T>
  implements CommandModuleImplementation<T>
{
  override scope = CommandScope.In;
  protected readonly missingTargetChoices: MissingTargetChoice[] | undefined;

  protected async runSingleTarget(target: Target, options: OtherOptions): Promise<number> {
    const architectHost = await this.getArchitectHost();

    let builderName: string;
    try {
      builderName = await architectHost.getBuilderNameForTarget(target);
    } catch (e) {
      assertIsError(e);

      return this.onMissingTarget(e.message);
    }

    const { logger } = this.context;
    const run = await this.getArchitect().scheduleTarget(target, options as json.JsonObject, {
      logger,
    });

    const analytics = isPackageNameSafeForAnalytics(builderName)
      ? await this.getAnalytics()
      : undefined;

    let outputSubscription;
    if (analytics) {
      analytics.reportArchitectRunEvent({
        [EventCustomDimension.BuilderTarget]: builderName,
      });

      let firstRun = true;
      outputSubscription = run.output.subscribe(({ stats }) => {
        const parameters = this.builderStatsToAnalyticsParameters(stats, builderName);
        if (!parameters) {
          return;
        }

        if (firstRun) {
          firstRun = false;
          analytics.reportBuildRunEvent(parameters);
        } else {
          analytics.reportRebuildRunEvent(parameters);
        }
      });
    }

    try {
      const { error, success } = await run.output.toPromise();

      if (error) {
        logger.error(error);
      }

      return success ? 0 : 1;
    } finally {
      await run.stop();
      outputSubscription?.unsubscribe();
    }
  }

  private builderStatsToAnalyticsParameters(
    stats: json.JsonValue,
    builderName: string,
  ): Partial<
    | Record<EventCustomDimension & EventCustomMetric, string | number | undefined | boolean>
    | undefined
  > {
    if (!stats || typeof stats !== 'object' || !('durationInMs' in stats)) {
      return undefined;
    }

    const {
      optimization,
      allChunksCount,
      aot,
      lazyChunksCount,
      initialChunksCount,
      durationInMs,
      changedChunksCount,
      cssSizeInBytes,
      jsSizeInBytes,
      ngComponentCount,
    } = stats;

    return {
      [EventCustomDimension.BuilderTarget]: builderName,
      [EventCustomDimension.Aot]: aot,
      [EventCustomDimension.Optimization]: optimization,
      [EventCustomMetric.AllChunksCount]: allChunksCount,
      [EventCustomMetric.LazyChunksCount]: lazyChunksCount,
      [EventCustomMetric.InitialChunksCount]: initialChunksCount,
      [EventCustomMetric.ChangedChunksCount]: changedChunksCount,
      [EventCustomMetric.DurationInMs]: durationInMs,
      [EventCustomMetric.JsSizeInBytes]: jsSizeInBytes,
      [EventCustomMetric.CssSizeInBytes]: cssSizeInBytes,
      [EventCustomMetric.NgComponentCount]: ngComponentCount,
    };
  }

  private _architectHost: WorkspaceNodeModulesArchitectHost | undefined;
  protected getArchitectHost(): WorkspaceNodeModulesArchitectHost {
    if (this._architectHost) {
      return this._architectHost;
    }

    const workspace = this.getWorkspaceOrThrow();

    return (this._architectHost = new WorkspaceNodeModulesArchitectHost(
      workspace,
      workspace.basePath,
    ));
  }

  private _architect: Architect | undefined;
  protected getArchitect(): Architect {
    if (this._architect) {
      return this._architect;
    }

    const registry = new json.schema.CoreSchemaRegistry();
    registry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
    registry.useXDeprecatedProvider((msg) => this.context.logger.warn(msg));

    const architectHost = this.getArchitectHost();

    return (this._architect = new Architect(architectHost, registry));
  }

  protected async getArchitectTargetOptions(target: Target): Promise<Option[]> {
    const architectHost = this.getArchitectHost();
    let builderConf: string;

    try {
      builderConf = await architectHost.getBuilderNameForTarget(target);
    } catch {
      return [];
    }

    let builderDesc: NodeModulesBuilderInfo;
    try {
      builderDesc = await architectHost.resolveBuilder(builderConf);
    } catch (e) {
      assertIsError(e);
      if (e.code === 'MODULE_NOT_FOUND') {
        this.warnOnMissingNodeModules();
        throw new CommandModuleError(`Could not find the '${builderConf}' builder's node package.`);
      }

      throw e;
    }

    return parseJsonSchemaToOptions(
      new json.schema.CoreSchemaRegistry(),
      builderDesc.optionSchema as json.JsonObject,
      true,
    );
  }

  private warnOnMissingNodeModules(): void {
    const basePath = this.context.workspace?.basePath;
    if (!basePath) {
      return;
    }

    // Check for a `node_modules` directory (npm, yarn non-PnP, etc.)
    if (existsSync(resolve(basePath, 'node_modules'))) {
      return;
    }

    // Check for yarn PnP files
    if (
      existsSync(resolve(basePath, '.pnp.js')) ||
      existsSync(resolve(basePath, '.pnp.cjs')) ||
      existsSync(resolve(basePath, '.pnp.mjs'))
    ) {
      return;
    }

    this.context.logger.warn(
      `Node packages may not be installed. Try installing with '${this.context.packageManager.name} install'.`,
    );
  }

  protected getArchitectTarget(): string {
    return this.commandName;
  }

  protected async onMissingTarget(defaultMessage: string): Promise<1> {
    const { logger } = this.context;
    const choices = this.missingTargetChoices;

    if (!choices?.length) {
      logger.error(defaultMessage);

      return 1;
    }

    const missingTargetMessage =
      `Cannot find "${this.getArchitectTarget()}" target for the specified project.\n` +
      `You can add a package that implements these capabilities.\n\n` +
      `For example:\n` +
      choices.map(({ name, value }) => `  ${name}: ng add ${value}`).join('\n') +
      '\n';

    if (isTTY()) {
      // Use prompts to ask the user if they'd like to install a package.
      logger.warn(missingTargetMessage);

      const packageToInstall = await this.getMissingTargetPackageToInstall(choices);
      if (packageToInstall) {
        // Example run: `ng add @angular-eslint/schematics`.
        const binPath = resolve(__dirname, '../../bin/ng.js');
        const { error } = spawnSync(process.execPath, [binPath, 'add', packageToInstall], {
          stdio: 'inherit',
        });

        if (error) {
          throw error;
        }
      }
    } else {
      // Non TTY display error message.
      logger.error(missingTargetMessage);
    }

    return 1;
  }

  private async getMissingTargetPackageToInstall(
    choices: MissingTargetChoice[],
  ): Promise<string | null> {
    if (choices.length === 1) {
      // Single choice
      const { name, value } = choices[0];
      if (await askConfirmation(`Would you like to add ${name} now?`, true, false)) {
        return value;
      }

      return null;
    }

    // Multiple choice
    return askQuestion(
      `Would you like to add a package with "${this.getArchitectTarget()}" capabilities now?`,
      [
        {
          name: 'No',
          value: null,
        },
        ...choices,
      ],
      0,
      null,
    );
  }
}
