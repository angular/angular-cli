/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

const TARGET_TEXT = '@NgModule';
const BUILTIN_LOADERS = new Set([
  'provideCloudflareLoader',
  'provideCloudinaryLoader',
  'provideImageKitLoader',
  'provideImgixLoader',
]);
const URL_REGEX = /(https?:\/\/[^/]*)\//g;

export function findImageDomains(imageDomains: Set<string>): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      const isBuiltinImageLoader = (node: ts.CallExpression): Boolean => {
        return BUILTIN_LOADERS.has(node.expression.getText());
      };

      const findDomainString = (node: ts.Node) => {
        if (
          ts.isStringLiteral(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node)
        ) {
          const domain = node.text.match(URL_REGEX);
          if (domain && domain[0]) {
            imageDomains.add(domain[0]);

            return node;
          }
        }
        ts.visitEachChild(node, findDomainString, context);

        return node;
      };

      function isImageProviderKey(property: ts.ObjectLiteralElementLike): boolean {
        return (
          ts.isPropertyAssignment(property) &&
          property.name.getText() === 'provide' &&
          property.initializer.getText() === 'IMAGE_LOADER'
        );
      }

      function isImageProviderValue(property: ts.ObjectLiteralElementLike): boolean {
        return ts.isPropertyAssignment(property) && property.name.getText() === 'useValue';
      }

      function checkForDomain(node: ts.ObjectLiteralExpression) {
        if (node.properties.find(isImageProviderKey)) {
          const value = node.properties.find(isImageProviderValue);
          if (value && ts.isPropertyAssignment(value)) {
            if (
              ts.isArrowFunction(value.initializer) ||
              ts.isFunctionExpression(value.initializer)
            ) {
              ts.visitEachChild(node, findDomainString, context);
            }
          }
        }
      }

      function findImageLoaders(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          if (isBuiltinImageLoader(node)) {
            const firstArg = node.arguments[0];
            if (ts.isStringLiteralLike(firstArg)) {
              imageDomains.add(firstArg.text);
            }
          }
        } else if (ts.isObjectLiteralExpression(node)) {
          checkForDomain(node);
        }

        return node;
      }

      function findProvidersAssignment(node: ts.Node) {
        if (ts.isPropertyAssignment(node)) {
          if (ts.isIdentifier(node.name) && node.name.escapedText === 'providers') {
            ts.visitEachChild(node.initializer, findImageLoaders, context);
          }
        }

        return node;
      }

      function findFeaturesAssignment(node: ts.Node) {
        if (ts.isPropertyAssignment(node)) {
          if (
            ts.isIdentifier(node.name) &&
            node.name.escapedText === 'features' &&
            ts.isArrayLiteralExpression(node.initializer)
          ) {
            const providerElement = node.initializer.elements.find(isProvidersFeatureElement);
            if (
              providerElement &&
              ts.isCallExpression(providerElement) &&
              providerElement.arguments[0]
            ) {
              ts.visitEachChild(providerElement.arguments[0], findImageLoaders, context);
            }
          }
        }

        return node;
      }

      function isProvidersFeatureElement(node: ts.Node): Boolean {
        return (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.escapedText === 'i0' &&
          ts.isIdentifier(node.expression.name) &&
          node.expression.name.escapedText === 'ɵɵProvidersFeature'
        );
      }

      function findPropertyDeclaration(node: ts.Node) {
        if (
          ts.isPropertyDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          node.initializer.arguments[0]
        ) {
          if (node.name.escapedText === 'ɵinj') {
            ts.visitEachChild(node.initializer.arguments[0], findProvidersAssignment, context);
          } else if (node.name.escapedText === 'ɵcmp') {
            ts.visitEachChild(node.initializer.arguments[0], findFeaturesAssignment, context);
          }
        }

        return node;
      }

      function findClassDeclaration(node: ts.Node) {
        if (ts.isClassDeclaration(node)) {
          ts.visitEachChild(node, findPropertyDeclaration, context);
        }

        return node;
      }

      ts.visitEachChild(sourceFile, findClassDeclaration, context);

      return sourceFile;
    };
  };
}
