/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type ng from '@angular/compiler-cli';
import assert from 'node:assert';
import ts from 'typescript';

/**
 * Analyzes one or more modified files for changes to determine if any
 * class declarations for Angular components are candidates for hot
 * module replacement (HMR). If any source files are also modified but
 * are not candidates then all candidates become invalid. This invalidation
 * ensures that a full rebuild occurs and the running application stays
 * synchronized with the code.
 * @param modifiedFiles A set of modified files to analyze.
 * @param param1 An Angular compiler instance
 * @param staleSourceFiles A map of paths to previous source file instances.
 * @returns A set of HMR candidate component class declarations.
 */
export function collectHmrCandidates(
  modifiedFiles: Set<string>,
  { compiler }: ng.NgtscProgram,
  staleSourceFiles: Map<string, ts.SourceFile> | undefined,
): Set<ts.ClassDeclaration> {
  const candidates = new Set<ts.ClassDeclaration>();

  for (const file of modifiedFiles) {
    // If the file is a template for component(s), add component classes as candidates
    const templateFileNodes = compiler.getComponentsWithTemplateFile(file);
    if (templateFileNodes.size) {
      templateFileNodes.forEach((node) => candidates.add(node as ts.ClassDeclaration));
      continue;
    }

    // If the file is a style for component(s), add component classes as candidates
    const styleFileNodes = compiler.getComponentsWithStyleFile(file);
    if (styleFileNodes.size) {
      styleFileNodes.forEach((node) => candidates.add(node as ts.ClassDeclaration));
      continue;
    }

    const staleSource = staleSourceFiles?.get(file);
    if (staleSource === undefined) {
      // Unknown file requires a rebuild so clear out the candidates and stop collecting
      candidates.clear();
      break;
    }

    const updatedSource = compiler.getCurrentProgram().getSourceFile(file);
    if (updatedSource === undefined) {
      // No longer existing program file requires a rebuild so clear out the candidates and stop collecting
      candidates.clear();
      break;
    }

    // Analyze the stale and updated file for changes
    const fileCandidates = analyzeFileUpdates(staleSource, updatedSource, compiler);
    if (fileCandidates) {
      fileCandidates.forEach((node) => candidates.add(node));
    } else {
      // Unsupported HMR changes present
      // Only template and style literal changes are allowed.
      candidates.clear();
      break;
    }
  }

  return candidates;
}

/**
 * Analyzes the updates of a source file for potential HMR component class candidates.
 * A source file can contain candidates if only the Angular component metadata of a class
 * has been changed and the metadata changes are only of supported fields.
 * @param stale The stale (previous) source file instance.
 * @param updated The updated source file instance.
 * @param compiler An Angular compiler instance.
 * @returns An array of candidate class declarations; or `null` if unsupported changes are present.
 */
function analyzeFileUpdates(
  stale: ts.SourceFile,
  updated: ts.SourceFile,
  compiler: ng.NgtscProgram['compiler'],
): ts.ClassDeclaration[] | null {
  if (stale.statements.length !== updated.statements.length) {
    return null;
  }

  const candidates: ts.ClassDeclaration[] = [];

  for (let i = 0; i < updated.statements.length; ++i) {
    const updatedNode = updated.statements[i];
    const staleNode = stale.statements[i];

    if (ts.isClassDeclaration(updatedNode)) {
      if (!ts.isClassDeclaration(staleNode)) {
        return null;
      }

      // Check class declaration differences (name/heritage/modifiers)
      if (updatedNode.name?.text !== staleNode.name?.text) {
        return null;
      }
      if (!equalRangeText(updatedNode.heritageClauses, updated, staleNode.heritageClauses, stale)) {
        return null;
      }
      const updatedModifiers = ts.getModifiers(updatedNode);
      const staleModifiers = ts.getModifiers(staleNode);
      if (
        updatedModifiers?.length !== staleModifiers?.length ||
        !updatedModifiers?.every((updatedModifier) =>
          staleModifiers?.some((staleModifier) => updatedModifier.kind === staleModifier.kind),
        )
      ) {
        return null;
      }

      // Check for component class nodes
      const meta = compiler.getMeta(updatedNode);
      if (meta?.decorator && (meta as { isComponent?: boolean }).isComponent === true) {
        const updatedDecorators = ts.getDecorators(updatedNode);
        const staleDecorators = ts.getDecorators(staleNode);
        if (!staleDecorators || staleDecorators.length !== updatedDecorators?.length) {
          return null;
        }

        // TODO: Check other decorators instead of assuming all multi-decorator components are unsupported
        if (staleDecorators.length > 1) {
          return null;
        }

        // Find index of component metadata decorator
        const metaDecoratorIndex = updatedDecorators?.indexOf(meta.decorator);
        assert(
          metaDecoratorIndex !== undefined,
          'Component metadata decorator should always be present on component class.',
        );
        const updatedDecoratorExpression = meta.decorator.expression;
        assert(
          ts.isCallExpression(updatedDecoratorExpression) &&
            updatedDecoratorExpression.arguments.length === 1,
          'Component metadata decorator should contain a call expression with a single argument.',
        );

        // Check the matching stale index for the component decorator
        const staleDecoratorExpression = staleDecorators[metaDecoratorIndex]?.expression;
        if (
          !staleDecoratorExpression ||
          !ts.isCallExpression(staleDecoratorExpression) ||
          staleDecoratorExpression.arguments.length !== 1
        ) {
          return null;
        }

        // Check decorator name/expression
        // NOTE: This would typically be `Component` but can also be a property expression or some other alias.
        // To avoid complex checks, this ensures the textual representation does not change. This has a low chance
        // of a false positive if the expression is changed to still reference the `Component` type but has different
        // text. However, it is rare for `Component` to not be used directly and additionally unlikely that it would
        // be changed between edits. A false positive would also only lead to a difference of a full page reload versus
        // an HMR update.
        if (
          !equalRangeText(
            updatedDecoratorExpression.expression,
            updated,
            staleDecoratorExpression.expression,
            stale,
          )
        ) {
          return null;
        }

        // Compare component meta decorator object literals
        const analysis = analyzeMetaUpdates(
          staleDecoratorExpression,
          stale,
          updatedDecoratorExpression,
          updated,
        );
        if (analysis === MetaUpdateAnalysis.Unsupported) {
          return null;
        }

        // Compare text of the member nodes to determine if any changes have occurred
        if (!equalRangeText(updatedNode.members, updated, staleNode.members, stale)) {
          // A change to a member outside a component's metadata is unsupported
          return null;
        }

        // If all previous class checks passed, this class is supported for HMR updates
        if (analysis === MetaUpdateAnalysis.Supported) {
          candidates.push(updatedNode);
        }
        continue;
      }
    }

    // Compare text of the statement nodes to determine if any changes have occurred
    // TODO: Consider expanding this to check semantic updates for each node kind
    if (!equalRangeText(updatedNode, updated, staleNode, stale)) {
      // A change to a statement outside a component's metadata is unsupported
      return null;
    }
  }

  return candidates;
}

