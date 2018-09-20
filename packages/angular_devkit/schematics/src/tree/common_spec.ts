/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-non-null-assertion
import { normalize } from '@angular-devkit/core';
import { Tree } from './interface';


export interface VisitTestVisitSpec {
  root: string;
  expected?: string[];
  exception?: (spec: {path: string}) => Error;
  focus?: boolean;
}

export interface VisitTestSet {
  name: string;
  files: string[];
  visits: VisitTestVisitSpec[];
  focus?: boolean;
}

export interface VisitTestSpec {
  createTree: (paths: string[]) => Tree;
  sets: VisitTestSet[];
}

export function testTreeVisit({createTree, sets}: VisitTestSpec) {
  sets.forEach(({name, files: paths, visits, focus: focusSet}) => {
    visits.forEach(({root, expected, exception, focus}) => {
      if (expected == null) { expected = paths; }

      const that = focusSet || focus ? fit : it;
      that(`can visit: ${name} from ${root}`, () => {
        const tree = createTree(paths);

        const normalizedRoot = normalize(root);

        if (exception != null) {
          expect(() => tree.getDir(normalizedRoot).visit(() => {}))
          .toThrow(exception({path: normalizedRoot}));

          return;
        }

        const allPaths: string[] = [];
        tree.getDir(normalizedRoot)
          .visit((path, entry) => {
            expect(entry).not.toBeNull();
            expect(entry!.content.toString()).toEqual(path);
            allPaths.push(path);
          });

        expect(allPaths).toEqual(expected!);
      });
    });
  });
}
