/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree, chain } from '@angular-devkit/schematics';
import ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addSymbolToNgModuleMetadata, insertAfterLastOccurrence } from '../ast-utils';
import { InsertChange } from '../change';
import { getAppModulePath, isStandaloneApp } from '../ng-ast-utils';
import { ResolvedAppConfig, findAppConfig } from './app_config';
import { CodeBlock, CodeBlockCallback, PendingCode } from './code_block';
import {
  applyChangesToFile,
  findBootstrapApplicationCall,
  findProvidersLiteral,
  getMainFilePath,
  getSourceFile,
  isMergeAppConfigCall,
} from './util';

/**
 * Adds an import to the root of the project.
 * @param project Name of the project to which to add the import.
 * @param callback Function that generates the code block which should be inserted.
 * @example
 *
 * ```ts
 * import { Rule } from '@angular-devkit/schematics';
 * import { addRootImport } from '@schematics/angular/utility';
 *
 * export default function(): Rule {
 *   return addRootImport('default', ({code, external}) => {
 *     return code`${external('MyModule', '@my/module')}.forRoot({})`;
 *   });
 * }
 * ```
 */
export function addRootImport(project: string, callback: CodeBlockCallback): Rule {
  return getRootInsertionRule(project, callback, 'imports', {
    name: 'importProvidersFrom',
    module: '@angular/core',
  });
}

/**
 * Adds a provider to the root of the project.
 * @param project Name of the project to which to add the import.
 * @param callback Function that generates the code block which should be inserted.
 * @example
 *
 * ```ts
 * import { Rule } from '@angular-devkit/schematics';
 * import { addRootProvider } from '@schematics/angular/utility';
 *
 * export default function(): Rule {
 *   return addRootProvider('default', ({code, external}) => {
 *     return code`${external('provideLibrary', '@my/library')}({})`;
 *   });
 * }
 * ```
 */
export function addRootProvider(project: string, callback: CodeBlockCallback): Rule {
  return getRootInsertionRule(project, callback, 'providers');
}

/**
 * Creates a rule that inserts code at the root of either a standalone or NgModule-based project.
 * @param project Name of the project into which to inser tthe code.
 * @param callback Function that generates the code block which should be inserted.
 * @param ngModuleField Field of the root NgModule into which the code should be inserted, if the
 * app is based on NgModule
 * @param standaloneWrapperFunction Function with which to wrap the code if the app is standalone.
 */
function getRootInsertionRule(
  project: string,
  callback: CodeBlockCallback,
  ngModuleField: string,
  standaloneWrapperFunction?: { name: string; module: string },
): Rule {
  return async (host) => {
    const mainFilePath = await getMainFilePath(host, project);
    const codeBlock = new CodeBlock();

    if (isStandaloneApp(host, mainFilePath)) {
      return (tree) =>
        addProviderToStandaloneBootstrap(
          tree,
          callback(codeBlock),
          mainFilePath,
          standaloneWrapperFunction,
        );
    }

    const modulePath = getAppModulePath(host, mainFilePath);
    const pendingCode = CodeBlock.transformPendingCode(callback(codeBlock), modulePath);

    return chain([
      ...pendingCode.rules,
      (tree) => {
        const changes = addSymbolToNgModuleMetadata(
          getSourceFile(tree, modulePath),
          modulePath,
          ngModuleField,
          pendingCode.code.expression,
          // Explicitly set the import path to null since we deal with imports here separately.
          null,
        );

        applyChangesToFile(tree, modulePath, changes);
      },
    ]);
  };
}

/**
 * Adds a provider to the root of a standalone project.
 * @param host Tree of the root rule.
 * @param pendingCode Code that should be inserted.
 * @param mainFilePath Path to the project's main file.
 * @param wrapperFunction Optional function with which to wrap the provider.
 */