/**
 * The set of Angular component metadata fields that are supported by HMR updates.
 */
const SUPPORTED_FIELD_NAMES = new Set([
  'template',
  'templateUrl',
  'styles',
  'styleUrl',
  'stylesUrl',
]);

enum MetaUpdateAnalysis {
  Supported,
  Unsupported,
  None,
}

/**
 * Analyzes the metadata fields of a decorator call expression for unsupported HMR updates.
 * Only updates to supported fields can be present for HMR to be viable.
 * @param staleCall A call expression instance.
 * @param staleSource The source file instance containing the stale call instance.
 * @param updatedCall A call expression instance.
 * @param updatedSource The source file instance containing the updated call instance.
 * @returns A MetaUpdateAnalysis enum value.
 */
function analyzeMetaUpdates(
  staleCall: ts.CallExpression,
  staleSource: ts.SourceFile,
  updatedCall: ts.CallExpression,
  updatedSource: ts.SourceFile,
): MetaUpdateAnalysis {
  const staleObject = staleCall.arguments[0];
  const updatedObject = updatedCall.arguments[0];
  let hasSupportedUpdate = false;

  if (!ts.isObjectLiteralExpression(staleObject) || !ts.isObjectLiteralExpression(updatedObject)) {
    return MetaUpdateAnalysis.Unsupported;
  }

  const supportedFields = new Map<string, ts.Node>();
  const unsupportedFields: ts.Node[] = [];

  for (const property of staleObject.properties) {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
      // Unsupported object literal property
      return MetaUpdateAnalysis.Unsupported;
    }

    const name = property.name.text;
    if (SUPPORTED_FIELD_NAMES.has(name)) {
      supportedFields.set(name, property.initializer);
      continue;
    }

    unsupportedFields.push(property.initializer);
  }

  let i = 0;
  for (const property of updatedObject.properties) {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
      // Unsupported object literal property
      return MetaUpdateAnalysis.Unsupported;
    }

    const name = property.name.text;
    if (SUPPORTED_FIELD_NAMES.has(name)) {
      const staleInitializer = supportedFields.get(name);
      // If the supported field was added or has its content changed, there has been a supported update
      if (
        !staleInitializer ||
        !equalRangeText(property.initializer, updatedSource, staleInitializer, staleSource)
      ) {
        hasSupportedUpdate = true;
      }
      // Remove the field entry to allow tracking removed fields
      supportedFields.delete(name);
      continue;
    }

    // Compare in order
    if (!equalRangeText(property.initializer, updatedSource, unsupportedFields[i++], staleSource)) {
      return MetaUpdateAnalysis.Unsupported;
    }
  }

  if (i !== unsupportedFields.length) {
    return MetaUpdateAnalysis.Unsupported;
  }

  // Any remaining supported field indicates a field removal. This is also considered a supported update.
  hasSupportedUpdate ||= supportedFields.size > 0;

  return hasSupportedUpdate ? MetaUpdateAnalysis.Supported : MetaUpdateAnalysis.None;
}

/**
 * Compares the text from a provided range in a source file to the text of a range in a second source file.
 * The comparison avoids making any intermediate string copies.
 * @param firstRange A text range within the first source file.
 * @param firstSource A source file instance.
 * @param secondRange A text range within the second source file.
 * @param secondSource A source file instance.
 * @returns true, if the text from both ranges is equal; false, otherwise.
 */
function equalRangeText(
  firstRange: ts.ReadonlyTextRange | undefined,
  firstSource: ts.SourceFile,
  secondRange: ts.ReadonlyTextRange | undefined,
  secondSource: ts.SourceFile,
): boolean {
  // Check matching undefined values
  if (!firstRange || !secondRange) {
    return firstRange === secondRange;
  }

  // Ensure lengths are equal
  const firstLength = firstRange.end - firstRange.pos;
  const secondLength = secondRange.end - secondRange.pos;
  if (firstLength !== secondLength) {
    return false;
  }

  // Check each character
  for (let i = 0; i < firstLength; ++i) {
    const firstChar = firstSource.text.charCodeAt(i + firstRange.pos);
    const secondChar = secondSource.text.charCodeAt(i + secondRange.pos);
    if (firstChar !== secondChar) {
      return false;
    }
  }

  return true;
}
