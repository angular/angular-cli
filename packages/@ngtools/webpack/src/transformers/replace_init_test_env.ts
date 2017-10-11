import * as ts from 'typescript';

import { findAstNodes } from './ast_helpers';
import { TransformOperation, AddNodeOperation } from './make_transform';
import { insertImport } from './insert_import';

export function replaceInitTestEnv(
  sourceFile: ts.SourceFile,
  modules: { path: string, className: string }[]
): TransformOperation[] {
  if (modules.length === 0) {
    return;
  }

  const ops: TransformOperation[] = [];

  // Find the initTestEnvironment calls.
  const initTestEnvIdentifiers = findAstNodes<ts.Identifier>(null, sourceFile,
    ts.SyntaxKind.Identifier, true)
    .filter(identifier => identifier.getText() === 'initTestEnvironment');

  if (initTestEnvIdentifiers.length === 0) {
    return [];
  }

  const moduleNgSummaries = modules.map((mod) => {
    return {
      className: mod.className + 'NgSummary',
      path: mod.path + '.ngsummary',
    };
  });

  moduleNgSummaries.forEach((moduleNgSummary) =>
    ops.push(...insertImport(sourceFile, moduleNgSummary.className, moduleNgSummary.path)));

  initTestEnvIdentifiers.forEach((initTestEnvIdentifier) => {
    if (initTestEnvIdentifier.parent.parent.kind !== ts.SyntaxKind.CallExpression) {
      return;
    }
    const initTestEnvCall = initTestEnvIdentifier.parent.parent as ts.CallExpression;
    if (initTestEnvCall.arguments.length !== 2) {
      return;
    }
    const lastArgument = initTestEnvCall.arguments[initTestEnvCall.arguments.length - 1];
    const ngSummariesArray = ts.createArrayLiteral(moduleNgSummaries.map((summary) =>
      ts.createIdentifier(summary.className), true));
    const aotSummariesFn = ts.createArrowFunction([], [], [], undefined,
      ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ngSummariesArray);
    ops.push(new AddNodeOperation(sourceFile, lastArgument, null, aotSummariesFn));
  });

  return ops;
}
