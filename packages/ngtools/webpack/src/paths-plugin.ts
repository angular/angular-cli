/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as path from 'node:path';
import { CompilerOptions } from 'typescript';
import type { Resolver } from 'webpack';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypeScriptPathsPluginOptions extends Pick<CompilerOptions, 'paths' | 'baseUrl'> {}

// Extract ResolverRequest type from Webpack types since it is not directly exported
type ResolverRequest = NonNullable<Parameters<Parameters<Resolver['resolve']>[4]>[2]>;

interface PathPluginResolverRequest extends ResolverRequest {
  context?: {
    issuer?: string;
  };
  typescriptPathMapped?: boolean;
}

interface PathPattern {
  starIndex: number;
  prefix: string;
  suffix?: string;
  potentials: { hasStar: boolean; prefix: string; suffix?: string }[];
}

export class TypeScriptPathsPlugin {
  private baseUrl?: string;
  private patterns?: PathPattern[];

  constructor(options?: TypeScriptPathsPluginOptions) {
    if (options) {
      this.update(options);
    }
  }

  /**
   * Update the plugin with new path mapping option values.
   * The options will also be preprocessed to reduce the overhead of individual resolve actions
   * during a build.
   *
   * @param options The `paths` and `baseUrl` options from TypeScript's `CompilerOptions`.
   */
  update(options: TypeScriptPathsPluginOptions): void {
    this.baseUrl = options.baseUrl;
    this.patterns = undefined;

    if (options.paths) {
      for (const [pattern, potentials] of Object.entries(options.paths)) {
        // Ignore any entries that would not result in a new mapping
        if (potentials.length === 0 || potentials.every((potential) => potential === '*')) {
          continue;
        }

        const starIndex = pattern.indexOf('*');
        let prefix = pattern;
        let suffix;
        if (starIndex > -1) {
          prefix = pattern.slice(0, starIndex);
          if (starIndex < pattern.length - 1) {
            suffix = pattern.slice(starIndex + 1);
          }
        }

        this.patterns ??= [];
        this.patterns.push({
          starIndex,
          prefix,
          suffix,
          potentials: potentials.map((potential) => {
            const potentialStarIndex = potential.indexOf('*');
            if (potentialStarIndex === -1) {
              return { hasStar: false, prefix: potential };
            }

            return {
              hasStar: true,
              prefix: potential.slice(0, potentialStarIndex),
              suffix:
                potentialStarIndex < potential.length - 1
                  ? potential.slice(potentialStarIndex + 1)
                  : undefined,
            };
          }),
        });
      }

      // Sort patterns so that exact matches take priority then largest prefix match
      this.patterns?.sort((a, b) => {
        if (a.starIndex === -1) {
          return -1;
        } else if (b.starIndex === -1) {
          return 1;
        } else {
          return b.starIndex - a.starIndex;
        }
      });
    }
  }

  apply(resolver: Resolver): void {
    const target = resolver.ensureHook('resolve');

    // To support synchronous resolvers this hook cannot be promise based.
    // Webpack supports synchronous resolution with `tap` and `tapAsync` hooks.
    resolver
      .getHook('described-resolve')
      .tapAsync(
        'TypeScriptPathsPlugin',
        (request: PathPluginResolverRequest, resolveContext, callback) => {
          // Preprocessing of the options will ensure that `patterns` is either undefined or has elements to check
          if (!this.patterns) {
            callback();

            return;
          }

          if (!request || request.typescriptPathMapped) {
            callback();

            return;
          }

          const originalRequest = request.request || request.path;
          if (!originalRequest) {
            callback();

            return;
          }

          // Only work on Javascript/TypeScript issuers.
          if (!request?.context?.issuer?.match(/\.[cm]?[jt]sx?$/)) {
            callback();

            return;
          }

          // Absolute requests are not mapped
          if (path.isAbsolute(originalRequest)) {
            callback();

            return;
          }

          switch (originalRequest[0]) {
            case '.':
              // Relative requests are not mapped
              callback();

              return;
            case '!':
              // Ignore all webpack special requests
              if (originalRequest.length > 1 && originalRequest[1] === '!') {
                callback();

                return;
              }
              break;
          }

          // A generator is used to limit the amount of replacements requests that need to be created.
          // For example, if the first one resolves, any others are not needed and do not need
          // to be created.
          const requests = this.createReplacementRequests(request, originalRequest);

          const tryResolve = () => {
            const next = requests.next();
            if (next.done) {
              callback();

              return;
            }

            resolver.doResolve(
              target,
              next.value,
              '',
              resolveContext,
              (error: Error | null | undefined, result: ResolverRequest | null | undefined) => {
                if (error) {
                  callback(error);
                } else if (result) {
                  callback(undefined, result);
                } else {
                  tryResolve();
                }
              },
            );
          };

          tryResolve();
        },
      );
  }

  *findReplacements(originalRequest: string): IterableIterator<string> {
    if (!this.patterns) {
      return;
    }

    // check if any path mapping rules are relevant
    for (const { starIndex, prefix, suffix, potentials } of this.patterns) {
      let partial;

      if (starIndex === -1) {
        // No star means an exact match is required
        if (prefix === originalRequest) {
          partial = '';
        }
      } else if (starIndex === 0 && !suffix) {
        // Everything matches a single wildcard pattern ("*")
        partial = originalRequest;
      } else if (!suffix) {
        // No suffix means the star is at the end of the pattern
        if (originalRequest.startsWith(prefix)) {
          partial = originalRequest.slice(prefix.length);
        }
      } else {
        // Star was in the middle of the pattern
        if (originalRequest.startsWith(prefix) && originalRequest.endsWith(suffix)) {
          partial = originalRequest.substring(
            prefix.length,
            originalRequest.length - suffix.length,
          );
        }
      }

      // If request was not matched, move on to the next pattern
      if (partial === undefined) {
        continue;
      }

      // Create the full replacement values based on the original request and the potentials
      // for the successfully matched pattern.
      for (const { hasStar, prefix, suffix } of potentials) {
        let replacement = prefix;

        if (hasStar) {
          replacement += partial;
          if (suffix) {
            replacement += suffix;
          }
        }

        yield replacement;
      }
    }
  }

  *createReplacementRequests(
    request: PathPluginResolverRequest,
    originalRequest: string,
  ): IterableIterator<PathPluginResolverRequest> {
    for (const replacement of this.findReplacements(originalRequest)) {
      const targetPath = path.resolve(this.baseUrl ?? '', replacement);
      // Resolution in the original callee location, but with the updated request
      // to point to the mapped target location.
      yield {
        ...request,
        request: targetPath,
        typescriptPathMapped: true,
      };

      // If there is no extension. i.e. the target does not refer to an explicit
      // file, then this is a candidate for module/package resolution.
      const canBeModule = path.extname(targetPath) === '';
      if (canBeModule) {
        // Resolution in the target location, preserving the original request.
        // This will work with the `resolve-in-package` resolution hook, supporting
        // package exports for e.g. locally-built APF libraries.
        yield {
          ...request,
          path: targetPath,
          typescriptPathMapped: true,
        };
      }
    }
  }
}
