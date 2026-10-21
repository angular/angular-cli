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
import picomatch from 'picomatch';
import { shouldWatchRoot } from './environment-options';
import { toPosixPath } from './path';

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

const NODE_MODULES = 'node_modules';
const NODE_MODULES_SEGMENT = `/${NODE_MODULES}/`;

// Watch workspace for package manager changes
const packageWatchFiles = [
  // manifest can affect module resolution
  'package.json',
  // npm lock file
  'package-lock.json',
  // pnpm lock file
  'pnpm-lock.yaml',
  // yarn lock file including Yarn PnP manifest files (https://yarnpkg.com/advanced/pnp-spec/)
  'yarn.lock',
  '.pnp.cjs',
  '.pnp.data.json',
];

export interface SetupWatcherOptions {
  workspaceRoot: string;
  projectRoot: string;
  outputPath: string;
  cacheOptions: { basePath: string; localBasePath?: string };
  poll?: number;
  preserveSymlinks?: boolean;
  signal?: AbortSignal;
  watchFiles?: Iterable<string>;
}

/**
 * Sets up and initializes a file watcher with proper ignore patterns for build outputs and caches.
 */
export async function setupWatcher(options: SetupWatcherOptions): Promise<BuildWatcher> {
  const {
    workspaceRoot,
    projectRoot,
    outputPath,
    cacheOptions,
    poll,
    preserveSymlinks,
    signal,
    watchFiles,
  } = options;

  const normalizedOutputBase = toPosixPath(outputPath);
  const normalizedCacheBase = toPosixPath(cacheOptions.basePath);
  const ignored: string[] = [
    // Ignore the output and cache paths to avoid infinite rebuild cycles
    normalizedOutputBase,
    `${normalizedOutputBase}/**`,
    normalizedCacheBase,
    `${normalizedCacheBase}/**`,
    `${toPosixPath(workspaceRoot)}/**/.*/**`,
  ];

  if (cacheOptions.localBasePath && cacheOptions.localBasePath !== cacheOptions.basePath) {
    const normalizedLocalCacheBase = toPosixPath(cacheOptions.localBasePath);
    ignored.push(normalizedLocalCacheBase, `${normalizedLocalCacheBase}/**`);
  }

  if (shouldWatchRoot && !preserveSymlinks) {
    // Ignore all node modules directories to avoid excessive file watchers.
    // Package changes are handled below by watching manifest and lock files.
    // NOTE: this is not enabled when preserveSymlinks is true as this would break `npm link` usages.
    ignored.push(`**/${NODE_MODULES}/**`);
  }

  const watcher = await createWatcher({
    polling: typeof poll === 'number',
    interval: poll,
    followSymlinks: preserveSymlinks,
    ignored,
    cwd: workspaceRoot,
  });

  // Setup abort support
  if (signal) {
    const onAbort = () => void watcher.close();
    signal.addEventListener('abort', onAbort, { once: true });
    const originalClose = watcher.close.bind(watcher);
    watcher.close = async () => {
      signal.removeEventListener('abort', onAbort);
      await originalClose();
    };
  }

  // Watch the entire project root if 'NG_BUILD_WATCH_ROOT' environment variable is set
  if (shouldWatchRoot) {
    if (!preserveSymlinks) {
      watcher.add(
        packageWatchFiles
          .map((file) => path.join(workspaceRoot, file))
          .filter((file) => fs.existsSync(file)),
      );
    }

    watcher.add(projectRoot);
  }

  if (watchFiles) {
    watcher.add(Array.isArray(watchFiles) ? watchFiles : Array.from(watchFiles));
  }

  return watcher;
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

function isNodeModulesSegment(lookupKey: string): boolean {
  return lookupKey === NODE_MODULES || lookupKey.endsWith(`/${NODE_MODULES}`);
}

/**
 * Determines whether a file path lookup key or any of its parent directories are present in watchedFiles.
 */
function isPathWatched(fileLookupKey: string, watchedFiles: ReadonlySet<string>): boolean {
  if (watchedFiles.has(fileLookupKey)) {
    return true;
  }

  let current = fileLookupKey;
  while (!isNodeModulesSegment(current)) {
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
  private firstChangeTime: number | undefined;

  constructor(
    private readonly debounceMs = 100,
    private readonly maxWaitMs = 500,
  ) {}

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
    const now = Date.now();
    const firstChangeTime = (this.firstChangeTime ??= now);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    const elapsed = now - firstChangeTime;
    const remainingMaxWait = Math.max(0, this.maxWaitMs - elapsed);
    const delay = Math.min(this.debounceMs, remainingMaxWait);

    this.timeoutId = setTimeout(() => {
      this.timeoutId = undefined;
      this.flush();
    }, delay);
  }

  private flush(): void {
    this.firstChangeTime = undefined;
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
    this.firstChangeTime = undefined;

    this.isClosed = true;
    this.currentChangedFiles = undefined;

    let next;
    while ((next = this.nextQueue.shift()) !== undefined) {
      next();
    }
  }
}

export async function createWatcher(options?: WatcherOptions): Promise<BuildWatcher> {
  if (options?.polling || options?.followSymlinks) {
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

/**
 * Extracts the package directory inside node_modules for a given POSIX path.
 *
 * Input Expectations:
 * - `posixPath` must be a normalized POSIX-style path (using forward slashes '/').
 */
export function extractNodeModulesPackageDir(posixPath: string): string | undefined {
  const index = posixPath.lastIndexOf(NODE_MODULES_SEGMENT);
  if (index === -1) {
    return undefined;
  }

  const nodeModulesPath = posixPath.slice(0, index + NODE_MODULES_SEGMENT.length - 1);
  const remainder = posixPath.slice(index + NODE_MODULES_SEGMENT.length);
  const segments = remainder.split('/');
  if (segments.length === 0 || !segments[0]) {
    return undefined;
  }

  if (segments[0].startsWith('@')) {
    if (segments.length < 2 || !segments[1]) {
      return undefined;
    }

    return `${nodeModulesPath}/${segments[0]}/${segments[1]}`;
  }

  return `${nodeModulesPath}/${segments[0]}`;
}

/**
 * Maximum number of concurrent external directory subscriptions before coalescing
 * sibling/cousin directories into common ancestor directories.
 * Kept well below macOS's ~512 per-process FSEvents stream limit.
 */
const DEFAULT_MAX_EXTERNAL_SUBSCRIPTIONS = 256;

/**
 * Node in a directory prefix tree used to subsume nested directories
 * and coalesce sibling/cousin directories into common ancestors.
 */
interface DirTrieNode {
  /** Case-normalized POSIX path key for set/map lookups. */
  dirKey: string;

  /** Original-case POSIX directory path passed to `@parcel/watcher`. */
  dirPath: string;

  /** Depth of this directory node from the filesystem root (0 at root). */
  depth: number;

  /** Parent directory node, or `undefined` if this node is a filesystem root. */
  parent: DirTrieNode | undefined;

  /** Child directory nodes keyed by their `dirKey`. */
  children: Map<string, DirTrieNode>;

  /** Whether this directory is selected as an active subscription target. */
  isTarget: boolean;

  /** Number of active target leaf directories within this node's subtree. */
  leafCount: number;
}

/**
 * Checks whether any strict ancestor of the given trie node is already marked as a target.
 */
function hasTargetAncestor(node: DirTrieNode): boolean {
  let current = node.parent;
  while (current) {
    if (current.isTarget) {
      return true;
    }
    current = current.parent;
  }

  return false;
}

/**
 * Manages `@parcel/watcher` directory subscriptions for watched files located outside the
 * primary `workspaceRoot`.
 *
 * Because `@parcel/watcher` watches directories recursively and macOS limits each process to
 * ~512 concurrent `FSEvents` streams, this manager:
 * - Normalizes external `node_modules` file paths to their package root directory.
 * - Batches synchronous `watchFile` and `removeFile` calls within a microtask before subscribing.
 * - Uses a directory prefix tree to subsume nested child directories and iteratively coalesce
 *   deepest branching subdirectories into common ancestors when the subscription budget is exceeded.
 * - Dynamically lowers its subscription budget and coalesces further if `subscribe()` fails on
 *   an existing directory due to OS stream limits.
 */
export class ParcelExternalManager {
  /** Active `@parcel/watcher` subscriptions keyed by subscribed directory lookup key. */
  readonly #extraSubscriptions = new Map<string, ParcelWatcher.AsyncSubscription>();

  /** Reference-counted watched files grouped by their target external directory lookup key. */
  readonly #externalDirFiles = new Map<string, { dirPath: string; files: Set<string> }>();

  /** Reverse lookup mapping each watched file lookup key to its target directory lookup key. */
  readonly #fileToDirKey = new Map<string, string>();

  /** The `@parcel/watcher` module instance. */
  readonly #parcelWatcher: typeof ParcelWatcher;

  /** Watcher configuration options including ignore patterns. */
  readonly #options: WatcherOptions | undefined;

  /** Normalized POSIX path of the primary watched workspace root. */
  readonly #rootDirPosix: string;

  /** Case-normalized lookup key of the primary watched workspace root. */
  readonly #rootDirLookupKey: string;

  /** Whether the underlying filesystem is case-sensitive. */
  readonly #isCaseSensitive: boolean;

  /** Callback invoked when `@parcel/watcher` emits filesystem events. */
  readonly #handleEvents: (events: ParcelWatcher.Event[]) => void;

  /** Current maximum number of concurrent external directory subscriptions allowed before coalescing. */
  #maxSubscriptions: number;

  /** Whether external directory state has changed and requires a reconciliation pass. */
  #needsReconcile = false;

  /** Whether obsolete subscriptions should be unsubscribed before creating new ones (used after stream limit errors). */
  #shrinkBeforeSubscribe = false;

  /** In-flight promise for the currently scheduled or running reconciliation loop. */
  #reconcilePromise: Promise<void> | undefined;

  /** Whether this manager has been closed. */
  #isClosed = false;

  /**
   * Creates a new external directory subscription manager for `@parcel/watcher`.
   *
   * @param parcelWatcher The `@parcel/watcher` module.
   * @param options Watcher configuration options.
   * @param rootDirPosix Normalized POSIX path of the primary workspace root.
   * @param rootDirLookupKey Case-normalized lookup key of the primary workspace root.
   * @param isCaseSensitive Whether the filesystem at the workspace root is case-sensitive.
   * @param handleEvents Callback to process incoming `@parcel/watcher` events.
   * @param maxSubscriptions Maximum number of concurrent external directory subscriptions before coalescing.
   */
  constructor(
    parcelWatcher: typeof ParcelWatcher,
    options: WatcherOptions | undefined,
    rootDirPosix: string,
    rootDirLookupKey: string,
    isCaseSensitive: boolean,
    handleEvents: (events: ParcelWatcher.Event[]) => void,
    maxSubscriptions = DEFAULT_MAX_EXTERNAL_SUBSCRIPTIONS,
  ) {
    this.#parcelWatcher = parcelWatcher;
    this.#options = options;
    this.#rootDirPosix = rootDirPosix;
    this.#rootDirLookupKey = rootDirLookupKey;
    this.#isCaseSensitive = isCaseSensitive;
    this.#handleEvents = handleEvents;
    this.#maxSubscriptions = Math.max(1, maxSubscriptions);
  }

  /**
   * Registers a file path to be watched if it resides outside the primary workspace root,
   * and schedules an asynchronous subscription reconciliation pass if needed.
   *
   * @param posixPath Normalized POSIX file path preserving original casing.
   * @param lookupKey Case-normalized lookup key for the file path.
   */
  watchFile(posixPath: string, lookupKey: string): void {
    if (
      this.#isClosed ||
      isPathInside(lookupKey, this.#rootDirLookupKey) ||
      lookupKey === this.#rootDirLookupKey
    ) {
      return;
    }

    const pkgDir = extractNodeModulesPackageDir(posixPath);
    const dirPath = pkgDir ?? getDirectoryPath(posixPath);
    const dirKey = pkgDir
      ? toLookupKey(pkgDir, this.#isCaseSensitive)
      : getDirectoryPath(lookupKey);

    this.#fileToDirKey.set(lookupKey, dirKey);

    let dirEntry = this.#externalDirFiles.get(dirKey);
    const isNewDir = !dirEntry;
    if (!dirEntry) {
      dirEntry = { dirPath, files: new Set<string>() };
      this.#externalDirFiles.set(dirKey, dirEntry);
    }
    dirEntry.files.add(lookupKey);

    if (isNewDir || !this.#isCoveredByActiveSubscription(dirKey)) {
      this.#scheduleReconcile();
    }
  }

  /**
   * Unregisters a previously watched external file and schedules a reconciliation pass
   * if it was the last watched file in its target directory.
   *
   * @param lookupKey Case-normalized lookup key for the file path to remove.
   */
  removeFile(lookupKey: string): void {
    const dirKey = this.#fileToDirKey.get(lookupKey);
    if (!dirKey) {
      return;
    }

    this.#fileToDirKey.delete(lookupKey);
    const dirEntry = this.#externalDirFiles.get(dirKey);
    if (dirEntry) {
      dirEntry.files.delete(lookupKey);
      if (dirEntry.files.size === 0) {
        this.#externalDirFiles.delete(dirKey);
        this.#scheduleReconcile();
      }
    }
  }

  /**
   * Waits for any scheduled or in-progress subscription reconciliation pass to complete.
   */
  async flush(): Promise<void> {
    if (this.#reconcilePromise) {
      await this.#reconcilePromise;
    }
  }

  /**
   * Closes the manager, awaiting any pending reconciliation and unsubscribing all active
   * external directory subscriptions.
   */
  async close(): Promise<void> {
    this.#isClosed = true;
    this.#needsReconcile = false;
    try {
      if (this.#reconcilePromise) {
        await this.#reconcilePromise.catch(() => {});
      }
      if (this.#extraSubscriptions.size > 0) {
        await Promise.allSettled(
          Array.from(this.#extraSubscriptions.values(), (sub) => sub.unsubscribe()),
        );
      }
    } finally {
      this.#extraSubscriptions.clear();
      this.#externalDirFiles.clear();
      this.#fileToDirKey.clear();
    }
  }

  /**
   * Schedules a microtask to reconcile active `@parcel/watcher` subscriptions with the
   * current set of external directories.
   */
  #scheduleReconcile(): void {
    if (this.#isClosed) {
      return;
    }

    this.#needsReconcile = true;
    this.#reconcilePromise ??= Promise.resolve()
      .then(() => this.#runReconcileLoop())
      .finally(() => {
        this.#reconcilePromise = undefined;
      });
  }

  /**
   * Continuously executes reconciliation passes until no further changes are pending.
   */
  async #runReconcileLoop(): Promise<void> {
    while (this.#needsReconcile && !this.#isClosed) {
      this.#needsReconcile = false;
      await this.#reconcileOnce();
    }
  }

  /**
   * Performs a single reconciliation pass: computes the desired coalesced directory set,
   * subscribes to newly required directories, unsubscribes obsolete directories, and
   * triggers fallback coalescing if OS stream limits are encountered.
   */
  async #reconcileOnce(): Promise<void> {
    const desiredDirs = this.#computeDesiredDirectories();

    if (this.#shrinkBeforeSubscribe) {
      this.#shrinkBeforeSubscribe = false;
      const toUnsubscribe: Promise<void>[] = [];
      for (const [existingKey, sub] of this.#extraSubscriptions.entries()) {
        if (!desiredDirs.has(existingKey)) {
          this.#extraSubscriptions.delete(existingKey);
          toUnsubscribe.push(sub.unsubscribe().catch(() => {}));
        }
      }
      if (toUnsubscribe.length > 0) {
        await Promise.allSettled(toUnsubscribe);
      }
    }

    if (this.#isClosed) {
      return;
    }

    const toSubscribe: [string, string][] = [];
    for (const [dirKey, dirPath] of desiredDirs.entries()) {
      if (!this.#extraSubscriptions.has(dirKey)) {
        toSubscribe.push([dirKey, dirPath]);
      }
    }

    let hadExistingDirFailure = false;
    if (toSubscribe.length > 0) {
      await Promise.allSettled(
        toSubscribe.map(async ([dirKey, dirPath]) => {
          const ignore = isPathInside(this.#rootDirLookupKey, dirKey)
            ? [...(this.#options?.ignored ?? []), this.#rootDirPosix, `${this.#rootDirPosix}/**`]
            : this.#options?.ignored;

          try {
            const sub = await this.#parcelWatcher.subscribe(
              dirPath,
              (err, events) => {
                if (!err) {
                  this.#handleEvents(events);
                }
              },
              { ignore },
            );

            if (this.#isClosed) {
              await sub.unsubscribe().catch(() => {});

              return;
            }

            this.#extraSubscriptions.set(dirKey, sub);
          } catch {
            // Ignore errors for missing directories; if the directory exists on disk,
            // mark failure so the manager can coalesce further if over OS stream limits.
            if (!this.#isClosed && fs.existsSync(dirPath)) {
              hadExistingDirFailure = true;
            }
          }
        }),
      );
    }

    if (this.#isClosed) {
      return;
    }

    // Unsubscribe any previous subscriptions that are no longer desired and whose
    // remaining watched files (if any) are now covered by another active subscription.
    for (const [existingKey, sub] of this.#extraSubscriptions.entries()) {
      if (!desiredDirs.has(existingKey) && this.#canRemoveSubscription(existingKey)) {
        this.#extraSubscriptions.delete(existingKey);
        sub.unsubscribe().catch(() => {});
      }
    }

    // If subscribing to an existing directory failed (e.g. macOS FSEvents per-process limit),
    // dynamically lower the subscription budget and re-reconcile to coalesce into ancestors.
    if (hadExistingDirFailure && desiredDirs.size > 1 && this.#maxSubscriptions > 1) {
      const nextMax =
        this.#extraSubscriptions.size > 0
          ? Math.max(1, Math.floor(this.#extraSubscriptions.size / 2))
          : Math.max(1, Math.floor(Math.min(this.#maxSubscriptions, desiredDirs.size) / 2));

      if (nextMax < desiredDirs.size && nextMax < this.#maxSubscriptions) {
        this.#maxSubscriptions = nextMax;
        this.#shrinkBeforeSubscribe = true;
        this.#needsReconcile = true;
      }
    }
  }

  /**
   * Checks whether a directory lookup key is already covered by an active subscription.
   */
  #isCoveredByActiveSubscription(dirLookupKey: string): boolean {
    for (const existingDir of this.#extraSubscriptions.keys()) {
      if (dirLookupKey === existingDir || isPathInside(dirLookupKey, existingDir)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determines whether an existing subscription can be safely removed without leaving
   * any remaining watched target directories uncovered.
   */
  #canRemoveSubscription(subKey: string): boolean {
    for (const targetDirKey of this.#externalDirFiles.keys()) {
      if (targetDirKey === subKey || isPathInside(targetDirKey, subKey)) {
        let coveredByOther = false;
        for (const otherSubKey of this.#extraSubscriptions.keys()) {
          if (
            otherSubKey !== subKey &&
            (targetDirKey === otherSubKey || isPathInside(targetDirKey, otherSubKey))
          ) {
            coveredByOther = true;
            break;
          }
        }
        if (!coveredByOther) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Computes the minimal set of external directories to subscribe to (mapped from `dirKey` to `dirPath`),
   * subsuming nested directories and coalescing branching ancestors to stay within `#maxSubscriptions`.
   */
  #computeDesiredDirectories(): Map<string, string> {
    if (this.#externalDirFiles.size === 0) {
      return new Map();
    }

    const nodesByKey = new Map<string, DirTrieNode>();
    const roots: DirTrieNode[] = [];

    for (const [dirKey, { dirPath }] of this.#externalDirFiles.entries()) {
      const chain: { dirKey: string; dirPath: string }[] = [];
      let currentKey = dirKey;
      let currentPath = dirPath;
      while (true) {
        chain.push({ dirKey: currentKey, dirPath: currentPath });
        const parentKey = getDirectoryPath(currentKey);
        if (parentKey === currentKey) {
          break;
        }
        currentKey = parentKey;
        currentPath = getDirectoryPath(currentPath);
      }

      let parentNode: DirTrieNode | undefined;
      for (let i = chain.length - 1; i >= 0; i--) {
        const { dirKey: nodeKey, dirPath: nodePath } = chain[i];
        const depth = chain.length - 1 - i;
        let node = nodesByKey.get(nodeKey);
        if (!node) {
          node = {
            dirKey: nodeKey,
            dirPath: nodePath,
            depth,
            parent: parentNode,
            children: new Map(),
            isTarget: false,
            leafCount: 0,
          };
          nodesByKey.set(nodeKey, node);
          if (parentNode) {
            parentNode.children.set(nodeKey, node);
          } else {
            roots.push(node);
          }
        }
        parentNode = node;
      }

      if (parentNode) {
        parentNode.isTarget = true;
      }
    }

    const initSubtree = (node: DirTrieNode): number => {
      if (node.isTarget) {
        node.children.clear();
        node.leafCount = 1;

        return 1;
      }

      let count = 0;
      for (const child of node.children.values()) {
        count += initSubtree(child);
      }
      node.leafCount = count;

      return count;
    };

    let totalLeaves = 0;
    for (const root of roots) {
      totalLeaves += initSubtree(root);
    }

    if (totalLeaves > this.#maxSubscriptions) {
      // Tier 1: non-ancestors of workspaceRoot (e.g., <monorepo>/libs, <monorepo>/node_modules)
      // Tier 2: ancestors of workspaceRoot (e.g., <monorepo> when sibling apps/libs are directly under it)
      const tier1ByDepth = new Map<number, DirTrieNode[]>();
      const tier2ByDepth = new Map<number, DirTrieNode[]>();

      const collectInternalNodes = (node: DirTrieNode) => {
        if (node.isTarget) {
          return;
        }
        if (node.parent !== undefined && node.leafCount > 1) {
          const isWorkspaceAncestor = isPathInside(this.#rootDirLookupKey, node.dirKey);
          const bucketMap = isWorkspaceAncestor ? tier2ByDepth : tier1ByDepth;
          let bucket = bucketMap.get(node.depth);
          if (!bucket) {
            bucket = [];
            bucketMap.set(node.depth, bucket);
          }
          bucket.push(node);
        }
        for (const child of node.children.values()) {
          collectInternalNodes(child);
        }
      };

      for (const root of roots) {
        collectInternalNodes(root);
      }

      const collapseTier = (byDepth: Map<number, DirTrieNode[]>) => {
        const sortedLevels = Array.from(byDepth.entries()).sort(([a], [b]) => b - a);
        for (const [, nodes] of sortedLevels) {
          if (totalLeaves <= this.#maxSubscriptions) {
            return;
          }

          const candidates = nodes
            .filter((n) => n.leafCount > 1 && !hasTargetAncestor(n))
            .sort((a, b) => b.leafCount - a.leafCount || a.dirKey.localeCompare(b.dirKey));

          for (const candidate of candidates) {
            if (totalLeaves <= this.#maxSubscriptions) {
              return;
            }
            if (candidate.leafCount <= 1 || hasTargetAncestor(candidate)) {
              continue;
            }

            const reduction = candidate.leafCount - 1;
            candidate.isTarget = true;
            candidate.children.clear();
            candidate.leafCount = 1;
            totalLeaves -= reduction;

            let ancestor = candidate.parent;
            while (ancestor) {
              ancestor.leafCount -= reduction;
              ancestor = ancestor.parent;
            }
          }
        }
      };

      collapseTier(tier1ByDepth);
      if (totalLeaves > this.#maxSubscriptions) {
        collapseTier(tier2ByDepth);
      }
    }

    const desired = new Map<string, string>();
    const collectTargets = (node: DirTrieNode) => {
      if (node.isTarget) {
        desired.set(node.dirKey, node.dirPath);

        return;
      }
      for (const child of node.children.values()) {
        collectTargets(child);
      }
    };

    for (const root of roots) {
      collectTargets(root);
    }

    return desired;
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
    rootDirPosix,
    rootDirLookupKey,
    isCaseSensitive,
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
          externalManager.watchFile(posixPath, lookupKey);
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

function createChokidarIgnored(
  ignoredPatterns: string[] | undefined,
  isCaseSensitive: boolean,
  watchedFiles: ReadonlySet<string>,
): Chokidar.Matcher[] {
  // Strip static node_modules ignore patterns (e.g. `**/node_modules/**` from setupWatcher).
  // If left in place, picomatch would unconditionally ignore all node_modules files and prevent
  // watching explicitly added files inside node_modules.
  const customIgnored =
    ignoredPatterns
      ?.filter((pattern) => {
        const base = toPosixPathNormalized(pattern).replace(/\/\*\*$/, '');

        return base !== NODE_MODULES && !base.endsWith(`/${NODE_MODULES}`);
      })
      .map((pattern) => {
        if (/[*?[\]{}()]/.test(pattern)) {
          const isMatch = picomatch(pattern, { dot: true });

          return (filePath: string) => isMatch(toPosixPathNormalized(filePath));
        }

        return { path: toPosixPathNormalized(pattern), recursive: true };
      }) ?? [];

  // When watching a directory (e.g. projectRoot via NG_BUILD_WATCH_ROOT), prune `node_modules`
  // directories and any unwatched descendants inside `node_modules` (since Chokidar 6 keeps
  // ancestor directories of explicitly watched package files un-ignored to traverse to them).
  return [
    ...customIgnored,
    (filePath: string) => {
      if (!filePath.includes(NODE_MODULES)) {
        return false;
      }

      const posixPath = toPosixPathNormalized(filePath);
      const lookupKey = toLookupKey(posixPath, isCaseSensitive);
      if (
        !isNodeModulesSegment(lookupKey) &&
        !lookupKey.includes(`/${NODE_MODULES}/`) &&
        !lookupKey.startsWith(`${NODE_MODULES}/`)
      ) {
        return false;
      }

      return !isPathWatched(lookupKey, watchedFiles);
    },
  ];
}

interface ChokidarBaselineEntry {
  posixPath: string;
  mtimeMs: number;
  size: number;
}

// Chokidar initializes file watchers asynchronously (`await stat(path)` followed by
// `fs.watch` or polling). If a file is modified immediately after `watcher.add()` is called,
// Chokidar may capture the post-modification state as its initial baseline (with
// `ignoreInitial: true`) and miss the change. Re-statting after a short delay catches any
// modifications that occurred during asynchronous watcher registration, while `fileStats`
// deduplicates if Chokidar also fired.
async function checkChokidarBaselines(
  baselineStats: ReadonlyMap<string, ChokidarBaselineEntry>,
  watchedFiles: ReadonlySet<string>,
  watcher: Chokidar.FSWatcher,
  handleEvent: (type: 'added' | 'modified' | 'removed', rawPath: string) => void,
): Promise<void> {
  await Promise.all(
    Array.from(baselineStats, async ([lookupKey, baseline]) => {
      if (watcher.closed || !watchedFiles.has(lookupKey)) {
        return;
      }
      const currentStat = await fs.promises.stat(baseline.posixPath).catch(() => null);
      if (watcher.closed || !watchedFiles.has(lookupKey) || !currentStat?.isFile()) {
        return;
      }

      if (currentStat.mtimeMs !== baseline.mtimeMs || currentStat.size !== baseline.size) {
        handleEvent('modified', path.normalize(baseline.posixPath));
      }
    }),
  );
}

async function createChokidarWatcher(
  options?: WatcherOptions,
  chokidarModule?: typeof Chokidar,
): Promise<BuildWatcher> {
  const chokidar = chokidarModule ?? (await import('chokidar'));
  const watchedFiles = new Set<string>();
  const fileStats = new Map<string, { mtimeMs: number; size: number }>();
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  const pollingInterval = options?.interval ?? 100;
  const debounceMs = Math.min(250, Math.max(100, Math.ceil(pollingInterval * 1.5)));
  const queue = options?.polling
    ? new WatcherQueue(debounceMs, Math.max(500, debounceMs * 3))
    : new WatcherQueue();

  const rootDir = options?.cwd ?? process.cwd();
  const isCaseSensitive = isFileSystemCaseSensitive(rootDir);
  const ignored = createChokidarIgnored(options?.ignored, isCaseSensitive, watchedFiles);

  const watcher = chokidar.watch([], {
    ignoreInitial: true,
    ignored,
    followSymlinks: options?.followSymlinks,
    backend: options?.polling ? 'polling' : 'auto',
    pollingInterval: options?.interval,
  });

  // Prevent unhandled watcher errors (such as EMFILE or EACCES) from crashing the process.
  watcher.on('error', () => {});

  const initTime = Date.now();

  const handleEvent = (type: 'added' | 'modified' | 'removed', rawPath: string) => {
    const posixPath = toPosixPathNormalized(rawPath);
    const lookupKey = toLookupKey(posixPath, isCaseSensitive);
    if (!isPathWatched(lookupKey, watchedFiles)) {
      return;
    }

    if (type === 'removed') {
      fileStats.delete(lookupKey);
      queue.addChange(type, rawPath);

      return;
    }

    const stat = fs.statSync(rawPath, { throwIfNoEntry: false });
    // Ignore historical events from before watcher initialization, but allow a 1000 ms window
    // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
    // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
    if (!stat || stat.mtimeMs < initTime - 1000) {
      return;
    }

    const previousStat = fileStats.get(lookupKey);
    if (
      type === 'modified' &&
      previousStat &&
      previousStat.mtimeMs === stat.mtimeMs &&
      previousStat.size === stat.size
    ) {
      return;
    }

    fileStats.set(lookupKey, { mtimeMs: stat.mtimeMs, size: stat.size });
    queue.addChange(type, rawPath);
  };

  const scheduleBaselineCheck = (baselineStats: ReadonlyMap<string, ChokidarBaselineEntry>) => {
    if (baselineStats.size === 0 || watcher.closed) {
      return;
    }

    const timer = setTimeout(() => {
      pendingTimers.delete(timer);
      void checkChokidarBaselines(baselineStats, watchedFiles, watcher, handleEvent);
    }, 50);
    timer.unref();
    pendingTimers.add(timer);
  };

  watcher.on('add', (path) => handleEvent('added', path));
  watcher.on('change', (path) => handleEvent('modified', path));
  watcher.on('unlink', (path) => handleEvent('removed', path));

  return {
    [Symbol.asyncIterator]() {
      return this;
    },

    async next() {
      const result = await queue.next();
      if (result.value) {
        const files = [...result.value.added, ...result.value.modified];
        await Promise.all(
          files.map(async (file) => {
            const stat = await fs.promises.stat(file).catch(() => undefined);
            if (stat?.isFile()) {
              const posixPath = toPosixPathNormalized(file);
              const lookupKey = toLookupKey(posixPath, isCaseSensitive);
              fileStats.set(lookupKey, { mtimeMs: stat.mtimeMs, size: stat.size });
            }
          }),
        );
      }

      return result;
    },

    add(paths) {
      if (watcher.closed) {
        return;
      }

      const targets = typeof paths === 'string' ? [paths] : paths;
      const newPaths: string[] = [];
      const baselineStats = new Map<string, ChokidarBaselineEntry>();

      for (const p of targets) {
        const posixPath = toPosixPathNormalized(p);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (!watchedFiles.has(lookupKey)) {
          watchedFiles.add(lookupKey);
          newPaths.push(posixPath);
          const stat = fs.statSync(posixPath, { throwIfNoEntry: false });
          if (stat?.isFile()) {
            baselineStats.set(lookupKey, { posixPath, mtimeMs: stat.mtimeMs, size: stat.size });
          }
        }
      }
      if (newPaths.length > 0) {
        watcher.add(newPaths);
        scheduleBaselineCheck(baselineStats);
      }
    },

    remove(paths) {
      if (watcher.closed) {
        return;
      }

      const targets = typeof paths === 'string' ? [paths] : paths;
      const removePaths: string[] = [];
      for (const p of targets) {
        const posixPath = toPosixPathNormalized(p);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (watchedFiles.has(lookupKey)) {
          watchedFiles.delete(lookupKey);
          fileStats.delete(lookupKey);
          removePaths.push(posixPath);
        }
      }
      if (removePaths.length > 0) {
        watcher.unwatch(removePaths);
      }
    },

    async close() {
      for (const timer of pendingTimers) {
        clearTimeout(timer);
      }
      pendingTimers.clear();
      watchedFiles.clear();
      fileStats.clear();
      try {
        await watcher.close();
      } finally {
        queue.close();
      }
    },
  } satisfies BuildWatcher;
}
