/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ParcelWatcher from '@parcel/watcher';
import type * as Chokidar from 'chokidar';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { toPosixPath } from '../../utils/path';

export class ChangedFiles {
  readonly added = new Set<string>();
  readonly modified = new Set<string>();
  readonly removed = new Set<string>();

  get all(): string[] {
    return Array.from(new Set([...this.added, ...this.modified, ...this.removed]));
  }

  toDebugString(): string {
    const content = {
      added: Array.from(this.added),
      modified: Array.from(this.modified),
      removed: Array.from(this.removed),
    };

    return JSON.stringify(content, null, 2);
  }
}

export interface BuildWatcher extends AsyncIterableIterator<ChangedFiles> {
  add(paths: string | readonly string[]): void;
  remove(paths: string | readonly string[]): void;
  close(): Promise<void>;
}

export interface WatcherOptions {
  polling?: boolean;
  interval?: number;
  ignored?: string[];
  followSymlinks?: boolean;
  cwd?: string;
}

/**
 * Probes the filesystem at the specified target directory to determine whether it is case-sensitive.
 */
function isFileSystemCaseSensitive(targetDir: string = process.cwd()): boolean {
  try {
    const resolved = path.resolve(targetDir);
    if (!fs.existsSync(resolved)) {
      return process.platform !== 'win32' && process.platform !== 'darwin';
    }

    // Invert the casing of the target directory path.
    const altCase =
      resolved === resolved.toLowerCase() ? resolved.toUpperCase() : resolved.toLowerCase();

    // If the path contains no alphabetic characters (e.g. root '/'), invert-casing
    // produces the exact same string. Fall back to platform-specific defaults in this case.
    if (resolved === altCase) {
      return process.platform !== 'win32' && process.platform !== 'darwin';
    }

    // If both the original path and the inverted-casing path exist on disk,
    // the filesystem is case-insensitive (returns false).
    return !fs.existsSync(altCase);
  } catch {
    // If an error occurs (e.g., permission denied), default to the platform-specific
    // behavior (case-insensitive on Windows/macOS, sensitive on Linux/Unix).
    return process.platform !== 'win32' && process.platform !== 'darwin';
  }
}

/**
 * Normalizes a file system path string to POSIX format (forward slashes '/')
 * and strips trailing slashes (except root '/' or Windows drive root 'C:/').
 */
export function toPosixPathNormalized(pathString: string): string {
  let posixPath = toPosixPath(pathString);
  if (posixPath.length > 1 && posixPath.endsWith('/') && !/^[a-zA-Z]:\/$/.test(posixPath)) {
    posixPath = posixPath.slice(0, -1);
  }

  return posixPath;
}

/**
 * Returns a lookup key for set lookups and matching, lowercasing on case-insensitive file systems.
 */
function toLookupKey(posixPath: string, isCaseSensitive: boolean): string {
  return isCaseSensitive ? posixPath : posixPath.toLowerCase();
}

/**
 * Returns the parent directory of a normalized POSIX path, correctly handling Windows drive roots.
 */
export function getDirectoryPath(posixPath: string): string {
  const lastSlash = posixPath.lastIndexOf('/');
  if (lastSlash === -1) {
    return '.';
  }
  const dir = posixPath.slice(0, lastSlash);
  if (dir === '' || dir.endsWith(':')) {
    return dir + '/';
  }

  return dir;
}

/**
 * Determines whether a file path lookup key or any of its parent directories are present in watchedFiles.
 */
function isPathWatched(fileLookupKey: string, watchedFiles: Set<string>): boolean {
  if (watchedFiles.has(fileLookupKey)) {
    return true;
  }

  let current = fileLookupKey;
  while (true) {
    const parent = getDirectoryPath(current);
    if (parent === current) {
      break;
    }
    if (watchedFiles.has(parent)) {
      return true;
    }
    current = parent;
  }

  return false;
}

class WatcherQueue {
  private readonly nextQueue: ((value?: ChangedFiles) => void)[] = [];
  private currentChangedFiles: ChangedFiles | undefined;
  private isClosed = false;
  private timeoutId: NodeJS.Timeout | undefined;

  addChange(type: 'added' | 'modified' | 'removed', file: string): void {
    if (this.isClosed) {
      return;
    }

    const changedFiles = (this.currentChangedFiles ??= new ChangedFiles());
    changedFiles[type].add(file);
    this.scheduleFlush();
  }

