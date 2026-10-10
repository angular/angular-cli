/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Generates synthetic Angular Package Format (APF) library fixtures for benchmarking
// `@angular/build:library`, and converts them into the builder's project shape (a flat
// `exports` map in one root package.json, rather than the per-entry-point `ng-package.json`
// convention used by third-party tools such as ng-packagr).

import fs from 'node:fs';
import path from 'node:path';

export type Layout = 'flat' | 'deep';
export type Style = 'inline' | 'inline-scss' | 'external';

export interface FixtureOptions {
  layout: Layout;
  style: Style;

  /** Number of secondary entry points for `layout: 'flat'`. */
  count?: number;

  /** Binary-tree depth for `layout: 'deep'` (2^depth leaf entry points). */
  depth?: number;
}

function buildComponentSource(
  className: string,
  selector: string,
  compBase: string,
  id: string,
  style: Style,
): string {
  const metadataLines = [`  selector: '${selector}',`];

  if (style === 'external') {
    metadataLines.push(`  templateUrl: './${compBase}.component.html',`);
    metadataLines.push(`  styleUrls: ['./${compBase}.component.scss'],`);
  } else {
    metadataLines.push(`  template: '<div class="ref-comp">Reference component ${id}</div>',`);
    if (style === 'inline-scss') {
      metadataLines.push(`  styles: ['.ref-comp { display: block; padding: 4px; }'],`);
    }
  }

  return `import { Component } from '@angular/core';

@Component({
${metadataLines.join('\n')}
})
export class ${className} {}
`;
}

/** Writes one secondary entry point's source files (component + public-api.ts) into `entryDir`. */
function writeEntryPointSource(entryDir: string, id: string, style: Style): void {
  fs.mkdirSync(entryDir, { recursive: true });

  const className = `RefComponent${id}`;
  const selector = `ref-comp-${id}`;
  const compBase = `comp-${id}`;

  fs.writeFileSync(
    path.join(entryDir, 'public-api.ts'),
    `export * from './${compBase}.component';\n`,
  );

  if (style === 'external') {
    fs.writeFileSync(
      path.join(entryDir, `${compBase}.component.html`),
      `<div class="ref-comp">Reference component ${id}</div>\n`,
    );
    fs.writeFileSync(
      path.join(entryDir, `${compBase}.component.scss`),
      `.ref-comp {\n  display: block;\n  padding: 4px;\n}\n`,
    );
  }

  fs.writeFileSync(
    path.join(entryDir, `${compBase}.component.ts`),
    buildComponentSource(className, selector, compBase, id, style),
  );
}

/** Generates `count` flat secondary entry points as direct siblings, returning their relative dirs. */
function generateFlatEntries(outDir: string, count: number, style: Style): string[] {
  const width = String(count).length;
  const dirs: string[] = [];
  for (let i = 1; i <= count; i++) {
    const id = String(i).padStart(width, '0');
    const relDir = `comp-${id}`;
    writeEntryPointSource(path.join(outDir, relDir), id, style);
    dirs.push(relDir);
  }

  return dirs;
}

/**
 * Generates a binary tree `depth` levels deep (`sub-a`/`sub-b` at each level), placing one
 * secondary entry point at each of the 2^depth leaves. Returns their relative dirs.
 */
function generateDeepEntries(outDir: string, depth: number, style: Style): string[] {
  const total = 2 ** depth;
  const width = String(total).length;
  const dirs: string[] = [];
  let counter = 0;

  function build(currentRelDir: string, level: number): void {
    if (level === depth) {
      counter++;
      const id = String(counter).padStart(width, '0');
      writeEntryPointSource(path.join(outDir, currentRelDir), id, style);
      dirs.push(currentRelDir);

      return;
    }
    for (const child of ['sub-a', 'sub-b']) {
      build(path.join(currentRelDir, child), level + 1);
    }
  }

  build('.', 0);

  return dirs.map((d) => path.normalize(d));
}

/** "sub-a/sub-b" -> "sub-a-sub-b"; "comp-0001" -> "comp-0001". Used as the exports map subpath key. */
function entryKey(relDir: string): string {
  return relDir.split(path.sep).join('-');
}

/**
 * Generates a complete `@angular/build:library`-buildable project at `outDir`: a primary entry
 * point, N secondary entry points per `options`, and the angular.json/tsconfig/package.json
 * scaffolding the builder needs. Returns the number of secondary entry points generated.
 */
export function generateFixture(outDir: string, options: FixtureOptions): number {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'public-api.ts'),
    `export const REFERENCE_VERSION = '1.0.0';\n`,
  );

  const secondaryDirs =
    options.layout === 'flat'
      ? generateFlatEntries(outDir, options.count ?? 10, options.style)
      : generateDeepEntries(outDir, options.depth ?? 2, options.style);

  const exportsMap: Record<string, string> = { '.': './public-api.ts' };
  for (const relDir of secondaryDirs) {
    exportsMap[`./${entryKey(relDir)}`] = `./${relDir.split(path.sep).join('/')}/public-api.ts`;
  }

  const angularCoreVersion = JSON.parse(
    fs.readFileSync(
      new URL('../../../node_modules/@angular/core/package.json', import.meta.url),
      'utf8'
    )
  ).version as string;
  // e.g. "22.3.0-next.0" -> "22.3.0-next" (drop the trailing prerelease build number only).
  const peerRange = `^${angularCoreVersion.replace(/\.\d+$/, '')}`;

  fs.writeFileSync(
    path.join(outDir, 'package.json'),
    JSON.stringify(
      {
        name: `ref-${options.layout}-${options.style}`,
        version: '0.0.1',
        peerDependencies: {
          '@angular/core': peerRange,
          '@angular/common': peerRange,
        },
        exports: exportsMap,
      },
      null,
      2,
    ) + '\n',
  );

  fs.writeFileSync(
    path.join(outDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compileOnSave: false,
        compilerOptions: {
          outDir: './dist/out-tsc',
          sourceMap: true,
          declaration: false,
          moduleResolution: 'bundler',
          experimentalDecorators: true,
          target: 'es2022',
          module: 'es2022',
          useDefineForClassFields: false,
          lib: ['es2022', 'dom'],
        },
        angularCompilerOptions: {
          enableIvy: true,
          disableTypeScriptVersionCheck: true,
        },
      },
      null,
      2,
    ) + '\n',
  );

  fs.writeFileSync(
    path.join(outDir, 'tsconfig.lib.json'),
    JSON.stringify(
      {
        extends: './tsconfig.json',
        compilerOptions: {
          declaration: true,
          declarationMap: true,
          inlineSources: true,
          types: [],
        },
        exclude: ['**/*.spec.ts'],
      },
      null,
      2,
    ) + '\n',
  );

  fs.writeFileSync(
    path.join(outDir, 'angular.json'),
    JSON.stringify(
      {
        version: 1,
        cli: { cache: { enabled: false } },
        projects: {
          lib: {
            root: '.',
            projectType: 'library',
            sourceRoot: '.',
            targets: {
              build: {
                builder: '@angular/build:library',
                options: { tsConfig: './tsconfig.lib.json', outputPath: 'dist' },
              },
            },
          },
        },
      },
      null,
      2,
    ) + '\n',
  );

  return secondaryDirs.length;
}
