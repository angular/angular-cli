/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import assert from 'node:assert';
import { posix } from 'node:path';
import { Visitor, parseSync } from 'oxc-parser';
import { calculateHash } from '../../utils/hash';
import { toPosixPath } from '../../utils/path';
import { BuildOutputFile, BuildOutputFileType } from '../esbuild/bundler-files';

const HASHED_SCRIPT = /-[a-zA-Z0-9_-]{8}\.js$/;
const WORKER_SCRIPT = /^worker-[a-zA-Z0-9_-]{8}\.js$/;
const WORKER_REFERENCE = /worker-[a-zA-Z0-9_-]{8}\.js['"`]/;

interface Reference {
  path: string;
  start: number;
  end: number;
  worker: boolean;
}

/**
 * Assigns names to localized browser scripts based on their content and internal dependencies.
 * Files whose bytes and dependency URLs do not change keep the original bundler name.
 */
export function createLocalizedOutputHasher(
  originalFiles: BuildOutputFile[],
  unhashedScripts: ReadonlySet<string>,
  metafile: Metafile,
): (files: BuildOutputFile[]) => Map<string, string> {
  const originals = new Map(originalFiles.map((file) => [file.path, file]));
  const outputPaths = new Map(
    originalFiles
      .filter(({ type, path }) => type === BuildOutputFileType.Browser && HASHED_SCRIPT.test(path))
      .map(({ path }) => [toPosixPath(path), path]),
  );
  const hasWorkers = [...outputPaths.keys()].some((path) =>
    WORKER_SCRIPT.test(posix.basename(path)),
  );
  const references = new Map<string, Reference[]>();
  const encoder = new TextEncoder();
  const canRename = (path: string) =>
    outputPaths.has(toPosixPath(path)) && !unhashedScripts.has(path);
  const dependencies = new Map<string, string[]>();
  const dependents = new Map<string, Set<string>>();

  // Both esbuild and the chunk optimizer expose a workspace-relative output graph.
  // Worker URLs are not ESM edges; look for them only when a worker bundle exists.
  for (const file of originalFiles) {
    const { type, path } = file;
    if (type !== BuildOutputFileType.Browser || !path.endsWith('.js')) {
      continue;
    }
    const metadata = metafile.outputs[toPosixPath(path)] ?? metafile.outputs[path];
    const targets = new Set<string>();
    if (metadata) {
      for (const { kind, path: target, external } of metadata.imports) {
        if (!external && (kind === 'import-statement' || kind === 'dynamic-import')) {
          const targetPath = toPosixPath(target);
          const output =
            outputPaths.get(targetPath) ?? outputPaths.get(posix.normalize(targetPath));
          if (output) {
            targets.add(output);
          }
        }
      }
    }
    if (!metadata || (hasWorkers && WORKER_REFERENCE.test(file.text))) {
      const refs = findReferences(file, outputPaths, hasWorkers);
      references.set(path, refs);
      for (const { path: target, worker } of refs) {
        if (!metadata || worker) {
          targets.add(target);
        }
      }
    }

    if (!targets.size) {
      continue;
    }
    dependencies.set(path, [...targets].sort());
    for (const dependency of targets) {
      let importers = dependents.get(dependency);
      if (!importers) {
        dependents.set(dependency, (importers = new Set()));
      }
      importers.add(path);
    }
  }

  return (files) => {
    const outputs = new Map(files.map((file) => [file.path, file]));
    const scripts = files.filter(
      ({ type, path }) => type === BuildOutputFileType.Browser && path.endsWith('.js'),
    );
    const changed = new Set<string>();
    const changedCode = new Set<string>();

    for (const { path } of scripts) {
      if (differs(path)) {
        changedCode.add(path);
      }
      if (canRename(path) && (changedCode.has(path) || differs(path + '.map'))) {
        changed.add(path);
      }
    }

    function differs(path: string): boolean {
      return contentsDiffer(originals.get(path)?.contents, outputs.get(path)?.contents);
    }

    // An importer changes when any of the URLs in its code changes.
    for (const path of changed) {
      for (const importer of dependents.get(path) ?? []) {
        if (canRename(importer)) {
          changed.add(importer);
        }
      }
    }

    const names = new Map<string, string>();
    const fingerprint = (path: string) => {
      const output = outputs.get(path);
      assert(output, 'Expected browser output file: ' + path);
      const map = outputs.get(path + '.map');

      return [
        path,
        calculateHash(output.contents),
        map && calculateHash(map.contents),
        dependencies
          .get(path)
          ?.map((target) => names.get(target))
          .filter(Boolean),
      ];
    };
    const setName = (path: string, seed: unknown) => {
      // Use 40 bits, the same length as esbuild's hash. Keeping the filename width also
      // preserves generated columns in source maps when import specifiers are rewritten.
      const digest = calculateHash(JSON.stringify(seed)).slice(0, 10);
      const suffix = Number.parseInt(digest, 16).toString(36).toUpperCase().padStart(8, '0');
      names.set(path, path.replace(HASHED_SCRIPT, `-${suffix}.js`));
    };

    for (const component of dependencyComponents(changed, dependencies, dependents)) {
      if (component.length === 1) {
        setName(component[0], fingerprint(component[0]));
      } else {
        // Cyclic files depend on each other's final URLs. Hash them together so that
        // changes invalidate the cycle and its importers without touching other cycles.
        const digest = calculateHash(JSON.stringify(component.sort().map(fingerprint)));
        for (const path of component) {
          setName(path, [path, digest]);
        }
      }
    }

    for (const file of scripts) {
      const newName = names.get(file.path);
      const targets = dependencies.get(file.path)?.filter((target) => names.has(target));
      let edits: Reference[] = [];
      if (targets?.length) {
        let refs = changedCode.has(file.path) ? undefined : references.get(file.path);
        if (!refs) {
          refs = findReferences(file, outputPaths, hasWorkers);
          if (!changedCode.has(file.path)) {
            references.set(file.path, refs);
          }
        }
        const renamedTargets = new Set(targets);
        edits = refs.filter(({ path }) => renamedTargets.has(path));
      }
      if (!newName && !edits.length) {
        continue;
      }

      const original = file.text;
      const parts: string[] = [];
      let cursor = 0;
      for (const { path, start, end } of edits.sort((a, b) => a.start - b.start)) {
        const name = names.get(path);
        assert(name, 'Expected renamed dependency: ' + path);
        const specifier = original
          .slice(start, end)
          .replace(/-[a-zA-Z0-9_-]{8}\.js(?=['"`]$)/, name.slice(-12));
        parts.push(original.slice(cursor, start), specifier);
        cursor = end;
      }
      parts.push(original.slice(cursor));
      let code = parts.join('');

      if (newName) {
        const map = outputs.get(file.path + '.map');
        if (map) {
          const oldMapName = posix.basename(toPosixPath(map.path));
          map.path = newName + '.map';
          const newMapName = posix.basename(toPosixPath(map.path));
          code = code.replace(/(\/\/# sourceMappingURL=)([^\r\n]+)\s*$/, (match, prefix, url) =>
            url === oldMapName ? match.replace(prefix + url, prefix + newMapName) : match,
          );
          const sourceMap = JSON.parse(map.text);
          if (sourceMap.file === posix.basename(toPosixPath(file.path))) {
            sourceMap.file = posix.basename(toPosixPath(newName));
            map.contents = encoder.encode(JSON.stringify(sourceMap));
          }
          names.set(file.path + '.map', map.path);
        }

        file.path = newName;
      }
      if (code !== original) {
        file.contents = encoder.encode(code);
      }
    }

    return names;
  };
}

function contentsDiffer(before: Uint8Array | undefined, after: Uint8Array | undefined): boolean {
  return (
    before !== after &&
    (!before ||
      !after ||
      before.length !== after.length ||
      !Buffer.from(before.buffer, before.byteOffset, before.byteLength).equals(after))
  );
}

/** Visits strongly connected components in dependency-first order (iterative Kosaraju). */
function* dependencyComponents(
  changed: ReadonlySet<string>,
  dependencies: ReadonlyMap<string, string[]>,
  dependents: ReadonlyMap<string, Set<string>>,
): Iterable<string[]> {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const start of changed) {
    if (seen.has(start)) {
      continue;
    }

    const stack = [{ path: start, exiting: false }];
    for (let item = stack.pop(); item; item = stack.pop()) {
      const { path, exiting } = item;
      if (exiting) {
        order.push(path);
      } else if (!seen.has(path)) {
        seen.add(path);
        stack.push({ path, exiting: true });
        for (const importer of dependents.get(path) ?? []) {
          if (changed.has(importer) && !seen.has(importer)) {
            stack.push({ path: importer, exiting: false });
          }
        }
      }
    }
  }

  seen.clear();
  for (let i = order.length - 1; i >= 0; i--) {
    const path = order[i];
    if (seen.has(path)) {
      continue;
    }

    const component = [path];
    seen.add(path);
    for (const member of component) {
      for (const dependency of dependencies.get(member) ?? []) {
        if (changed.has(dependency) && !seen.has(dependency)) {
          seen.add(dependency);
          component.push(dependency);
        }
      }
    }
    yield component;
  }
}

function findReferences(
  file: BuildOutputFile,
  outputPaths: ReadonlyMap<string, string>,
  hasWorkers: boolean,
): Reference[] {
  const { path, text } = file;
  if (!/-[a-zA-Z0-9_-]{8}\.js['"`]/.test(text)) {
    return [];
  }
  const references: Reference[] = [];
  const directory = posix.dirname(toPosixPath(path));
  const add = (value: string, start: number, end: number, worker = false) => {
    if (!worker && !value.startsWith('./') && !value.startsWith('../')) {
      return;
    }
    const target = outputPaths.get(posix.join(directory, value));
    if (target && HASHED_SCRIPT.test(target)) {
      references.push({ path: target, start, end, worker });
    }
  };

  const result = parseSync(path, text);
  // OXC can expose the offsets without materializing the full AST. Empty re-exports
  // are omitted by its module view, and worker URLs also require inspecting the AST.
  if (!(hasWorkers && WORKER_REFERENCE.test(text)) && !/\bexport\s*(?:\/|\{\s*[/}])/.test(text)) {
    const { staticImports, staticExports, dynamicImports } = result.module;
    let needsAst = false;
    for (const {
      moduleRequest: { start, end },
    } of dynamicImports) {
      const raw = text.slice(start, end);
      const quote = raw[0];
      if (quote !== '"' && quote !== "'" && quote !== '`') {
        continue;
      }
      if (raw.includes('\\')) {
        needsAst = true;
        break;
      }
      const value = raw.slice(1, -1);
      if (
        raw.at(-1) === quote &&
        !value.includes(quote) &&
        !(quote === '`' && value.includes('${'))
      ) {
        add(value, start, end);
      }
    }
    if (!needsAst) {
      for (const {
        moduleRequest: { value, start, end },
      } of staticImports) {
        add(value, start, end);
      }
      for (const { entries } of staticExports) {
        const request = entries.find(({ moduleRequest }) => moduleRequest)?.moduleRequest;
        if (request) {
          add(request.value, request.start, request.end);
        }
      }

      return references;
    }
    references.length = 0;
  }

  const visitor = new Visitor({
    ImportDeclaration({ source }) {
      add(source.value, source.start, source.end);
    },
    ExportAllDeclaration({ source }) {
      add(source.value, source.start, source.end);
    },
    ExportNamedDeclaration({ source }) {
      if (source) {
        add(source.value, source.start, source.end);
      }
    },
    ImportExpression({ source }) {
      if (source.type === 'Literal' && typeof source.value === 'string') {
        add(source.value, source.start, source.end);
      } else if (source.type === 'TemplateLiteral' && !source.expressions.length) {
        const value = source.quasis[0].value.cooked;
        if (value != null) {
          add(value, source.start, source.end);
        }
      }
    },
    NewExpression({ callee, arguments: args }) {
      const [source, base] = args;
      if (
        callee.type !== 'Identifier' ||
        callee.name !== 'URL' ||
        !source ||
        base?.type !== 'MemberExpression' ||
        base.object.type !== 'MetaProperty' ||
        base.object.meta.name !== 'import' ||
        base.computed ||
        base.property.type !== 'Identifier' ||
        base.property.name !== 'url'
      ) {
        return;
      }
      // Rolldown can print a static worker URL as a template literal.
      const value =
        source.type === 'Literal'
          ? source.value
          : source.type === 'TemplateLiteral' && !source.expressions.length
            ? source.quasis[0].value.cooked
            : undefined;
      if (typeof value === 'string' && WORKER_SCRIPT.test(value.replace(/^\.\//, ''))) {
        add(value, source.start, source.end, true);
      }
    },
  });
  visitor.visit(result.program);

  return references;
}
