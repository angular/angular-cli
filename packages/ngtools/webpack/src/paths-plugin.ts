/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import { CompilerOptions, MapLike } from 'typescript';

const getInnerRequest = require('enhanced-resolve/lib/getInnerRequest');

interface NormalModuleFactoryRequest {
  request: string;
  context: { issuer: string };
  contextInfo: { issuer: string };
  typescriptPathMapped?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypeScriptPathsPluginOptions extends Pick<CompilerOptions, 'paths' | 'baseUrl'> {}

export class TypeScriptPathsPlugin {
  constructor(private options?: TypeScriptPathsPluginOptions) {}

  update(options: TypeScriptPathsPluginOptions): void {
    this.options = options;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(resolver: any) {
    const target = resolver.ensureHook('resolve');
    const resolveAsync = (request: NormalModuleFactoryRequest, requestContext: {}) => {
      return new Promise<NormalModuleFactoryRequest | undefined>((resolve, reject) => {
        resolver.doResolve(
          target,
          request,
          '',
          requestContext,
          (error: Error | null, result: NormalModuleFactoryRequest | undefined) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );
      });
    };

    resolver
      .getHook('described-resolve')
      .tapPromise(
        'TypeScriptPathsPlugin',
        async (request: NormalModuleFactoryRequest, resolveContext: {}) => {
          if (!this.options) {
            throw new Error('TypeScriptPathsPlugin options were not provided.');
          }

          if (!request || request.typescriptPathMapped) {
            return;
          }

          const originalRequest = getInnerRequest(resolver, request);
          if (!originalRequest) {
            return;
          }

          // Only work on Javascript/TypeScript issuers.
          if (!request.context.issuer || !request.context.issuer.match(/\.[jt]sx?$/)) {
            return;
          }

          // Relative or absolute requests are not mapped
          if (originalRequest.startsWith('.') || originalRequest.startsWith('/')) {
            return;
          }

          // Ignore all webpack special requests
          if (originalRequest.startsWith('!!')) {
            return;
          }

          const replacements = findReplacements(originalRequest, this.options.paths || {});
          for (const potential of replacements) {
            const potentialRequest = {
              ...request,
              request: path.resolve(this.options.baseUrl || '', potential),
              typescriptPathMapped: true,
            };
            const result = await resolveAsync(potentialRequest, resolveContext);

            if (result) {
              return result;
            }
          }
        },
      );
  }
}

function findReplacements(originalRequest: string, paths: MapLike<string[]>): Iterable<string> {
  // check if any path mapping rules are relevant
  const pathMapOptions = [];
  for (const pattern in paths) {
    // get potentials and remove duplicates; JS Set maintains insertion order
    const potentials = Array.from(new Set(paths[pattern]));
    if (potentials.length === 0) {
      // no potential replacements so skip
      continue;
    }

    // can only contain zero or one
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) {
      if (pattern === originalRequest) {
        pathMapOptions.push({
          starIndex,
          partial: '',
          potentials,
        });
      }
    } else if (starIndex === 0 && pattern.length === 1) {
      if (potentials.length === 1 && potentials[0] === '*') {
        // identity mapping -> noop
        continue;
      }
      pathMapOptions.push({
        starIndex,
        partial: originalRequest,
        potentials,
      });
    } else if (starIndex === pattern.length - 1) {
      if (originalRequest.startsWith(pattern.slice(0, -1))) {
        pathMapOptions.push({
          starIndex,
          partial: originalRequest.slice(pattern.length - 1),
          potentials,
        });
      }
    } else {
      const [prefix, suffix] = pattern.split('*');
      if (originalRequest.startsWith(prefix) && originalRequest.endsWith(suffix)) {
        pathMapOptions.push({
          starIndex,
          partial: originalRequest.slice(prefix.length).slice(0, -suffix.length),
          potentials,
        });
      }
    }
  }

  if (pathMapOptions.length === 0) {
    return [];
  }

  // exact matches take priority then largest prefix match
  pathMapOptions.sort((a, b) => {
    if (a.starIndex === -1) {
      return -1;
    } else if (b.starIndex === -1) {
      return 1;
    } else {
      return b.starIndex - a.starIndex;
    }
  });

  const replacements: string[] = [];
  pathMapOptions.forEach((option) => {
    for (const potential of option.potentials) {
      let replacement;
      const starIndex = potential.indexOf('*');
      if (starIndex === -1) {
        replacement = potential;
      } else if (starIndex === potential.length - 1) {
        replacement = potential.slice(0, -1) + option.partial;
      } else {
        const [prefix, suffix] = potential.split('*');
        replacement = prefix + option.partial + suffix;
      }

      replacements.push(replacement);
    }
  });

  return replacements;
}
