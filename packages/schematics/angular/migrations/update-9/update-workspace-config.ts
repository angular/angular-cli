/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject } from '@angular-devkit/core';
import { Rule, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import { getWorkspacePath } from '../../utility/config';
import { NodeDependencyType, addPackageJsonDependency, getPackageJsonDependency } from '../../utility/dependencies';
import {
  appendValueInAstArray,
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
  removePropertyInAstObject,
} from '../../utility/json-utils';
import { latestVersions } from '../../utility/latest-versions';
import { Builders } from '../../utility/workspace-models';
import { getAllOptions, getProjectTarget, getTargets, getWorkspace, isIvyEnabled } from './utils';

export const ANY_COMPONENT_STYLE_BUDGET = {
  type: 'anyComponentStyle',
  maximumWarning: '6kb',
};

export function updateWorkspaceConfig(): Rule {
  return (tree: Tree) => {
    const workspacePath = getWorkspacePath(tree);
    const workspace = getWorkspace(tree);
    const recorder = tree.beginUpdate(workspacePath);

    for (const { target, project } of getTargets(workspace, 'build', Builders.Browser)) {
      updateStyleOrScriptOption('styles', recorder, target);
      updateStyleOrScriptOption('scripts', recorder, target);
      addAnyComponentStyleBudget(recorder, target);
      updateAotOption(tree, recorder, target);
      addBuilderI18NOptions(recorder, target, project);
    }

    for (const { target, project } of getTargets(workspace, 'test', Builders.Karma)) {
      updateStyleOrScriptOption('styles', recorder, target);
      updateStyleOrScriptOption('scripts', recorder, target);
      addBuilderI18NOptions(recorder, target, project);
    }

    for (const { target } of getTargets(workspace, 'server', Builders.Server)) {
      updateOptimizationOption(recorder, target);
    }

    for (const { target, project } of getTargets(workspace, 'extract-i18n', Builders.ExtractI18n)) {
      addProjectI18NOptions(recorder, tree, target, project);
      removeExtracti18nDeprecatedOptions(recorder, target);
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

function addBuilderI18NOptions(recorder: UpdateRecorder, builderConfig: JsonAstObject, projectConfig: JsonAstObject) {
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
    if (localeId && localeId.kind === 'string') {
      // add new localize option
      insertPropertyInAstObjectInOrder(recorder, option, 'localize', [localeId.value], 12);
      removePropertyInAstObject(recorder, option, 'i18nLocale');
    }

    const i18nFile = findPropertyInAstObject(option, 'i18nFile');
    if (i18nFile) {
      removePropertyInAstObject(recorder, option, 'i18nFile');
    }

    const i18nFormat = findPropertyInAstObject(option, 'i18nFormat');
    if (i18nFormat) {
      removePropertyInAstObject(recorder, option, 'i18nFormat');
    }

    // localize base HREF values are controlled by the i18n configuration
    const baseHref = findPropertyInAstObject(option, 'baseHref');
    if (localeId && i18nFile && baseHref) {
      removePropertyInAstObject(recorder, option, 'baseHref');

      // if the main option set has a non-default base href,
      // ensure that the augmented base href has the correct base value
      if (hasMainBaseHref) {
        insertPropertyInAstObjectInOrder(recorder, option, 'baseHref', '/', 12);
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

function updateAotOption(tree: Tree, recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = findPropertyInAstObject(builderConfig, 'options');
  if (!options || options.kind !== 'object') {
    return;
  }

  const tsConfig = findPropertyInAstObject(options, 'tsConfig');
  // Do not add aot option if the users already opted out from Ivy.
  if (tsConfig && tsConfig.kind === 'string' && !isIvyEnabled(tree, tsConfig.value)) {
    return;
  }

  // Add aot to options.
  const aotOption = findPropertyInAstObject(options, 'aot');

  if (!aotOption) {
    insertPropertyInAstObjectInOrder(recorder, options, 'aot', true, 12);

    return;
  }

  if (aotOption.kind !== 'true') {
    const { start, end } = aotOption;
    recorder.remove(start.offset, end.offset - start.offset);
    recorder.insertLeft(start.offset, 'true');
  }

  // Remove aot properties from other configurations as they are no redundant
  const configOptions = getAllOptions(builderConfig, true);
  for (const options of configOptions) {
    removePropertyInAstObject(recorder, options, 'aot');
  }
}

function updateStyleOrScriptOption(property: 'scripts' | 'styles', recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = getAllOptions(builderConfig);

  for (const option of options) {
    const propertyOption = findPropertyInAstObject(option, property);
    if (!propertyOption || propertyOption.kind !== 'array') {
      continue;
    }

    for (const node of propertyOption.elements) {
      if (!node || node.kind !== 'object') {
        // skip non complex objects
        continue;
      }

      const lazy = findPropertyInAstObject(node, 'lazy');
      removePropertyInAstObject(recorder, node, 'lazy');

      // if lazy was not true, it is redundant hence, don't add it
      if (lazy && lazy.kind === 'true') {
        insertPropertyInAstObjectInOrder(recorder, node, 'inject', false, 0);
      }
    }
  }
}

function addAnyComponentStyleBudget(recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = getAllOptions(builderConfig, true);

  for (const option of options) {
    const budgetOption = findPropertyInAstObject(option, 'budgets');
    if (!budgetOption) {
      // add
      insertPropertyInAstObjectInOrder(recorder, option, 'budgets', [ANY_COMPONENT_STYLE_BUDGET], 14);
      continue;
    }

    if (budgetOption.kind !== 'array') {
      continue;
    }

    // if 'anyComponentStyle' budget already exists don't add.
    const hasAnyComponentStyle = budgetOption.elements.some(node => {
      if (!node || node.kind !== 'object') {
        // skip non complex objects
        return false;
      }

      const budget = findPropertyInAstObject(node, 'type');

      return !!budget && budget.kind === 'string' && budget.value === 'anyComponentStyle';
    });

    if (!hasAnyComponentStyle) {
      appendValueInAstArray(recorder, budgetOption, ANY_COMPONENT_STYLE_BUDGET, 16);
    }
  }
}

function updateOptimizationOption(recorder: UpdateRecorder, builderConfig: JsonAstObject) {
  const options = getAllOptions(builderConfig, true);

  for (const option of options) {
    const optimizationOption = findPropertyInAstObject(option, 'optimization');
    if (!optimizationOption) {
      // add
      insertPropertyInAstObjectInOrder(recorder, option, 'optimization', true, 14);
      continue;
    }

    if (optimizationOption.kind !== 'true') {
      const { start, end } = optimizationOption;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, 'true');
    }
  }
}
