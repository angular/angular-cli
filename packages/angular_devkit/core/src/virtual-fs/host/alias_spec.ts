/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '..';
import { AliasHost } from './alias';
import { stringToFileBuffer } from './buffer';
import { SimpleMemoryHost } from './memory';

describe('AliasHost', () => {
  it('works as in the example', () => {
    const content = stringToFileBuffer('hello world');

    const host = new SimpleMemoryHost();
    host.write(normalize('/some/file'), content).subscribe();

    const aHost = new AliasHost(host);
    aHost.read(normalize('/some/file'))
      .subscribe(x => expect(x).toBe(content));
    aHost.aliases.set(normalize('/some/file'), normalize('/other/path'));

    // This file will not exist because /other/path does not exist.
    try {
      aHost.read(normalize('/some/file'))
        .subscribe(undefined, err => {
          expect(err.message).toMatch(/does not exist/);
        });
    } catch {
      // Ignore it. RxJS <6 still throw errors when they happen synchronously.
    }
  });

  it('works as in the example (2)', () => {
    const content = stringToFileBuffer('hello world');
    const content2 = stringToFileBuffer('hello world 2');

    const host = new SimpleMemoryHost();
    host.write(normalize('/some/folder/file'), content).subscribe();

    const aHost = new AliasHost(host);
    aHost.read(normalize('/some/folder/file'))
        .subscribe(x => expect(x).toBe(content));
    aHost.aliases.set(normalize('/some'), normalize('/other'));

    // This file will not exist because /other/path does not exist.
    try {
      aHost.read(normalize('/some/folder/file'))
        .subscribe(undefined, err => expect(err.message).toMatch(/does not exist/));
    } catch {}

    // Create the file with new content and verify that this has the new content.
    aHost.write(normalize('/other/folder/file'), content2).subscribe();
    aHost.read(normalize('/some/folder/file'))
        .subscribe(x => expect(x).toBe(content2));
  });
});
