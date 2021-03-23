/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue, logging, tags, workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, allWorkspaceTargets, updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export default function (): Rule {
  return async (_host, context) => updateWorkspace(workspace => {
    for (const [name, target] of allWorkspaceTargets(workspace)) {
      let defaultConfiguration: string | undefined;

      // Only interested in 1st party builders
      switch (target.builder) {
        case Builders.AppShell:
        case Builders.Browser:
        case Builders.Server:
        case Builders.NgPackagr:
          defaultConfiguration = 'production';
          break;
        case Builders.DevServer:
        case Builders.Protractor:
        case '@nguniversal/builders:ssr-dev-server':
          defaultConfiguration = 'development';
          break;
        case Builders.TsLint:
        case Builders.ExtractI18n:
        case Builders.Karma:
          // Nothing to update
          break;
        default:
          context.logger.warn(tags.stripIndents`Cannot update "${name}" target configuration as it's using "${target.builder}"
          which is a third-party builder. This target configuration will require manual review.`);

          continue;
      }

      if (!defaultConfiguration) {
        continue;
      }

      updateTarget(name, target, context.logger, defaultConfiguration);
    }
  });
}

function getArchitectTargetWithConfig(currentTarget: string, overrideConfig?: string): string {
  const [project, target, config = 'development'] = currentTarget.split(':');

  return `${project}:${target}:${overrideConfig || config}`;
}

function updateTarget(
  targetName: string,
  target: workspaces.TargetDefinition,
  logger: logging.LoggerApi,
  defaultConfiguration: string,
): void {
  if (!target.configurations) {
    target.configurations = {};
  }

  if (target.configurations?.development) {
    logger.info(tags.stripIndents`Skipping updating "${targetName}" target configuration as a "development" configuration is already defined.`);

    return;
  }

  if (!target.configurations?.production) {
    logger.info(tags.stripIndents`Skipping updating "${targetName}" target configuration as a "production" configuration is not defined.`);

    return;
  }

  const developmentOptions: Record<string, JsonValue | undefined> = {};
  let serverTarget = true;
  let browserTarget = true;
  let devServerTarget = true;

  for (const [, options] of allTargetOptions(target)) {
    if (typeof options.serverTarget === 'string') {
      options.serverTarget = getArchitectTargetWithConfig(options.serverTarget);
      if (!developmentOptions.serverTarget) {
        developmentOptions.serverTarget = getArchitectTargetWithConfig(options.serverTarget, 'development');
      }
    } else {
      serverTarget = false;
    }

    if (typeof options.browserTarget === 'string') {
      options.browserTarget = getArchitectTargetWithConfig(options.browserTarget);
      if (!developmentOptions.browserTarget) {
        developmentOptions.browserTarget = getArchitectTargetWithConfig(options.browserTarget, 'development');
      }
    } else {
      browserTarget = false;
    }

    if (typeof options.devServerTarget === 'string') {
      options.devServerTarget = getArchitectTargetWithConfig(options.devServerTarget);
      if (!developmentOptions.devServerTarget) {
        developmentOptions.devServerTarget = getArchitectTargetWithConfig(options.devServerTarget, 'development');
      }
    } else {
      devServerTarget = false;
    }
  }

  // If all configurastions have a target defined delete the one in options.
  if (target.options) {
    if (serverTarget) {
      delete target.options.serverTarget;
    }

    if (browserTarget) {
      delete target.options.browserTarget;
    }

    if (devServerTarget) {
      delete target.options.devServerTarget;
    }
  }

  target.defaultConfiguration = defaultConfiguration;
  target.configurations.development = developmentOptions;
}
