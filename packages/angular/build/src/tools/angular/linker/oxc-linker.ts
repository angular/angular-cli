/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { EncodedSourceMap } from '@ampproject/remapping';
import remapping from '@ampproject/remapping';
import { ConsoleLogger, LogLevel } from '@angular/compiler-cli';
import type { DeclarationScope } from '@angular/compiler-cli/linker';
import { FileLinker, LinkerEnvironment, needsLinking } from '@angular/compiler-cli/linker';
import type {
  AbsoluteFsPath,
  ReadonlyFileSystem,
} from '@angular/compiler-cli/src/ngtsc/file_system';
import type { CallExpression, Node } from '@oxc-project/types';
import MagicString from 'magic-string';
import { parseSync, visitorKeys } from 'oxc-parser';
import { loadInputSourceMap } from '../../../utils/source-map';
import { OxcAstHost } from './oxc-ast-host';
import { StringAstFactory } from './string-ast-factory';

/**
 * A declaration scope that instructs the Angular compiler to emit constant pools
 * inside a local IIFE around each linked declaration rather than hoisting shared
 * constants to the module level.
 *
 * Preferred due to:
 * - In-Place String Replacement: Enables fast in-place string replacements in
 *   `MagicString` without parsing or mutating surrounding ES module statements.
 * - Better Tree-Shaking Locality: Component constants are strictly encapsulated
 *   within the component's `@__PURE__` IIFE closure (`(function() { ... })()`). If a
 *   bundler tree-shakes an unused component from a library FESM, all of its associated
 *   constants are automatically eliminated without leaving orphan top-level variables.
 * - Negligible Wire Size Impact: LZ77/Brotli compression deduplicates repeated IIFE
 *   wrappers and array literals over the wire to near-zero marginal cost.
 */
class InlineDeclarationScope implements DeclarationScope<unknown, unknown> {
  getConstantScopeRef(): null {
    return null;
  }
}

const noopFileSystem: ReadonlyFileSystem = {
  exists: () => false,
  readFile: () => '',
  resolve: (...paths: string[]) => paths.join('/'),
  dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
  relative: (_from: string, to: string) => to,
} as unknown as ReadonlyFileSystem;

const SHARED_LOGGER = new ConsoleLogger(LogLevel.info);

const SHARED_AST_HOST = new OxcAstHost();
const SHARED_DECLARATION_SCOPE = new InlineDeclarationScope();

/**
 * Recursively traverses ESTree AST nodes with subtree pruning.
 * When `onCallExpression` returns `true` for a linked `CallExpression`,
 * child traversal into `callee` and `arguments` is skipped.
 *
 * Why subtree pruning is safe for the linker:
 * - Angular partial declarations (`ɵɵngDeclareComponent`, `ɵɵngDeclareDirective`,
 *   etc.) are never nested inside each other.
 * - Once a declaration `CallExpression` is linked and replaced, there can never be
 *   another partial declaration within its metadata argument object. Pruning its
 *   subtree avoids traversing hundreds of unnecessary metadata argument nodes per
 *   component.
 */
function visitNode(
  node: Node | Node[] | null | undefined,
  onCallExpression: (node: CallExpression) => boolean,
): void {
  if (node === null || node === undefined || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      visitNode(node[i], onCallExpression);
    }

    return;
  }

  const nodeType = node.type;
  if (!nodeType) {
    return;
  }

  if (nodeType === 'CallExpression') {
    if (onCallExpression(node)) {
      // Subtree pruning: partial declarations cannot be nested, so skip child traversal.
      return;
    }
  }

  const keys = visitorKeys[nodeType];
  if (keys) {
    for (let i = 0; i < keys.length; i++) {
      const child = (node as unknown as Record<string, Node | Node[] | null | undefined>)[keys[i]];
      if (child !== undefined && child !== null) {
        visitNode(child, onCallExpression);
      }
    }
  }
}

export interface OxcLinkerOptions {
  sourcemap?: boolean;
  jit?: boolean;
  skipCheck?: boolean;
}

/**
 * Executes Angular partial declaration linking on the specified JavaScript file
 * using `oxc-parser` and `magic-string`.
 *
 * @param filename The full path to the file.
 * @param code The source code content.
 * @param options Linker options (sourcemap, jit, skipCheck).
 * @returns An object containing the transformed code and optional source map.
 */
export function linkWithOxc(filename: string, code: string, options: OxcLinkerOptions = {}) {
  if (!options.skipCheck && !needsLinking(filename, code)) {
    return { code, map: undefined };
  }

  const astFactory = new StringAstFactory(code);

  const linkerEnvironment = LinkerEnvironment.create(
    noopFileSystem,
    SHARED_LOGGER,
    SHARED_AST_HOST,
    astFactory,
    { linkerJitMode: options.jit ?? false },
  );

  const fileLinker = new FileLinker(linkerEnvironment, filename as AbsoluteFsPath, code);
  const { program } = parseSync(filename, code, { range: true });

  let s: MagicString | undefined;
  let hasLinked = false;

  visitNode(program, (node) => {
    const calleeName = SHARED_AST_HOST.getSymbolName(node.callee);
    if (calleeName && fileLinker.isPartialDeclaration(calleeName)) {
      const args = SHARED_AST_HOST.parseArguments(node);
      const linkedCode = fileLinker.linkPartialDeclaration(
        calleeName,
        args,
        SHARED_DECLARATION_SCOPE,
      );

      s ??= new MagicString(code);
      s.overwrite(node.start, node.end, linkedCode as string);
      hasLinked = true;

      return true;
    }

    return false;
  });

  if (!hasLinked || !s) {
    return { code, map: undefined };
  }

  let map: string | undefined;
  if (options.sourcemap) {
    const rawMap = s.generateMap({ hires: true, source: filename });
    const inputMap = loadInputSourceMap(filename, code);
    if (inputMap) {
      map = remapping([rawMap as EncodedSourceMap, inputMap], () => null).toString();
    } else {
      map = rawMap.toString();
    }
  }

  return {
    code: s.toString(),
    map,
  };
}