  addChanges(
    changes: ReadonlyArray<{ type: 'added' | 'modified' | 'removed'; file: string }>,
  ): void {
    if (this.isClosed || changes.length === 0) {
      return;
    }

    const changedFiles = (this.currentChangedFiles ??= new ChangedFiles());
    for (const { type, file } of changes) {
      changedFiles[type].add(file);
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = undefined;
      this.flush();
    }, 250);
  }

  private flush(): void {
    if (
      this.currentChangedFiles &&
      this.currentChangedFiles.all.length > 0 &&
      this.nextQueue.length > 0
    ) {
      const next = this.nextQueue.shift();
      if (next) {
        const result = this.currentChangedFiles;
        this.currentChangedFiles = undefined;
        next(result);
      }
    }
  }

  async next(): Promise<IteratorResult<ChangedFiles>> {
    if (
      this.currentChangedFiles &&
      this.currentChangedFiles.all.length > 0 &&
      this.nextQueue.length === 0 &&
      !this.timeoutId
    ) {
      const result = { value: this.currentChangedFiles };
      this.currentChangedFiles = undefined;

      return result;
    }

    if (this.isClosed) {
      return { done: true, value: undefined as unknown as ChangedFiles };
    }

    return new Promise((resolve) => {
      this.nextQueue.push((value) =>
        resolve(value ? { value } : { done: true, value: undefined as unknown as ChangedFiles }),
      );
    });
  }

  close(): void {
    if (this.isClosed) {
      return;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    this.isClosed = true;
    this.currentChangedFiles = undefined;

    let next;
    while ((next = this.nextQueue.shift()) !== undefined) {
      next();
    }
  }
}

export async function createWatcher(options?: WatcherOptions): Promise<BuildWatcher> {
  if (options?.polling) {
    return createChokidarWatcher(options);
  }

  try {
    const parcelWatcher = await import('@parcel/watcher');

    return await createParcelWatcher(options, parcelWatcher);
  } catch {
    return createChokidarWatcher(options);
  }
}

/**
 * Checks whether a file path is located inside a parent directory.
 *
 * Input Expectations:
 * - Both `file` and `dir` must be normalized POSIX-style paths (using forward slashes '/').
 * - Both paths must share the same casing normalization (e.g., lowercased on case-insensitive file systems).
 */
export function isPathInside(file: string, dir: string): boolean {
  if (file === dir) {
    return false;
  }

  const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';

  return file.startsWith(dirWithSlash);
}

class ParcelExternalManager {
  private readonly extraSubscriptions = new Map<string, ParcelWatcher.AsyncSubscription>();
  private readonly pendingSubscriptions = new Map<
    string,
    Promise<ParcelWatcher.AsyncSubscription>
  >();
  private readonly externalDirFiles = new Map<string, { dirPath: string; files: Set<string> }>();

  constructor(
    private readonly parcelWatcher: typeof ParcelWatcher,
    private readonly options: WatcherOptions | undefined,
    private readonly rootDirLookupKey: string,
    private readonly handleEvents: (events: ParcelWatcher.Event[]) => void,
  ) {}

  async ensureWatched(posixPath: string, lookupKey: string): Promise<void> {
    if (isPathInside(lookupKey, this.rootDirLookupKey) || lookupKey === this.rootDirLookupKey) {
      return;
    }

    const dirPath = getDirectoryPath(posixPath);
    const dirKey = getDirectoryPath(lookupKey);
    let dirEntry = this.externalDirFiles.get(dirKey);
    if (!dirEntry) {
      dirEntry = { dirPath, files: new Set<string>() };
      this.externalDirFiles.set(dirKey, dirEntry);
    }
    dirEntry.files.add(lookupKey);

    await this.ensureDirWatched(dirPath, dirKey);
  }

  removeFile(lookupKey: string): void {
    if (isPathInside(lookupKey, this.rootDirLookupKey) || lookupKey === this.rootDirLookupKey) {
      return;
    }

    const dirKey = getDirectoryPath(lookupKey);
    const dirEntry = this.externalDirFiles.get(dirKey);
    if (dirEntry) {
      dirEntry.files.delete(lookupKey);
      if (dirEntry.files.size === 0) {
        this.externalDirFiles.delete(dirKey);
        const sub = this.extraSubscriptions.get(dirKey);
        if (sub) {
          this.extraSubscriptions.delete(dirKey);
          sub.unsubscribe().catch(() => {});

          for (const [remainingDirKey, remainingDirEntry] of this.externalDirFiles.entries()) {
            if (!this.isCoveredByExistingExternal(remainingDirKey)) {
              this.ensureDirWatched(remainingDirEntry.dirPath, remainingDirKey).catch(() => {});
            }
          }
        }
      }
    }
  }

