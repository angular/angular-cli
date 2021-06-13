/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { RuleFactory, SchematicsException, Tree } from '@angular-devkit/schematics';
import { NodeModulesEngineHost } from '@angular-devkit/schematics/tools';
import { readFileSync } from 'fs';
import { parse as parseJson } from 'jsonc-parser';
import nodeModule from 'module';
import { dirname, resolve } from 'path';
import { Script } from 'vm';

/**
 * Environment variable to control schematic package redirection
 * Default: Angular schematics only
 */
const schematicRedirectVariable = process.env['NG_SCHEMATIC_REDIRECT']?.toLowerCase();

function shouldWrapSchematic(schematicFile: string): boolean {
  // Check environment variable if present
  if (schematicRedirectVariable !== undefined) {
    switch (schematicRedirectVariable) {
      case '0':
      case 'false':
      case 'off':
      case 'none':
        return false;
      case 'all':
        return true;
    }
  }

  const normalizedSchematicFile = schematicFile.replace(/\\/g, '/');
  // Never wrap the internal update schematic when executed directly
  // It communicates with the update command via `global`
  // But we still want to redirect schematics located in `@angular/cli/node_modules`.
  if (
    normalizedSchematicFile.includes('node_modules/@angular/cli/') &&
    !normalizedSchematicFile.includes('node_modules/@angular/cli/node_modules/')
  ) {
    return false;
  }

  // Default is only first-party Angular schematic packages
  // Angular schematics are safe to use in the wrapped VM context
  return /\/node_modules\/@(?:angular|schematics|nguniversal)\//.test(normalizedSchematicFile);
}

export class SchematicEngineHost extends NodeModulesEngineHost {
  protected override _resolveReferenceString(refString: string, parentPath: string) {
    const [path, name] = refString.split('#', 2);
    // Mimic behavior of ExportStringRef class used in default behavior
    const fullPath = path[0] === '.' ? resolve(parentPath ?? process.cwd(), path) : path;

    const schematicFile = require.resolve(fullPath, { paths: [parentPath] });

    if (shouldWrapSchematic(schematicFile)) {
      const schematicPath = dirname(schematicFile);

      const moduleCache = new Map<string, unknown>();
      const factoryInitializer = wrap(
        schematicFile,
        schematicPath,
        moduleCache,
        name || 'default',
      ) as () => RuleFactory<{}>;

      const factory = factoryInitializer();
      if (!factory || typeof factory !== 'function') {
        return null;
      }

      return { ref: factory, path: schematicPath };
    }

    // All other schematics use default behavior
    return super._resolveReferenceString(refString, parentPath);
  }
}

/**
 * Minimal shim modules for legacy deep imports of `@schematics/angular`
 */
const legacyModules: Record<string, unknown> = {
  '@schematics/angular/utility/config': {
    getWorkspace(host: Tree) {
      const path = '/.angular.json';
      const data = host.read(path);
      if (!data) {
        throw new SchematicsException(`Could not find (${path})`);
      }

      return parseJson(data.toString(), [], { allowTrailingComma: true });
    },
  },
  '@schematics/angular/utility/project': {
    buildDefaultPath(project: { sourceRoot?: string; root: string; projectType: string }): string {
      const root = project.sourceRoot ? `/${project.sourceRoot}/` : `/${project.root}/src/`;

      return `${root}${project.projectType === 'application' ? 'app' : 'lib'}`;
    },
  },
};

/**
 * Wrap a JavaScript file in a VM context to allow specific Angular dependencies to be redirected.
 * This VM setup is ONLY intended to redirect dependencies.
 *
 * @param schematicFile A JavaScript schematic file path that should be wrapped.
 * @param schematicDirectory A directory that will be used as the location of the JavaScript file.
 * @param moduleCache A map to use for caching repeat module usage and proper `instanceof` support.
 * @param exportName An optional name of a specific export to return. Otherwise, return all exports.
 */
function wrap(
  schematicFile: string,
  schematicDirectory: string,
  moduleCache: Map<string, unknown>,
  exportName?: string,
): () => unknown {
  const scopedRequire = nodeModule.createRequire(schematicFile);

  const customRequire = function (id: string) {
    if (legacyModules[id]) {
      // Provide compatibility modules for older versions of @angular/cdk
      return legacyModules[id];
    } else if (id.startsWith('@angular-devkit/') || id.startsWith('@schematics/')) {
      // Resolve from inside the `@angular/cli` project
      const packagePath = require.resolve(id);

      return require(packagePath);
    } else if (id.startsWith('.') || id.startsWith('@angular/cdk')) {
      // Wrap relative files inside the schematic collection
      // Also wrap `@angular/cdk`, it contains helper utilities that import core schematic packages

      // Resolve from the original file
      const modulePath = scopedRequire.resolve(id);

      // Use cached module if available
      const cachedModule = moduleCache.get(modulePath);
      if (cachedModule) {
        return cachedModule;
      }

      // Do not wrap vendored third-party packages or JSON files
      if (
        !/[\/\\]node_modules[\/\\]@schematics[\/\\]angular[\/\\]third_party[\/\\]/.test(
          modulePath,
        ) &&
        !modulePath.endsWith('.json')
      ) {
        // Wrap module and save in cache
        const wrappedModule = wrap(modulePath, dirname(modulePath), moduleCache)();
        moduleCache.set(modulePath, wrappedModule);

        return wrappedModule;
      }
    }

    // All others are required directly from the original file
    return scopedRequire(id);
  };

  // Setup a wrapper function to capture the module's exports
  const schematicCode = readFileSync(schematicFile, 'utf8');
  // `module` is required due to @angular/localize ng-add being in UMD format
  const headerCode = '(function() {\nvar exports = {};\nvar module = { exports };\n';
  const footerCode = exportName ? `\nreturn exports['${exportName}'];});` : '\nreturn exports;});';

  const script = new Script(headerCode + schematicCode + footerCode, {
    filename: schematicFile,
    lineOffset: 3,
  });

  const context = {
    __dirname: schematicDirectory,
    __filename: schematicFile,
    Buffer,
    console,
    process,
    get global() {
      return this;
    },
    require: customRequire,
  };

  const exportsFactory = script.runInNewContext(context);

  return exportsFactory;
}
