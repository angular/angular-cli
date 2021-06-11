/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, getSystemPath, logging, normalize, resolve, workspaces } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { getWorkspace, updateWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return async (host, context) => {
    const workspace = await getWorkspace(host);

    for (const [projectName, project] of workspace.projects) {
      if (project.extensions.projectType !== ProjectType.Application) {
        // Only interested in application projects
        continue;
      }

      for (const [, target] of project.targets) {
        // Only interested in Angular Devkit Browser builder
        if (target?.builder !== Builders.Browser) {
          continue;
        }

        const isES5Needed = await isES5SupportNeeded(
          resolve(normalize(host.root.path), normalize(project.root)),
        );

        // Check options
        if (target.options) {
          target.options = removeE5BrowserSupportOption(
            projectName,
            target.options,
            isES5Needed,
            context.logger,
          );
        }

        // Go through each configuration entry
        if (!target.configurations) {
          continue;
        }

        for (const [configurationName, options] of Object.entries(target.configurations)) {
          target.configurations[configurationName] = removeE5BrowserSupportOption(
            projectName,
            options,
            isES5Needed,
            context.logger,
            configurationName,
          );
        }
      }
    }

    return updateWorkspace(workspace);
  };
}

type TargetOptions = workspaces.TargetDefinition['options'];

function removeE5BrowserSupportOption(
  projectName: string,
  options: TargetOptions,
  isES5Needed: boolean | undefined,
  logger: logging.LoggerApi,
  configurationName = '',
): TargetOptions {
  if (typeof options?.es5BrowserSupport !== 'boolean') {
    return options;
  }

  const configurationPath = configurationName ? `configurations.${configurationName}.` : '';

  if (options.es5BrowserSupport && isES5Needed === false) {
    logger.warn(
      `Project '${projectName}' doesn't require ES5 support, but '${configurationPath}es5BrowserSupport' was set to 'true'.\n` +
        `ES5 polyfills will no longer be added when building this project${
          configurationName ? ` with '${configurationName}' configuration.` : '.'
        }\n` +
        `If ES5 polyfills are needed, add the supported ES5 browsers in the browserslist configuration.`,
    );
  } else if (!options.es5BrowserSupport && isES5Needed === true) {
    logger.warn(
      `Project '${projectName}' requires ES5 support, but '${configurationPath}es5BrowserSupport' was set to 'false'.\n` +
        `ES5 polyfills will be added when building this project${
          configurationName ? ` with '${configurationName}' configuration.` : '.'
        }\n` +
        `If ES5 polyfills are not needed, remove the unsupported ES5 browsers from the browserslist configuration.`,
    );
  }

  return {
    ...options,
    es5BrowserSupport: undefined,
  };
}

/**
 * True, when one or more browsers requires ES5 support
 */
async function isES5SupportNeeded(projectRoot: Path): Promise<boolean | undefined> {
  // y: feature is fully available
  // n: feature is unavailable
  // a: feature is partially supported
  // x: feature is prefixed
  const criteria = ['y', 'a'];

  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const browserslist = (await import('browserslist')).default;
    const supportedBrowsers = browserslist(undefined, {
      path: getSystemPath(projectRoot),
    });

    // eslint-disable-next-line import/no-extraneous-dependencies
    const { feature, features } = await import('caniuse-lite');
    const data = feature(features['es6-module']);

    return supportedBrowsers.some((browser) => {
      const [agentId, version] = browser.split(' ');

      const browserData = data.stats[agentId];
      const featureStatus = (browserData && browserData[version]) as string | undefined;

      // We are only interested in the first character
      // Ex: when 'a #4 #5', we only need to check for 'a'
      // as for such cases we should polyfill these features as needed
      return !featureStatus || !criteria.includes(featureStatus.charAt(0));
    });
  } catch {
    return undefined;
  }
}
