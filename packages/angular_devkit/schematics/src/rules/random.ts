/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Source } from '../engine/interface';
import { HostTree } from '../tree/host-tree';


function generateStringOfLength(l: number) {
  return new Array(l).fill(0).map(_x => {
    return 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  }).join('');
}


function random(from: number, to: number) {
  return Math.floor(Math.random() * (to - from)) + from;
}


export interface RandomOptions {
  root?: string;
  multi?: boolean | number;
  multiFiles?: boolean | number;
}


export default function(options: RandomOptions): Source {
  return () => {
    const root = ('root' in options) ? options.root : '/';

    const map = new HostTree();
    const nbFiles = ('multiFiles' in options)
                  ? (typeof options.multiFiles == 'number' ? options.multiFiles : random(2, 12))
                  : 1;

    for (let i = 0; i < nbFiles; i++) {
      const path = 'a/b/c/d/e/f'.slice(Math.random() * 10);
      const fileName = generateStringOfLength(20);
      const content = generateStringOfLength(100);

      map.create(root + '/' + path + '/' + fileName, content);
    }

    return map;
  };
}
