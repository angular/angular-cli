/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuilderWatcherCallback,
  BuilderWatcherFactory,
} from '../webpack/plugins/builder-watch-plugin';

class WatcherDescriptor {
  constructor(
    readonly files: ReadonlySet<string>,
    readonly directories: ReadonlySet<string>,
    readonly callback: BuilderWatcherCallback,
  ) {}

  shouldNotify(path: string): boolean {
    return true;
  }
}

export class WatcherNotifier implements BuilderWatcherFactory {
  private readonly descriptors = new Set<WatcherDescriptor>();

  notify(events: Iterable<{ path: string; type: 'modified' | 'deleted' }>): void {
    for (const descriptor of this.descriptors) {
      for (const { path } of events) {
        if (descriptor.shouldNotify(path)) {
          descriptor.callback([...events]);
          break;
        }
      }
    }
  }

  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    callback: BuilderWatcherCallback,
  ): { close(): void } {
    const descriptor = new WatcherDescriptor(new Set(files), new Set(directories), callback);
    this.descriptors.add(descriptor);

    return { close: () => this.descriptors.delete(descriptor) };
  }
}

export { BuilderWatcherFactory };