  async close(): Promise<void> {
    try {
      if (this.pendingSubscriptions.size > 0) {
        await Promise.allSettled(Array.from(this.pendingSubscriptions.values()));
      }
      if (this.extraSubscriptions.size > 0) {
        await Promise.allSettled(
          Array.from(this.extraSubscriptions.values()).map((sub) => sub.unsubscribe()),
        );
      }
    } finally {
      this.extraSubscriptions.clear();
      this.pendingSubscriptions.clear();
      this.externalDirFiles.clear();
    }
  }

  private isCoveredByExistingExternal(dirLookupKey: string): boolean {
    for (const existingDir of this.extraSubscriptions.keys()) {
      if (dirLookupKey === existingDir || isPathInside(dirLookupKey, existingDir)) {
        return true;
      }
    }
    for (const pendingDir of this.pendingSubscriptions.keys()) {
      if (dirLookupKey === pendingDir || isPathInside(dirLookupKey, pendingDir)) {
        return true;
      }
    }

    return false;
  }

  private async ensureDirWatched(dirPath: string, dirKey: string): Promise<void> {
    if (this.isCoveredByExistingExternal(dirKey)) {
      return;
    }

    const subPromise = this.parcelWatcher.subscribe(
      dirPath,
      (err, events) => {
        if (!err) {
          this.handleEvents(events);
        }
      },
      {
        ignore: this.options?.ignored,
      },
    );

    this.pendingSubscriptions.set(dirKey, subPromise);

    try {
      const sub = await subPromise;
      if (this.externalDirFiles.has(dirKey) && !this.isCoveredByExistingExternal(dirKey)) {
        this.extraSubscriptions.set(dirKey, sub);

        // Subsume any nested child subscriptions that are now covered by this parent subscription
        for (const [childDir, childSub] of this.extraSubscriptions.entries()) {
          if (childDir !== dirKey && isPathInside(childDir, dirKey)) {
            this.extraSubscriptions.delete(childDir);
            childSub.unsubscribe().catch(() => {});
          }
        }
      } else {
        sub.unsubscribe().catch(() => {});
      }
    } catch {
      // Ignore subscription errors for missing or restricted external directories
    } finally {
      this.pendingSubscriptions.delete(dirKey);
    }
  }
}

async function createParcelWatcher(
  options: WatcherOptions | undefined,
  parcelWatcher: typeof ParcelWatcher,
): Promise<BuildWatcher> {
  const watchedFiles = new Set<string>();
  const queue = new WatcherQueue();

  const isCaseSensitive = isFileSystemCaseSensitive(options?.cwd);
  const rootDirPosix = toPosixPathNormalized(options?.cwd ?? process.cwd());
  const rootDirLookupKey = toLookupKey(rootDirPosix, isCaseSensitive);
  const initTime = Date.now();

  const handleEvents = (events: ParcelWatcher.Event[]) => {
    const changes: { type: 'added' | 'modified' | 'removed'; file: string }[] = [];
    for (const event of events) {
      const posixPath = toPosixPathNormalized(event.path);
      const lookupKey = toLookupKey(posixPath, isCaseSensitive);
      if (!isPathWatched(lookupKey, watchedFiles)) {
        continue;
      }

      if (event.type !== 'delete') {
        const stat = fs.statSync(event.path, { throwIfNoEntry: false });
        // Ignore historical events from before watcher initialization, but allow a 1000 ms window
        // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
        // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
        if (stat && stat.mtimeMs < initTime - 1000) {
          continue;
        }
      }

      const type =
        event.type === 'create' ? 'added' : event.type === 'delete' ? 'removed' : 'modified';
      changes.push({ type, file: event.path });
    }

    if (changes.length > 0) {
      queue.addChanges(changes);
    }
  };

  const subscription = await parcelWatcher.subscribe(
    rootDirPosix,
    (err, events) => {
      if (!err) {
        handleEvents(events);
      }
    },
    {
      ignore: options?.ignored,
    },
  );

  const externalManager = new ParcelExternalManager(
    parcelWatcher,
    options,
    rootDirLookupKey,
    handleEvents,
  );

  const buildWatcher: BuildWatcher = {
    [Symbol.asyncIterator]() {
      return this;
    },

    next() {
      return queue.next();
    },

    add(paths) {
      const targets = typeof paths === 'string' ? [paths] : paths;
      for (const file of targets) {
        const posixPath = toPosixPathNormalized(file);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (!watchedFiles.has(lookupKey)) {
          watchedFiles.add(lookupKey);
          void externalManager.ensureWatched(posixPath, lookupKey);
        }
      }
    },

    remove(paths) {
      const targets = typeof paths === 'string' ? [paths] : paths;
      for (const file of targets) {
        const posixPath = toPosixPathNormalized(file);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (watchedFiles.delete(lookupKey)) {
          externalManager.removeFile(lookupKey);
        }
      }
    },

    async close() {
      try {
        if (subscription) {
          await subscription.unsubscribe();
        }
        await externalManager.close();
      } finally {
        queue.close();
      }
    },
  };

  return buildWatcher;
}

