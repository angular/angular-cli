/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedEntryPoint } from '../options';
import type { BundleResult } from './bundler';
import type { CachedProgram } from './compilation';
import type { ScannedFileInfo } from './entry-point-scanner';
import { TYPES_OUTPUT_DIR } from './utils';

/**
 * Represents a single entry point node within the compilation dependency graph.
 */
export interface EntryPointNode {
  /** The normalized entry point configuration. */
  readonly entryPoint: NormalizedEntryPoint;

  /** Nodes that this entry point directly depends on. */
  readonly dependencies: Set<EntryPointNode>;

  /** Nodes that directly depend on this entry point. */
  readonly dependents: Set<EntryPointNode>;

  /** All source, template, and stylesheet files referenced by this entry point. */
  readonly referencedFiles: Set<string>;

  /** Indicates whether this entry point needs to be recompiled. */
  isDirty: boolean;

  /** The hash of the emitted .d.ts content from the previous compilation. */
  lastDtsHash?: string;

  /** Cached compilation instance for incremental rebuilds in watch mode. */
  cachedProgram?: CachedProgram;

  /** The bundle result from the previous compilation run. */
  lastBundleResult?: BundleResult;
}

const COMPILATION_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.svg',
  '.css',
  '.scss',
  '.sass',
  '.less',
]);

/**
 * Directed Acyclic Graph (DAG) of library entry points.
 */
export class EntryPointGraph {
  /** Map of entry point names to their corresponding graph nodes. */
  readonly nodes = new Map<string, EntryPointNode>();

  /** Map of entry point module specifiers to target .d.ts paths for compilerOptions.paths. */
  readonly upstreamDtsPaths: Record<string, string[]> = {};

  /**
   * Adds a new entry point to the graph.
   *
   * @param entryPoint The normalized entry point configuration.
   * @returns The created EntryPointNode.
   */
  addNode(entryPoint: NormalizedEntryPoint): EntryPointNode {
    const node: EntryPointNode = {
      entryPoint,
      dependencies: new Set(),
      dependents: new Set(),
      referencedFiles: new Set(),
      isDirty: true,
    };
    this.nodes.set(entryPoint.name, node);

    return node;
  }

  /**
   * Adds a directed dependency edge from one entry point to another.
   *
   * @param fromName The dependent entry point name.
   * @param toName The dependency entry point name.
   */
  addDependency(fromName: string, toName: string): void {
    const fromNode = this.nodes.get(fromName);
    const toNode = this.nodes.get(toName);

    if (!fromNode || !toNode) {
      throw new Error(`Invalid dependency edge: ${fromName} -> ${toName}`);
    }

    fromNode.dependencies.add(toNode);
    toNode.dependents.add(fromNode);
  }

  /**
   * Topologically sorts entry points into concurrent execution batches using Kahn's Algorithm.
   * Entry points within the same batch have zero interdependencies and can be compiled in parallel.
   *
   * @returns An array of batches, where each batch contains independent entry points.
   */
  topologicalSortBatches(): EntryPointNode[][] {
    const inDegree = new Map<EntryPointNode, number>();
    let currentBatch: EntryPointNode[] = [];

    for (const node of this.nodes.values()) {
      const degree = node.dependencies.size;
      inDegree.set(node, degree);
      if (degree === 0) {
        currentBatch.push(node);
      }
    }

    const batches: EntryPointNode[][] = [];
    let processedCount = 0;

    while (currentBatch.length > 0) {
      batches.push(currentBatch);
      processedCount += currentBatch.length;

      const nextBatch: EntryPointNode[] = [];
      for (const current of currentBatch) {
        for (const dependent of current.dependents) {
          const remaining = (inDegree.get(dependent) ?? 0) - 1;
          inDegree.set(dependent, remaining);
          if (remaining === 0) {
            nextBatch.push(dependent);
          }
        }
      }

      currentBatch = nextBatch;
    }

    if (processedCount !== this.nodes.size) {
      const cyclePath = findCyclePath(this.nodes.values(), inDegree);
      throw new Error(`Circular dependency detected between entry points: ${cyclePath}`);
    }

    return batches;
  }

  private cachedNodeMeta?: Array<{
    node: EntryPointNode;
    entryFile: string;
    tsConfig: string;
    dirWithSep: string;
  }>;

  private getNodeMeta() {
    this.cachedNodeMeta ??= Array.from(this.nodes.values())
      .map((node) => {
        const { entryFilePath, tsConfigPath } = node.entryPoint;
        const nodeDir = toPosixPath(path.dirname(entryFilePath));

        return {
          node,
          entryFile: toPosixPath(entryFilePath),
          tsConfig: toPosixPath(tsConfigPath),
          dirWithSep: nodeDir.endsWith('/') ? nodeDir : `${nodeDir}/`,
        };
      })
      .sort((a, b) => b.dirWithSep.length - a.dirWithSep.length);

    return this.cachedNodeMeta;
  }

