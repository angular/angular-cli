/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging, workspaces } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { posix } from 'path';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';
import { allTargetOptions, allWorkspaceTargets, updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export function updateI18nConfig(): Rule {
  return (tree, { logger }) =>
    updateWorkspace((workspace) => {
      // Process extraction targets first since they use browser option values
      for (const [, target, , project] of allWorkspaceTargets(workspace)) {
        switch (target.builder) {
          case Builders.ExtractI18n:
            addProjectI18NOptions(tree, target, project);
            removeExtracti18nDeprecatedOptions(target);
            break;
        }
      }

      for (const [, target] of allWorkspaceTargets(workspace)) {
        switch (target.builder) {
          case Builders.Browser:
          case Builders.Server:
            updateBaseHrefs(target);
            removeFormatOption(target);
            addBuilderI18NOptions(target, logger);
            break;
        }
      }
    });
}

function addProjectI18NOptions(
  tree: Tree,
  builderConfig: workspaces.TargetDefinition,
  projectConfig: workspaces.ProjectDefinition,
) {
  const browserConfig = projectConfig.targets.get('build');
  if (!browserConfig || browserConfig.builder !== Builders.Browser) {
    return;
  }

  // browser builder options
  let locales: Record<string, string | { translation: string; baseHref: string }> | undefined;
  for (const [, options] of allTargetOptions(browserConfig)) {
    const localeId = options.i18nLocale;
    if (typeof localeId !== 'string') {
      continue;
    }

    const localeFile = options.i18nFile;
    if (typeof localeFile !== 'string') {
      continue;
    }

    let baseHref = options.baseHref;
    if (typeof baseHref === 'string') {
      // If the configuration baseHref is already the default locale value, do not include it
      if (baseHref === `/${localeId}/`) {
        baseHref = undefined;
      }
    } else {
      // If the configuration does not contain a baseHref, ensure the main option value is used.
      baseHref = '';
    }

    if (!locales) {
      locales = {
        [localeId]:
          baseHref === undefined
            ? localeFile
            : {
                translation: localeFile,
                baseHref,
              },
      };
    } else {
      locales[localeId] =
        baseHref === undefined
          ? localeFile
          : {
              translation: localeFile,
              baseHref,
            };
    }
  }

  if (locales) {
    // Get sourceLocale from extract-i18n builder
    const i18nOptions = [...allTargetOptions(builderConfig)];
    const sourceLocale = i18nOptions
      .map(([, o]) => o.i18nLocale)
      .find((x) => !!x && typeof x === 'string');

    projectConfig.extensions['i18n'] = {
      locales,
      ...(sourceLocale ? { sourceLocale } : {}),
    };

    // Add @angular/localize if not already a dependency
    if (!getPackageJsonDependency(tree, '@angular/localize')) {
      addPackageJsonDependency(tree, {
        name: '@angular/localize',
        version: latestVersions.Angular,
        type: NodeDependencyType.Default,
      });
    }
  }
}

function addBuilderI18NOptions(
  builderConfig: workspaces.TargetDefinition,
  logger: logging.LoggerApi,
) {
  for (const [, options] of allTargetOptions(builderConfig)) {
    const localeId = options.i18nLocale;
    const i18nFile = options.i18nFile;

    const outputPath = options.outputPath;
    if (typeof localeId === 'string' && i18nFile && typeof outputPath === 'string') {
      if (outputPath.match(new RegExp(`[/\\\\]${localeId}[/\\\\]?$`))) {
        const newOutputPath = outputPath.replace(new RegExp(`[/\\\\]${localeId}[/\\\\]?$`), '');
        options.outputPath = newOutputPath;
      } else {
        logger.warn(
          `Output path value "${outputPath}" for locale "${localeId}" is not supported with the new localization system. ` +
            `With the current value, the localized output would be written to "${posix.join(
              outputPath,
              localeId,
            )}". ` +
            `Keeping existing options for the target configuration of locale "${localeId}".`,
        );

        continue;
      }
    }

    if (typeof localeId === 'string') {
      // add new localize option
      options.localize = [localeId];
      delete options.i18nLocale;
    }

    if (i18nFile !== undefined) {
      delete options.i18nFile;
    }
  }
}

function removeFormatOption(builderConfig: workspaces.TargetDefinition) {
  for (const [, options] of allTargetOptions(builderConfig)) {
    // The format is always auto-detected now
    delete options.i18nFormat;
  }
}

function updateBaseHrefs(builderConfig: workspaces.TargetDefinition) {
  const mainBaseHref = builderConfig.options?.baseHref;
  const hasMainBaseHref =
    !!mainBaseHref && typeof mainBaseHref === 'string' && mainBaseHref !== '/';

  for (const [, options] of allTargetOptions(builderConfig)) {
    const localeId = options.i18nLocale;
    const i18nFile = options.i18nFile;

    // localize base HREF values are controlled by the i18n configuration
    const baseHref = options.baseHref;
    if (localeId !== undefined && i18nFile !== undefined && baseHref !== undefined) {
      // if the main option set has a non-default base href,
      // ensure that the augmented base href has the correct base value
      if (hasMainBaseHref) {
        options.baseHref = '/';
      } else {
        delete options.baseHref;
      }
    }
  }
}

function removeExtracti18nDeprecatedOptions(builderConfig: workspaces.TargetDefinition) {
  for (const [, options] of allTargetOptions(builderConfig)) {
    // deprecated options
    delete options.i18nLocale;

    if (options.i18nFormat !== undefined) {
      // i18nFormat has been changed to format
      options.format = options.i18nFormat;
      delete options.i18nFormat;
    }
  }
}
