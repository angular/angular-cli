/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getTestEntrypoints } from './find-tests';

const UNIX_ENTRYPOINTS_OPTIONS = {
  pathSeparator: '/',
  workspaceRoot: '/my/workspace/root',
  projectSourceRoot: '/my/workspace/root/src-root',
};

const WINDOWS_ENTRYPOINTS_OPTIONS = {
  pathSeparator: '\\',
  workspaceRoot: 'C:\\my\\workspace\\root',
  projectSourceRoot: 'C:\\my\\workspace\\root\\src-root',
};

describe('getTestEntrypoints', () => {
  for (const options of [UNIX_ENTRYPOINTS_OPTIONS, WINDOWS_ENTRYPOINTS_OPTIONS]) {
    describe(`with path separator "${options.pathSeparator}"`, () => {
      function joinWithSeparator(base: string, rel: string) {
        return `${base}${options.pathSeparator}${rel.replace(/\//g, options.pathSeparator)}`;
      }

      function getEntrypoints(workspaceRelative: string[], sourceRootRelative: string[] = []) {
        return getTestEntrypoints(
          [
            ...workspaceRelative.map((p) => joinWithSeparator(options.workspaceRoot, p)),
            ...sourceRootRelative.map((p) => joinWithSeparator(options.projectSourceRoot, p)),
          ],
          options,
        );
      }

      it('returns an empty map without test files', () => {
        expect(getEntrypoints([])).toEqual(new Map());
      });

      it('strips workspace root and/or project source root', () => {
        expect(getEntrypoints(['a/b.spec.js'], ['c/d.spec.js'])).toEqual(
          new Map<string, string>([
            ['spec-a-b.spec', joinWithSeparator(options.workspaceRoot, 'a/b.spec.js')],
            ['spec-c-d.spec', joinWithSeparator(options.projectSourceRoot, 'c/d.spec.js')],
          ]),
        );
      });

      it('adds unique prefixes to distinguish between similar names', () => {
        expect(getEntrypoints(['a/b/c/d.spec.js', 'a-b/c/d.spec.js'], ['a/b-c/d.spec.js'])).toEqual(
          new Map<string, string>([
            ['spec-a-b-c-d.spec', joinWithSeparator(options.workspaceRoot, 'a/b/c/d.spec.js')],
            ['spec-a-b-c-d-2.spec', joinWithSeparator(options.workspaceRoot, 'a-b/c/d.spec.js')],
            [
              'spec-a-b-c-d-3.spec',
              joinWithSeparator(options.projectSourceRoot, 'a/b-c/d.spec.js'),
            ],
          ]),
        );
      });
    });
  }
});
