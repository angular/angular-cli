/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as ts from 'typescript';
import { elideImports } from '../transformers/elide_imports';
import { findImageDomains } from '../transformers/find_image_domains';
import { removeIvyJitSupportCalls } from '../transformers/remove-ivy-jit-support-calls';
import { replaceResources } from '../transformers/replace_resources';

export function createAotTransformers(
  builder: ts.BuilderProgram,
  options: {
    emitClassMetadata?: boolean;
    emitNgModuleScope?: boolean;
    emitSetClassDebugInfo?: boolean;
  },
  imageDomains: Set<string>,
): ts.CustomTransformers {
  const getTypeChecker = () => builder.getProgram().getTypeChecker();
  const transformers: ts.CustomTransformers = {
    before: [findImageDomains(imageDomains), replaceBootstrap(getTypeChecker)],
    after: [],
  };

  const removeClassMetadata = !options.emitClassMetadata;
  const removeNgModuleScope = !options.emitNgModuleScope;
  const removeSetClassDebugInfo = !options.emitSetClassDebugInfo;
  if (removeClassMetadata || removeNgModuleScope || removeSetClassDebugInfo) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    transformers.before!.push(
      removeIvyJitSupportCalls(
        removeClassMetadata,
        removeNgModuleScope,
        removeSetClassDebugInfo,
        getTypeChecker,
      ),
    );
  }

  return transformers;
}

export function createJitTransformers(
  builder: ts.BuilderProgram,
  compilerCli: typeof import('@angular/compiler-cli/private/tooling'),
  options: {
    inlineStyleFileExtension?: string;
  },
): ts.CustomTransformers {
  const getTypeChecker = () => builder.getProgram().getTypeChecker();

  return {
    before: [
      replaceResources(() => true, getTypeChecker, options.inlineStyleFileExtension),
      compilerCli.constructorParametersDownlevelTransform(builder.getProgram()),
    ],
  };
}

export function mergeTransformers(
  first: ts.CustomTransformers,
  second: ts.CustomTransformers,
): ts.CustomTransformers {
  const result: ts.CustomTransformers = {};

  if (first.before || second.before) {
    result.before = [...(first.before || []), ...(second.before || [])];
  }

  if (first.after || second.after) {
    result.after = [...(first.after || []), ...(second.after || [])];
  }

  if (first.afterDeclarations || second.afterDeclarations) {
    result.afterDeclarations = [
      ...(first.afterDeclarations || []),
      ...(second.afterDeclarations || []),
    ];
  }

  return result;
}

/**
 * The name of the Angular platform that should be replaced within
 * bootstrap call expressions to support AOT.
 */
const PLATFORM_BROWSER_DYNAMIC_NAME = 'platformBrowserDynamic';

export function replaceBootstrap(
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    let bootstrapImport: ts.ImportDeclaration | undefined;
    let bootstrapNamespace: ts.Identifier | undefined;
    const replacedNodes: ts.Node[] = [];
    const nodeFactory = context.factory;

    const visitNode: ts.Visitor = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const target = node.expression;
        if (target.text === PLATFORM_BROWSER_DYNAMIC_NAME) {
          if (!bootstrapNamespace) {
            bootstrapNamespace = nodeFactory.createUniqueName('__NgCli_bootstrap_');
            bootstrapImport = nodeFactory.createImportDeclaration(
              undefined,
              nodeFactory.createImportClause(
                false,
                undefined,
                nodeFactory.createNamespaceImport(bootstrapNamespace),
              ),
              nodeFactory.createStringLiteral('@angular/platform-browser'),
            );
          }
          replacedNodes.push(target);

          return nodeFactory.updateCallExpression(
            node,
            nodeFactory.createPropertyAccessExpression(bootstrapNamespace, 'platformBrowser'),
            node.typeArguments,
            node.arguments,
          );
        }
      }

      return ts.visitEachChild(node, visitNode, context);
    };

    return (sourceFile: ts.SourceFile) => {
      if (!sourceFile.text.includes(PLATFORM_BROWSER_DYNAMIC_NAME)) {
        return sourceFile;
      }

      let updatedSourceFile = ts.visitEachChild(sourceFile, visitNode, context);

      if (bootstrapImport) {
        // Remove any unused platform browser dynamic imports
        const removals = elideImports(
          updatedSourceFile,
          replacedNodes,
          getTypeChecker,
          context.getCompilerOptions(),
        );
        if (removals.size > 0) {
          updatedSourceFile = ts.visitEachChild(
            updatedSourceFile,
            (node) => (removals.has(node) ? undefined : node),
            context,
          );
        }

        // Add new platform browser import
        return nodeFactory.updateSourceFile(
          updatedSourceFile,
          ts.setTextRange(
            nodeFactory.createNodeArray([bootstrapImport, ...updatedSourceFile.statements]),
            sourceFile.statements,
          ),
        );
      } else {
        return updatedSourceFile;
      }
    };
  };
}