  /**
   * Identifies and marks dirty any graph nodes whose source files or referenced files have changed.
   *
   * @param changedFiles Array of changed file paths.
   * @returns True if at least one entry point was affected.
   */
  markAffectedNodes(changedFiles: ReadonlySet<string>): boolean {
    let hasChanges = false;
    const nodeMeta = this.getNodeMeta();

    for (const file of changedFiles) {
      let matched = false;

      for (const { node, entryFile, tsConfig } of nodeMeta) {
        if (file === entryFile || file === tsConfig || node.referencedFiles.has(file)) {
          node.isDirty = true;
          hasChanges = true;
          matched = true;
        }
      }

      if (matched) {
        continue;
      }

      const ext = path.posix.extname(file);
      if (!COMPILATION_EXTENSIONS.has(ext) || /\.(spec|test)\.[mc]?[jt]sx?$/i.test(file)) {
        continue;
      }

      for (const { node, dirWithSep } of nodeMeta) {
        if (file.startsWith(dirWithSep)) {
          node.isDirty = true;
          hasChanges = true;
          break;
        }
      }
    }

    return hasChanges;
  }
}

/**
 * Traces a cycle path through the given nodes for diagnostic reporting using 3-color DFS.
 *
 * @param nodes All entry point nodes.
 * @param inDegree The in-degree map from Kahn's algorithm.
 * @returns Formatted cycle path string (e.g. 'A -> B -> A').
 */
function findCyclePath(
  nodes: Iterable<EntryPointNode>,
  inDegree: Map<EntryPointNode, number>,
): string {
  const cyclicCandidates = new Set<EntryPointNode>();
  for (const node of nodes) {
    if ((inDegree.get(node) ?? 0) > 0) {
      cyclicCandidates.add(node);
    }
  }

  const visiting = new Set<EntryPointNode>();
  const visited = new Set<EntryPointNode>();
  const pathStack: EntryPointNode[] = [];

  function dfs(current: EntryPointNode): EntryPointNode[] | undefined {
    visiting.add(current);
    pathStack.push(current);

    for (const dep of current.dependencies) {
      if (!cyclicCandidates.has(dep)) {
        continue;
      }

      if (visiting.has(dep)) {
        const cycleStartIndex = pathStack.indexOf(dep);

        return [...pathStack.slice(cycleStartIndex), dep];
      }

      if (!visited.has(dep)) {
        const result = dfs(dep);
        if (result) {
          return result;
        }
      }
    }

    pathStack.pop();
    visiting.delete(current);
    visited.add(current);

    return undefined;
  }

  for (const node of cyclicCandidates) {
    if (!visited.has(node)) {
      const cycle = dfs(node);
      if (cycle) {
        return cycle.map((n) => n.entryPoint.name).join(' -> ');
      }
    }
  }

  return Array.from(cyclicCandidates)
    .map((n) => n.entryPoint.name)
    .join(' -> ');
}

/**
 * Builds the entry points DAG by analyzing imports across all entry points concurrently.
 *
 * @param entryPoints The normalized library entry points.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A promise resolving to the populated EntryPointGraph.
 */
export async function buildEntryPointGraph(
  entryPoints: Iterable<NormalizedEntryPoint>,
  packageName: string,
  outputPath: string,
): Promise<EntryPointGraph> {
  const { scanEntryPointDependencies } = await import('./entry-point-scanner');
  const graph = new EntryPointGraph();

  for (const entryPoint of entryPoints) {
    graph.addNode(entryPoint);

    const { displayName, bundleName } = entryPoint;
    graph.upstreamDtsPaths[displayName] = [
      toPosixPath(path.join(outputPath, TYPES_OUTPUT_DIR, `${bundleName}.d.ts`)),
    ];
  }

  const fileCache = new Map<string, Promise<ScannedFileInfo | undefined>>();
  const resolutionCache = new Map<string, Promise<string | undefined>>();
  const directoryCache = new Map<string, Promise<Set<string>>>();

  // Analyze source files of all entry points concurrently
  await Promise.all(
    Array.from(graph.nodes.values(), async ({ entryPoint }) => {
      const dependencies = await scanEntryPointDependencies(
        entryPoint,
        packageName,
        fileCache,
        resolutionCache,
        directoryCache,
      );

      for (const dep of dependencies) {
        if (!graph.nodes.has(dep)) {
          throw new Error(
            `Entry point '${dep}' imported by '${entryPoint.name}' does not exist in 'entryPoints'.`,
          );
        }

        graph.addDependency(entryPoint.name, dep);
      }
    }),
  );

  return graph;
}
