/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { isPackageNameSafeForAnalytics } from '../analytics/analytics';
import { getPackageManager } from '../utilities/package-manager';
import {
  CommandModule,
  CommandModuleError,
  CommandModuleImplementation,
  CommandScope,
  OtherOptions,
} from './command-module';
import { Option, parseJsonSchemaToOptions } from './utilities/json-schema';

export abstract class ArchitectBaseCommandModule<T>
  extends CommandModule<T>
  implements CommandModuleImplementation<T>
{
  static override scope = CommandScope.In;
  protected override shouldReportAnalytics = false;
  protected readonly missingErrorTarget: string | undefined;

  protected async runSingleTarget(target: Target, options: OtherOptions): Promise<number> {
    const architectHost = await this.getArchitectHost();

    let builderName: string;
    try {
      builderName = await architectHost.getBuilderNameForTarget(target);
    } catch (e) {
      throw new CommandModuleError(this.missingErrorTarget ?? e.message);
    }

    await this.reportAnalytics({
      ...(await architectHost.getOptionsForTarget(target)),
      ...options,
    });

    const { logger } = this.context;

    const run = await this.getArchitect().scheduleTarget(target, options as json.JsonObject, {
      logger,
      analytics: isPackageNameSafeForAnalytics(builderName) ? await this.getAnalytics() : undefined,
    });

    const { error, success } = await run.output.toPromise();
    await run.stop();

    if (error) {
      logger.error(error);
    }

    return success ? 0 : 1;
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
    const builderConf = await architectHost.getBuilderNameForTarget(target);

    let builderDesc;
    try {
      builderDesc = await architectHost.resolveBuilder(builderConf);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        await this.warnOnMissingNodeModules();
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

  private async warnOnMissingNodeModules(): Promise<void> {
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

    const packageManager = await getPackageManager(basePath);
    this.context.logger.warn(
      `Node packages may not be installed. Try installing with '${packageManager} install'.`,
    );
  }
}
