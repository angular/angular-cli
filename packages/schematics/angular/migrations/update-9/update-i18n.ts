/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject, logging } from '@angular-devkit/core';
import { Rule, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import { posix } from 'path';
import { getWorkspacePath } from '../../utility/config';
import { NodeDependencyType, addPackageJsonDependency, getPackageJsonDependency } from '../../utility/dependencies';
import {
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
  removePropertyInAstObject,
} from '../../utility/json-utils';
import { latestVersions } from '../../utility/latest-versions';
import { Builders } from '../../utility/workspace-models';
import { getAllOptions, getProjectTarget, getTargets, getWorkspace } from './utils';

export function updateI18nConfig(): Rule {
  return (tree, context) => {
    // this is whole process of partial change writing and repeat loading/looping is only necessary
    // to workaround underlying issues with the recorder and ast helper functions

    const workspacePath = getWorkspacePath(tree);
    let workspaceAst = getWorkspace(tree);

    // Update extract targets
    const extractTargets = getTargets(workspaceAst, 'extract-i18n', Builders.ExtractI18n);
    if (extractTargets.length > 0) {
      const recorder = tree.beginUpdate(workspacePath);

      for (const { target, project } of extractTargets) {
        addProjectI18NOptions(recorder, tree, target, project);
        removeExtracti18nDeprecatedOptions(recorder, target);
      }

      tree.commitUpdate(recorder);

      // workspace was changed so need to reload
      workspaceAst = getWorkspace(tree);
    }

    // Update base HREF values for existing configurations
    let recorder = tree.beginUpdate(workspacePath);
    for (const { target } of getTargets(workspaceAst, 'build', Builders.Browser)) {
      updateBaseHrefs(recorder, target);
    }
    for (const { target } of getTargets(workspaceAst, 'test', Builders.Karma)) {
      updateBaseHrefs(recorder, target);
    }
    tree.commitUpdate(recorder);

    // Remove i18n format option
    workspaceAst = getWorkspace(tree);
    recorder = tree.beginUpdate(workspacePath);
    for (const { target } of getTargets(workspaceAst, 'build', Builders.Browser)) {
      removeFormatOption(recorder, target);
    }
    for (const { target } of getTargets(workspaceAst, 'test', Builders.Karma)) {
      removeFormatOption(recorder, target);
    }
    tree.commitUpdate(recorder);

    // Add new i18n options to build target configurations
    workspaceAst = getWorkspace(tree);
    recorder = tree.beginUpdate(workspacePath);
    for (const { target } of getTargets(workspaceAst, 'build', Builders.Browser)) {
      addBuilderI18NOptions(recorder, target, context.logger);
    }
    tree.commitUpdate(recorder);

    // Add new i18n options to test target configurations
    workspaceAst = getWorkspace(tree);
    recorder = tree.beginUpdate(workspacePath);
    for (const { target } of getTargets(workspaceAst, 'test', Builders.Karma)) {
      addBuilderI18NOptions(recorder, target, context.logger);
    }
    tree.commitUpdate(recorder);

    return tree;
  };
}

function addProjectI18NOptions(
  recorder: UpdateRecorder,
  tree: Tree,
  builderConfig: JsonAstObject,
  projectConfig: JsonAstObject,
) {
  const browserConfig = getProjectTarget(projectConfig, 'build', Builders.Browser);
  if (!browserConfig || browserConfig.kind !== 'object') {
    return;
  }

  // browser builder options
  let locales: Record<string, string | { translation: string; baseHref: string }> | undefined;
  const options = getAllOptions(browserConfig);
  for (const option of options) {
    const localeId = findPropertyInAstObject(option, 'i18nLocale');
    if (!localeId || localeId.kind !== 'string') {
      continue;
    }

    const localeFile = findPropertyInAstObject(option, 'i18nFile');
    if (!localeFile || localeFile.kind !== 'string') {
      continue;
    }

    const localIdValue = localeId.value;
    const localeFileValue = localeFile.value;

    const baseHref = findPropertyInAstObject(option, 'baseHref');
    let baseHrefValue;
    if (baseHref) {
      if (baseHref.kind === 'string' && baseHref.value !== `/${localIdValue}/`) {
        baseHrefValue = baseHref.value;
      }
    } else {
      // If the configuration does not contain a baseHref, ensure the main option value is used.
      baseHrefValue = '';
    }

    if (!locales) {
      locales = {
        [localIdValue]:
          baseHrefValue === undefined
            ? localeFileValue
            : {
                translation: localeFileValue,
                baseHref: baseHrefValue,
              },
      };
    } else {
      locales[localIdValue] =
        baseHrefValue === undefined
          ? localeFileValue
          : {
              translation: localeFileValue,
              baseHref: baseHrefValue,
            };
    }
  }

  if (locales) {
    // Get sourceLocale from extract-i18n builder
    const i18nOptions = getAllOptions(builderConfig);
    const sourceLocale = i18nOptions
      .map(o => {
        const sourceLocale = findPropertyInAstObject(o, 'i18nLocale');

        return sourceLocale && sourceLocale.value;
      })
      .find(x => !!x);

    // Add i18n project configuration
    insertPropertyInAstObjectInOrder(recorder, projectConfig, 'i18n', {
      locales,
      // tslint:disable-next-line: no-any
      sourceLocale: sourceLocale as any,
    }, 6);

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
  recorder: UpdateRecorder,
  builderConfig: JsonAstObject,
  logger: logging.LoggerApi,
) {
  const options = getAllOptions(builderConfig);

  for (const option of options) {
    const localeId = findPropertyInAstObject(option, 'i18nLocale');
    const i18nFile = findPropertyInAstObject(option, 'i18nFile');

    const outputPath = findPropertyInAstObject(option, 'outputPath');
    if (
      localeId &&
      localeId.kind === 'string' &&
      i18nFile &&
      outputPath &&
      outputPath.kind === 'string'
    ) {
      if (outputPath.value.match(new RegExp(`[/\\\\]${localeId.value}[/\\\\]?$`))) {
        const newOutputPath = outputPath.value.replace(
          new RegExp(`[/\\\\]${localeId.value}[/\\\\]?$`),
          '',
        );
        const { start, end } = outputPath;
        recorder.remove(start.offset, end.offset - start.offset);
        recorder.insertLeft(start.offset, `"${newOutputPath}"`);
      } else {
        logger.warn(
          `Output path value "${outputPath.value}" for locale "${localeId.value}" is not supported with the new localization system. ` +
            `With the current value, the localized output would be written to "${posix.join(
              outputPath.value,
              localeId.value,
            )}". ` +
            `Keeping existing options for the target configuration of locale "${localeId.value}".`,
        );

        continue;
      }
    }

    if (localeId && localeId.kind === 'string') {
      // add new localize option
      insertPropertyInAstObjectInOrder(recorder, option, 'localize', [localeId.value], 12);
      removePropertyInAstObject(recorder, option, 'i18nLocale');
    }

    if (i18nFile) {
      removePropertyInAstObject(recorder, option, 'i18nFile');
    }
  }
}

function removeFormatOption(
  recorder: UpdateRecorder,
  builderConfig: JsonAstObject,
) {
  const options = getAllOptions(builderConfig);

  for (const option of options) {
    // The format is always auto-detected now
    const i18nFormat = findPropertyInAstObject(option, 'i18nFormat');
    if (i18nFormat) {
      removePropertyInAstObject(recorder, option, 'i18nFormat');
    }
  }
}

function updateBaseHrefs(
  recorder: UpdateRecorder,
  builderConfig: JsonAstObject,
) {
  const options = getAllOptions(builderConfig);
  const mainOptions = findPropertyInAstObject(builderConfig, 'options');
  const mainBaseHref =
    mainOptions &&
    mainOptions.kind === 'object' &&
    findPropertyInAstObject(mainOptions, 'baseHref');
  const hasMainBaseHref =
    !!mainBaseHref && mainBaseHref.kind === 'string' && mainBaseHref.value !== '/';

  for (const option of options) {
    const localeId = findPropertyInAstObject(option, 'i18nLocale');
    const i18nFile = findPropertyInAstObject(option, 'i18nFile');

    // localize base HREF values are controlled by the i18n configuration
    const baseHref = findPropertyInAstObject(option, 'baseHref');
    if (localeId && i18nFile && baseHref) {
      // if the main option set has a non-default base href,
      // ensure that the augmented base href has the correct base value
      if (hasMainBaseHref) {
        const { start, end } = baseHref;
        recorder.remove(start.offset, end.offset - start.offset);
        recorder.insertLeft(start.offset, `"/"`);
      } else {
        removePropertyInAstObject(recorder, option, 'baseHref');
      }
    }
  }
}

function removeExtracti18nDeprecatedOptions(recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = getAllOptions(builderConfig);

  for (const option of options) {
    // deprecated options
    removePropertyInAstObject(recorder, option, 'i18nLocale');
    const i18nFormat = option.properties.find(({ key }) => key.value === 'i18nFormat');

    if (i18nFormat) {
      // i18nFormat has been changed to format
      const key = i18nFormat.key;
      const offset = key.start.offset + 1;
      recorder.remove(offset, key.value.length);
      recorder.insertLeft(offset, 'format');
    }
  }
}