function addProviderToStandaloneBootstrap(
  host: Tree,
  pendingCode: PendingCode,
  mainFilePath: string,
  wrapperFunction?: { name: string; module: string },
): Rule {
  const bootstrapCall = findBootstrapApplicationCall(host, mainFilePath);
  const fileToEdit = findAppConfig(bootstrapCall, host, mainFilePath)?.filePath || mainFilePath;
  const { code, rules } = CodeBlock.transformPendingCode(pendingCode, fileToEdit);

  return chain([
    ...rules,
    () => {
      let wrapped: PendingCode;
      let additionalRules: Rule[];

      if (wrapperFunction) {
        const block = new CodeBlock();
        const result = CodeBlock.transformPendingCode(
          block.code`${block.external(wrapperFunction.name, wrapperFunction.module)}(${
            code.expression
          })`,
          fileToEdit,
        );

        wrapped = result.code;
        additionalRules = result.rules;
      } else {
        wrapped = code;
        additionalRules = [];
      }

      return chain([
        ...additionalRules,
        (tree) => insertStandaloneRootProvider(tree, mainFilePath, wrapped.expression),
      ]);
    },
  ]);
}

/**
 * Inserts a string expression into the root of a standalone project.
 * @param tree File tree used to modify the project.
 * @param mainFilePath Path to the main file of the project.
 * @param expression Code expression to be inserted.
 */
function insertStandaloneRootProvider(tree: Tree, mainFilePath: string, expression: string): void {
  const bootstrapCall = findBootstrapApplicationCall(tree, mainFilePath);
  const appConfig = findAppConfig(bootstrapCall, tree, mainFilePath);

  if (bootstrapCall.arguments.length === 0) {
    throw new SchematicsException(
      `Cannot add provider to invalid bootstrapApplication call in ${
        bootstrapCall.getSourceFile().fileName
      }`,
    );
  }

  if (appConfig) {
    addProvidersExpressionToAppConfig(tree, appConfig, expression);

    return;
  }

  const newAppConfig = `, {\n${tags.indentBy(2)`providers: [${expression}]`}\n}`;
  let targetCall: ts.CallExpression;

  if (bootstrapCall.arguments.length === 1) {
    targetCall = bootstrapCall;
  } else if (isMergeAppConfigCall(bootstrapCall.arguments[1])) {
    targetCall = bootstrapCall.arguments[1];
  } else {
    throw new SchematicsException(
      `Cannot statically analyze bootstrapApplication call in ${
        bootstrapCall.getSourceFile().fileName
      }`,
    );
  }

  applyChangesToFile(tree, mainFilePath, [
    insertAfterLastOccurrence(
      targetCall.arguments,
      newAppConfig,
      mainFilePath,
      targetCall.getEnd() - 1,
    ),
  ]);
}

/**
 * Adds a string expression to an app config object.
 * @param tree File tree used to modify the project.
 * @param appConfig Resolved configuration object of the project.
 * @param expression Code expression to be inserted.
 */
function addProvidersExpressionToAppConfig(
  tree: Tree,
  appConfig: ResolvedAppConfig,
  expression: string,
): void {
  const { node, filePath } = appConfig;
  const configProps = node.properties;
  const providersLiteral = findProvidersLiteral(node);

  // If there's a `providers` property, we can add the provider
  // to it, otherwise we need to declare it ourselves.
  if (providersLiteral) {
    const hasTrailingComma = providersLiteral.elements.hasTrailingComma;

    applyChangesToFile(tree, filePath, [
      insertAfterLastOccurrence(
        providersLiteral.elements,
        (hasTrailingComma || providersLiteral.elements.length === 0 ? '' : ', ') + expression,
        filePath,
        providersLiteral.getStart() + 1,
      ),
    ]);
  } else {
    const prop = tags.indentBy(2)`providers: [${expression}]`;
    let toInsert: string;
    let insertPosition: number;

    if (configProps.length === 0) {
      toInsert = '\n' + prop + '\n';
      insertPosition = node.getEnd() - 1;
    } else {
      const hasTrailingComma = configProps.hasTrailingComma;
      toInsert = (hasTrailingComma ? '' : ',') + '\n' + prop;
      insertPosition = configProps[configProps.length - 1].getEnd() + (hasTrailingComma ? 1 : 0);
    }

    applyChangesToFile(tree, filePath, [new InsertChange(filePath, insertPosition, toInsert)]);
  }
}
