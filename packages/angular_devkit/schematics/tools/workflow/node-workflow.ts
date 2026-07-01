/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Path, getSystemPath, normalize, schema, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve as resolveSystemPath, sep } from 'node:path';
import { Observable } from 'rxjs';
import { workflow } from '../../src';
import { BuiltinTaskExecutor } from '../../tasks/node';
import { FileSystemEngine } from '../description';
import { OptionTransform } from '../file-system-engine-host-base';
import { NodeModulesEngineHost } from '../node-module-engine-host';
import { validateOptionsWithSchema } from '../schema-option-transform';

export interface NodeWorkflowOptions {
  force?: boolean;
  dryRun?: boolean;
  packageManager?: string;
  packageManagerForce?: boolean;
  packageRegistry?: string;
  registry?: schema.CoreSchemaRegistry;
  resolvePaths?: string[];
  schemaValidation?: boolean;
  optionTransforms?: OptionTransform<Record<string, unknown> | null, object>[];
  engineHostCreator?: (options: NodeWorkflowOptions) => NodeModulesEngineHost;
}

/**
 * Resolves the real path of a system path, walking up to the first existing ancestor if the path or
 * its descendants do not exist, and preserving the non-existent trailing segments. This keeps the
 * containment check working for not-yet-created files and for a workspace root that does not exist
 * yet (e.g. during `ng new`), where `realpathSync` would otherwise throw `ENOENT`.
 */
function resolveRealPath(systemPath: string): string {
  let current = resolveSystemPath(systemPath);
  const segments: string[] = [];
  for (;;) {
    try {
      const real = realpathSync(current);

      return resolveSystemPath(real, ...segments.reverse());
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
      const parent = dirname(current);
      if (parent === current) {
        throw e;
      }
      segments.push(basename(current));
      current = parent;
    }
  }
}

/**
 * A {@link virtualFs.ScopedHost} that additionally rejects any write/delete/rename whose real
 * (symlink-resolved) location escapes the workspace root.
 *
 * The lexical containment of `ScopedHost` (and the schematics `Tree`, which rejects `..`) does not
 * resolve symlinks, so a workspace that contains a symlinked directory could otherwise route a
 * schematic/migration write to a file outside the workspace. This mirrors the realpath-based root
 * restriction already used by the MCP host (`createRootRestrictedHost`).
 */
class WorkspaceRootHost<T extends object> extends virtualFs.ScopedHost<T> {
  private readonly _systemRoot: string;

  constructor(delegate: virtualFs.Host<T>, root: Path) {
    super(delegate, root);
    this._systemRoot = resolveRealPath(getSystemPath(root));
  }

  private _assertWithinRoot(path: Path): void {
    const real = resolveRealPath(getSystemPath(this._resolve(path)));

    const rel = relative(this._systemRoot, real);
    if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
      throw new Error(
        `Schematic attempted to access a path outside of the workspace root: ` +
          getSystemPath(this._resolve(path)),
      );
    }
  }

  override write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    this._assertWithinRoot(path);

    return super.write(path, content);
  }

  override delete(path: Path): Observable<void> {
    this._assertWithinRoot(path);

    return super.delete(path);
  }

  override rename(from: Path, to: Path): Observable<void> {
    this._assertWithinRoot(from);
    this._assertWithinRoot(to);

    return super.rename(from, to);
  }
}

/**
 * A workflow specifically for Node tools.
 */
export class NodeWorkflow extends workflow.BaseWorkflow {
  constructor(root: string, options: NodeWorkflowOptions);

  constructor(host: virtualFs.Host, options: NodeWorkflowOptions & { root?: Path });

  constructor(hostOrRoot: virtualFs.Host | string, options: NodeWorkflowOptions & { root?: Path }) {
    let host;
    let root;
    if (typeof hostOrRoot === 'string') {
      root = normalize(hostOrRoot);
      host = new WorkspaceRootHost(new NodeJsSyncHost(), root);
    } else {
      host = hostOrRoot;
      root = options.root;
    }

    const engineHost =
      options.engineHostCreator?.(options) || new NodeModulesEngineHost(options.resolvePaths);
    super({
      host,
      engineHost,

      force: options.force,
      dryRun: options.dryRun,
      registry: options.registry,
    });

    engineHost.registerTaskExecutor(BuiltinTaskExecutor.NodePackage, {
      allowPackageManagerOverride: true,
      packageManager: options.packageManager,
      force: options.packageManagerForce,
      rootDirectory: root && getSystemPath(root),
      registry: options.packageRegistry,
    });
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.RepositoryInitializer, {
      rootDirectory: root && getSystemPath(root),
    });
    engineHost.registerTaskExecutor(BuiltinTaskExecutor.RunSchematic);

    if (options.optionTransforms) {
      for (const transform of options.optionTransforms) {
        engineHost.registerOptionsTransform(transform);
      }
    }

    if (options.schemaValidation) {
      engineHost.registerOptionsTransform(validateOptionsWithSchema(this.registry));
    }

    this._context = [];
  }

  override get engine(): FileSystemEngine {
    return this._engine as FileSystemEngine;
  }
  override get engineHost(): NodeModulesEngineHost {
    return this._engineHost as NodeModulesEngineHost;
  }
}