async function createChokidarWatcher(
  options?: WatcherOptions,
  chokidarModule?: typeof Chokidar,
): Promise<BuildWatcher> {
  const chokidar = chokidarModule ?? (await import('chokidar'));
  const watchedFiles = new Set<string>();
  const queue = new WatcherQueue();

  const rootDir = options?.cwd ?? process.cwd();
  const isCaseSensitive = isFileSystemCaseSensitive(rootDir);
  const rootDirPosix = toPosixPathNormalized(rootDir);
  const rootDirLookupKey = toLookupKey(rootDirPosix, isCaseSensitive);

  const watcher = chokidar.watch(rootDir, {
    ignoreInitial: true,
    ignored: options?.ignored,
    followSymlinks: options?.followSymlinks,
    usePolling: !!options?.polling,
    interval: options?.interval,
  });
  const initTime = Date.now();

  const handleEvent = (type: 'added' | 'modified' | 'removed', rawPath: string) => {
    const posixPath = toPosixPathNormalized(rawPath);
    const lookupKey = toLookupKey(posixPath, isCaseSensitive);
    if (!isPathWatched(lookupKey, watchedFiles)) {
      return;
    }

    if (type !== 'removed') {
      const stat = fs.statSync(rawPath, { throwIfNoEntry: false });
      // Ignore historical events from before watcher initialization, but allow a 1000 ms window
      // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
      // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
      if (stat && stat.mtimeMs < initTime - 1000) {
        return;
      }
    }

    queue.addChange(type, rawPath);
  };

  watcher.on('add', (path) => handleEvent('added', path));
  watcher.on('change', (path) => handleEvent('modified', path));
  watcher.on('unlink', (path) => handleEvent('removed', path));

  const buildWatcher: BuildWatcher = {
    [Symbol.asyncIterator]() {
      return this;
    },

    next() {
      return queue.next();
    },

    add(paths) {
      const targets = typeof paths === 'string' ? [paths] : paths;
      const newPaths: string[] = [];
      for (const p of targets) {
        const posixPath = toPosixPathNormalized(p);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (!watchedFiles.has(lookupKey)) {
          watchedFiles.add(lookupKey);
          if (!isPathInside(lookupKey, rootDirLookupKey) && lookupKey !== rootDirLookupKey) {
            newPaths.push(posixPath);
          }
        }
      }
      if (newPaths.length > 0) {
        watcher.add(newPaths);
      }
    },

    remove(paths) {
      const targets = typeof paths === 'string' ? [paths] : paths;
      const removePaths: string[] = [];
      for (const p of targets) {
        const posixPath = toPosixPathNormalized(p);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (watchedFiles.has(lookupKey)) {
          watchedFiles.delete(lookupKey);
          if (!isPathInside(lookupKey, rootDirLookupKey) && lookupKey !== rootDirLookupKey) {
            removePaths.push(posixPath);
          }
        }
      }
      if (removePaths.length > 0) {
        watcher.unwatch(removePaths);
      }
    },

    async close() {
      try {
        await watcher.close();
      } finally {
        queue.close();
      }
    },
  };

  return buildWatcher;
}
