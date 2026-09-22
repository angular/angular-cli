/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

declare module '*.md' {
  const content: string;
  export default content;
}

declare module '#version' {
  export const VERSION: string;
  export const SUPPORTED_NODE_VERSIONS: string;
  export const supportedNodeVersions: string[];
  export function isNodeVersionSupported(
    currentVersion?: string,
    supportedVersions?: string[],
  ): boolean;
  export function isNodeVersionRunnable(
    currentVersion?: string,
    supportedVersions?: string[],
  ): boolean;
}
