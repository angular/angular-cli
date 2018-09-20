/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NormalizedRoot, Path, PathFragment, join, split } from '../path';
import { ResolverHost } from './resolver';


/**
 * A Virtual Host that allow to alias some paths to other paths.
 *
 * This does not verify, when setting an alias, that the target or source exist. Neither does it
 * check whether it's a file or a directory. Please not that directories are also renamed/replaced.
 *
 * No recursion is done on the resolution, which means the following is perfectly valid then:
 *
 * ```
 *     host.aliases.set(normalize('/file/a'), normalize('/file/b'));
 *     host.aliases.set(normalize('/file/b'), normalize('/file/a'));
 * ```
 *
 * This will result in a proper swap of two files for each others.
 *
 * @example
 *   const host = new SimpleMemoryHost();
 *   host.write(normalize('/some/file'), content).subscribe();
 *
 *   const aHost = new AliasHost(host);
 *   aHost.read(normalize('/some/file'))
 *     .subscribe(x => expect(x).toBe(content));
 *   aHost.aliases.set(normalize('/some/file'), normalize('/other/path');
 *
 *   // This file will not exist because /other/path does not exist.
 *   aHost.read(normalize('/some/file'))
 *     .subscribe(undefined, err => expect(err.message).toMatch(/does not exist/));
 *
 * @example
 *   const host = new SimpleMemoryHost();
 *   host.write(normalize('/some/folder/file'), content).subscribe();
 *
 *   const aHost = new AliasHost(host);
 *   aHost.read(normalize('/some/folder/file'))
 *     .subscribe(x => expect(x).toBe(content));
 *   aHost.aliases.set(normalize('/some'), normalize('/other');
 *
 *   // This file will not exist because /other/path does not exist.
 *   aHost.read(normalize('/some/folder/file'))
 *     .subscribe(undefined, err => expect(err.message).toMatch(/does not exist/));
 *
 *   // Create the file with new content and verify that this has the new content.
 *   aHost.write(normalize('/other/folder/file'), content2).subscribe();
 *   aHost.read(normalize('/some/folder/file'))
 *     .subscribe(x => expect(x).toBe(content2));
 */
export class AliasHost<StatsT extends object = {}> extends ResolverHost<StatsT> {
  protected _aliases = new Map<Path, Path>();

  protected _resolve(path: Path) {
    let maybeAlias = this._aliases.get(path);
    const sp = split(path);
    const remaining: PathFragment[] = [];

    // Also resolve all parents of the requested files, only picking the first one that matches.
    // This can have surprising behaviour when aliases are inside another alias. It will always
    // use the closest one to the file.
    while (!maybeAlias && sp.length > 0) {
      const p = join(NormalizedRoot, ...sp);
      maybeAlias = this._aliases.get(p);

      if (maybeAlias) {
        maybeAlias = join(maybeAlias, ...remaining);
      }
      // Allow non-null-operator because we know sp.length > 0 (condition on while).
      remaining.unshift(sp.pop() !);  // tslint:disable-line:no-non-null-assertion
    }

    return maybeAlias || path;
  }

  get aliases(): Map<Path, Path> { return this._aliases; }
}
