/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '..';
import { stringToFileBuffer } from './buffer';
import { SimpleMemoryHost } from './memory';
import { PatternMatchingHost } from './pattern';

describe('PatternMatchingHost', () => {
  it('works for NativeScript', () => {
    const content = stringToFileBuffer('hello world');
    const content2 = stringToFileBuffer('hello world 2');

    const host = new SimpleMemoryHost();
    host.write(normalize('/some/file.tns.ts'), content).subscribe();

    const pHost = new PatternMatchingHost(host);
    pHost.read(normalize('/some/file.tns.ts'))
      .subscribe(x => expect(x).toBe(content));

    pHost.addPattern('**/*.tns.ts', path => {
      return normalize(path.replace(/\.tns\.ts$/, '.ts'));
    });

    // This file will not exist because /some/file.ts does not exist.
    try {
      pHost.read(normalize('/some/file.tns.ts'))
        .subscribe(undefined, err => {
          expect(err.message).toMatch(/does not exist/);
        });
    } catch {
      // Ignore it. RxJS <6 still throw errors when they happen synchronously.
    }

    // Create the file, it should exist now.
    pHost.write(normalize('/some/file.ts'), content2).subscribe();
    pHost.read(normalize('/some/file.tns.ts'))
      .subscribe(x => expect(x).toBe(content2));
  });
});
