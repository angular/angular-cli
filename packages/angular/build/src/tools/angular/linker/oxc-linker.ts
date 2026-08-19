/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ConsoleLogger, LogLevel } from '@angular/compiler-cli';
import { type DeclarationScope, FileLinker, LinkerEnvironment } from '@angular/compiler-cli/linker';
import type {
  AbsoluteFsPath,
  ReadonlyFileSystem,
} from '@angular/compiler-cli/src/ngtsc/file_system';
import type { CallExpression } from '@oxc-project/types';
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

let SHARED_LOGGER: ConsoleLogger;
let SHARED_AST_HOST: OxcAstHost;
let SHARED_DECLARATION_SCOPE: InlineDeclarationScope;

/**
 * Manages Angular partial declaration linking using Oxc AST nodes.
 */
export class OxcLinker {
  readonly #fileLinker: FileLinker<unknown, string, unknown, string | undefined>;

  constructor(filename: string, code: string, jit = false) {
    SHARED_LOGGER ??= new ConsoleLogger(LogLevel.info);
    SHARED_AST_HOST ??= new OxcAstHost();
    SHARED_DECLARATION_SCOPE ??= new InlineDeclarationScope();

    const astFactory = new StringAstFactory(code);
    const linkerEnvironment = LinkerEnvironment.create(
      noopFileSystem,
      SHARED_LOGGER,
      SHARED_AST_HOST,
      astFactory,
      { linkerJitMode: jit, sourceMapping: false },
    );

    this.#fileLinker = new FileLinker(linkerEnvironment, filename as AbsoluteFsPath, code);
  }

  /**
   * Attempts to link an Angular partial declaration CallExpression.
   *
   * @param node The CallExpression AST node to check and link.
   * @returns The linked code string if the node is a partial declaration, or undefined otherwise.
   */
  linkCallExpression(node: CallExpression): string | undefined {
    const calleeName = SHARED_AST_HOST.getSymbolName(node.callee);
    if (!calleeName || !this.#fileLinker.isPartialDeclaration(calleeName)) {
      return undefined;
    }

    const args = SHARED_AST_HOST.parseArguments(node);
    const linkedCode = this.#fileLinker.linkPartialDeclaration(
      calleeName,
      args,
      SHARED_DECLARATION_SCOPE,
    );

    return linkedCode as string;
  }
}
