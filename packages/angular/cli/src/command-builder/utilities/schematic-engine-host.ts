/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { RuleFactory, SchematicsException, Tree } from '@angular-devkit/schematics';
import { FileSystemCollectionDesc, NodeModulesEngineHost } from '@angular-devkit/schematics/tools';
import { readFileSync } from 'fs';
import { parse as parseJson } from 'jsonc-parser';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { Script } from 'vm';
import { assertIsError } from '../../utilities/error';

/**
 * Environment variable to control schematic package redirection
 */
const schematicRedirectVariable = process.env['NG_SCHEMATIC_REDIRECT']?.toLowerCase();

function shouldWrapSchematic(schematicFile: string, schematicEncapsulation: boolean): boolean {
  // Check environment variable if present
  switch (schematicRedirectVariable) {
    case '0':
    case 'false':
    case 'off':
    case 'none':
      return false;
    case 'all':
      return true;
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

  // Check for first-party Angular schematic packages
  // Angular schematics are safe to use in the wrapped VM context
  if (/\/node_modules\/@(?:angular|schematics|nguniversal)\//.test(normalizedSchematicFile)) {
    return true;
  }

  // Otherwise use the value of the schematic collection's encapsulation option (current default of false)
  return schematicEncapsulation;
}

export class SchematicEngineHost extends NodeModulesEngineHost {
  protected override _resolveReferenceString(
    refString: string,
    parentPath: string,
    collectionDescription?: FileSystemCollectionDesc,
  ) {
    const [path, name] = refString.split('#', 2);
    // Mimic behavior of ExportStringRef class used in default behavior
    const fullPath = path[0] === '.' ? resolve(parentPath ?? process.cwd(), path) : path;

    const referenceRequire = createRequire(__filename);
    const schematicFile = referenceRequire.resolve(fullPath, { paths: [parentPath] });

    if (shouldWrapSchematic(schematicFile, !!collectionDescription?.encapsulation)) {
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
    return super._resolveReferenceString(refString, parentPath, collectionDescription);
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
  const hostRequire = createRequire(__filename);
  const schematicRequire = createRequire(schematicFile);

  const customRequire = function (id: string) {
    if (legacyModules[id]) {
      // Provide compatibility modules for older versions of @angular/cdk
      return legacyModules[id];
    } else if (id.startsWith('schematics:')) {
      // Schematics built-in modules use the `schematics` scheme (similar to the Node.js `node` scheme)
      const builtinId = id.slice(11);
      const builtinModule = loadBuiltinModule(builtinId);
      if (!builtinModule) {
        throw new Error(
          `Unknown schematics built-in module '${id}' requested from schematic '${schematicFile}'`,
        );
      }

      return builtinModule;
    } else if (id.startsWith('@angular-devkit/') || id.startsWith('@schematics/')) {
      // Files should not redirect `@angular/core` and instead use the direct
      // dependency if available. This allows old major version migrations to continue to function
      // even though the latest major version may have breaking changes in `@angular/core`.
      if (id.startsWith('@angular-devkit/core')) {
        try {
          return schematicRequire(id);
        } catch (e) {
          assertIsError(e);
          if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
          }
        }
      }

      // Resolve from inside the `@angular/cli` project
      return hostRequire(id);
    } else if (id.startsWith('.') || id.startsWith('@angular/cdk')) {
      // Wrap relative files inside the schematic collection
      // Also wrap `@angular/cdk`, it contains helper utilities that import core schematic packages

      // Resolve from the original file
      const modulePath = schematicRequire.resolve(id);

      // Use cached module if available
      const cachedModule = moduleCache.get(modulePath);
      if (cachedModule) {
        return cachedModule;
      }

      // Do not wrap vendored third-party packages or JSON files
      if (
        !/[/\\]node_modules[/\\]@schematics[/\\]angular[/\\]third_party[/\\]/.test(modulePath) &&
        !modulePath.endsWith('.json')
      ) {
        // Wrap module and save in cache
        const wrappedModule = wrap(modulePath, dirname(modulePath), moduleCache)();
        moduleCache.set(modulePath, wrappedModule);

        return wrappedModule;
      }
    }

    // All others are required directly from the original file
    return schematicRequire(id);
  };

  // Setup a wrapper function to capture the module's exports
  const schematicCode = readFileSync(schematicFile, 'utf8');
  // `module` is required due to @angular/localize ng-add being in UMD format
  const headerCode = '(function() {\nvar exports = {};\nvar module = { exports };\n';
  const footerCode = exportName
    ? `\nreturn module.exports['${exportName}'];});`
    : '\nreturn module.exports;});';

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

function loadBuiltinModule(id: string): unknown {
  return undefined;
}
