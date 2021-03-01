/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CompilerHost } from '@angular/compiler-cli';
import { createHash } from 'crypto';
import * as path from 'path';
import * as ts from 'typescript';
import { NgccProcessor } from '../ngcc_processor';
import { WebpackResourceLoader } from '../resource_loader';
import { normalizePath } from './paths';

export function augmentHostWithResources(
  host: ts.CompilerHost,
  resourceLoader: WebpackResourceLoader,
  options: { directTemplateLoading?: boolean } = {},
) {
  const resourceHost = host as CompilerHost;

  resourceHost.readResource = function (fileName: string) {
    const filePath = normalizePath(fileName);

    if (
      options.directTemplateLoading &&
      (filePath.endsWith('.html') || filePath.endsWith('.svg'))
    ) {
      const content = this.readFile(filePath);
      if (content === undefined) {
        throw new Error('Unable to locate component resource: ' + fileName);
      }

      resourceLoader.setAffectedResources(filePath, [filePath]);

      return content;
    } else {
      return resourceLoader.get(filePath);
    }
  };

  resourceHost.resourceNameToFileName = function (resourceName: string, containingFile: string) {
    return path.resolve(path.dirname(containingFile), resourceName);
  };

  resourceHost.getModifiedResourceFiles = function () {
    return resourceLoader.getModifiedResourceFiles();
  };
}

function augmentResolveModuleNames(
  host: ts.CompilerHost,
  resolvedModuleModifier: (
    resolvedModule: ts.ResolvedModule | undefined,
    moduleName: string,
  ) => ts.ResolvedModule | undefined,
  moduleResolutionCache?: ts.ModuleResolutionCache,
): void {
  if (host.resolveModuleNames) {
    const baseResolveModuleNames = host.resolveModuleNames;
    host.resolveModuleNames = function (moduleNames: string[], ...parameters) {
      return moduleNames.map((name) => {
        const result = baseResolveModuleNames.call(host, [name], ...parameters);

        return resolvedModuleModifier(result[0], name);
      });
    };
  } else {
    host.resolveModuleNames = function (
      moduleNames: string[],
      containingFile: string,
      _reusedNames: string[] | undefined,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions,
    ) {
      return moduleNames.map((name) => {
        const result = ts.resolveModuleName(
          name,
          containingFile,
          options,
          host,
          moduleResolutionCache,
          redirectedReference,
        ).resolvedModule;

        return resolvedModuleModifier(result, name);
      });
    };
  }
}

export function augmentHostWithNgcc(
  host: ts.CompilerHost,
  ngcc: NgccProcessor,
  moduleResolutionCache?: ts.ModuleResolutionCache,
): void {
  augmentResolveModuleNames(
    host,
    (resolvedModule, moduleName) => {
      if (resolvedModule && ngcc) {
        ngcc.processModule(moduleName, resolvedModule);
      }

      return resolvedModule;
    },
    moduleResolutionCache,
  );

  if (host.resolveTypeReferenceDirectives) {
    const baseResolveTypeReferenceDirectives = host.resolveTypeReferenceDirectives;
    host.resolveTypeReferenceDirectives = function (names: string[], ...parameters) {
      return names.map((name) => {
        const result = baseResolveTypeReferenceDirectives.call(host, [name], ...parameters);

        if (result[0] && ngcc) {
          ngcc.processModule(name, result[0]);
        }

        return result[0];
      });
    };
  } else {
    host.resolveTypeReferenceDirectives = function (
      moduleNames: string[],
      containingFile: string,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions,
    ) {
      return moduleNames.map((name) => {
        const result = ts.resolveTypeReferenceDirective(
          name,
          containingFile,
          options,
          host,
          redirectedReference,
        ).resolvedTypeReferenceDirective;

        if (result && ngcc) {
          ngcc.processModule(name, result);
        }

        return result;
      });
    };
  }
}

export function augmentHostWithReplacements(
  host: ts.CompilerHost,
  replacements: Record<string, string>,
  moduleResolutionCache?: ts.ModuleResolutionCache,
): void {
  if (Object.keys(replacements).length === 0) {
    return;
  }

  const normalizedReplacements: Record<string, string> = {};
  for (const [key, value] of Object.entries(replacements)) {
    normalizedReplacements[normalizePath(key)] = normalizePath(value);
  }

  const tryReplace = (resolvedModule: ts.ResolvedModule | undefined) => {
    const replacement = resolvedModule && normalizedReplacements[resolvedModule.resolvedFileName];
    if (replacement) {
      return {
        resolvedFileName: replacement,
        isExternalLibraryImport: /[\/\\]node_modules[\/\\]/.test(replacement),
      };
    } else {
      return resolvedModule;
    }
  };

  augmentResolveModuleNames(host, tryReplace, moduleResolutionCache);
}

export function augmentHostWithSubstitutions(
  host: ts.CompilerHost,
  substitutions: Record<string, string>,
): void {
  const regexSubstitutions: [RegExp, string][] = [];
  for (const [key, value] of Object.entries(substitutions)) {
    regexSubstitutions.push([new RegExp(`\\b${key}\\b`, 'g'), value]);
  }

  if (regexSubstitutions.length === 0) {
    return;
  }

  const baseReadFile = host.readFile;
  host.readFile = function (...parameters) {
    let file: string | undefined = baseReadFile.call(host, ...parameters);
    if (file) {
      for (const entry of regexSubstitutions) {
        file = file.replace(entry[0], entry[1]);
      }
    }

    return file;
  };
}

export function augmentHostWithVersioning(host: ts.CompilerHost): void {
  const baseGetSourceFile = host.getSourceFile;
  host.getSourceFile = function (...parameters) {
    const file: (ts.SourceFile & { version?: string }) | undefined = baseGetSourceFile.call(
      host,
      ...parameters,
    );
    if (file && file.version === undefined) {
      file.version = createHash('sha256').update(file.text).digest('hex');
    }

    return file;
  };
}

export function augmentProgramWithVersioning(program: ts.Program): void {
  const baseGetSourceFiles = program.getSourceFiles;
  program.getSourceFiles = function (...parameters) {
    const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(
      ...parameters,
    );

    for (const file of files) {
      if (file.version === undefined) {
        file.version = createHash('sha256').update(file.text).digest('hex');
      }
    }

    return files;
  };
}

export function augmentHostWithCaching(
  host: ts.CompilerHost,
  cache: Map<string, ts.SourceFile>,
): void {
  const baseGetSourceFile = host.getSourceFile;
  host.getSourceFile = function (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
    // tslint:disable-next-line: trailing-comma
    ...parameters
  ) {
    if (!shouldCreateNewSourceFile && cache.has(fileName)) {
      return cache.get(fileName);
    }

    const file = baseGetSourceFile.call(
      host,
      fileName,
      languageVersion,
      onError,
      true,
      ...parameters,
    );

    if (file) {
      cache.set(fileName, file);
    }

    return file;
  };
}
