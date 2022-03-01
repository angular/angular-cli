/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { getPackageManager } from '../../utilities/package-manager';
import { CommandContext, CommandModuleError } from '../command-module';
import { Option, parseJsonSchemaToOptions } from './json-schema';

export async function getArchitectTargetOptions(
  context: CommandContext,
  target: Target,
): Promise<Option[]> {
  const { workspace } = context;
  if (!workspace) {
    return [];
  }

  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath);
  const builderConf = await architectHost.getBuilderNameForTarget(target);

  let builderDesc;
  try {
    builderDesc = await architectHost.resolveBuilder(builderConf);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      await warnOnMissingNodeModules(context);
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

export async function warnOnMissingNodeModules(context: CommandContext): Promise<void> {
  const basePath = context.workspace?.basePath;
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
  context.logger.warn(
    `Node packages may not be installed. Try installing with '${packageManager} install'.`,
  );
}
