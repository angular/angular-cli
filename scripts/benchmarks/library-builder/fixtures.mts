/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Generates synthetic Angular Package Format (APF) library fixtures for benchmarking
// `@angular/build:library` and `@angular/build:ng-packagr`. The same synthetic sources are emitted
// in either builder's project shape: a flat `exports` map in one root package.json for the native
// builder, or the per-entry-point `ng-package.json` convention for ng-packagr.

import fs from 'node:fs';
import path from 'node:path';

export type Layout = 'flat' | 'deep';

/** Which Architect builder the generated project targets. */
export type LibraryBuilder = 'library' | 'ng-packagr';

/** All library builders, in A/B order (native builder first, legacy builder second). */
export const LIBRARY_BUILDERS: readonly LibraryBuilder[] = ['library', 'ng-packagr'];

export const DEFAULT_LIBRARY_BUILDER: LibraryBuilder = 'library';

/**
 * Style-flavor matrix: crosses template location (inline vs. external `templateUrl`) with
 * stylesheet presence/language (none, CSS, SCSS). `external` has no stylesheet, matching
 * `inline`'s "no stylesheet" baseline but with an external `templateUrl` file instead of an
 * inline `template` string -- isolating the cost of extra per-entry file reads from the cost of
 * stylesheet processing.
 */
export type StyleFlavor =
  'inline' | 'inline-css' | 'inline-scss' | 'external' | 'external-css' | 'external-scss';

/** All style flavors, in matrix order (inline row, then external row). */
export const STYLE_FLAVORS: readonly StyleFlavor[] = [
  'inline',
  'inline-css',
  'inline-scss',
  'external',
  'external-css',
  'external-scss',
];

export const DEFAULT_STYLE_FLAVOR: StyleFlavor = 'inline';

export interface FixtureOptions {
  layout: Layout;

  /** Number of secondary entry points for `layout: 'flat'`. */
  count?: number;

  /** Binary-tree depth for `layout: 'deep'` (2^depth leaf entry points). */
  depth?: number;

  /** Template/stylesheet flavor for every entry point in the fixture. Defaults to `inline`. */
  styleFlavor?: StyleFlavor;

  /** Builder the generated project targets. Defaults to `library`. */
  builder?: LibraryBuilder;
}

/** Per-entry CSS/SCSS content, varied by `id` like the template so entries aren't byte-identical. */
function buildCssContent(selector: string, id: string): string {
  return `/* entry ${id} */\n.${selector} {\n  color: #336699;\n}\n`;
}

function buildScssContent(selector: string, id: string): string {
  return `$ref-color-${id}: #336699;\n.${selector} {\n  color: $ref-color-${id};\n}\n`;
}

function buildComponentSource(
  className: string,
  selector: string,
  id: string,
  compBase: string,
  styleFlavor: StyleFlavor,
): string {
  const metadata: string[] = [`  selector: '${selector}',`];

  switch (styleFlavor) {
    case 'inline':
      metadata.push(`  template: '<h2>Component no. ${id}</h2>',`);
      break;
    case 'inline-css':
      metadata.push(`  template: '<h2 class="${selector}">Component no. ${id}</h2>',`);
      metadata.push(`  styles: [\`.${selector} { color: #336699; }\`],`);
      break;
    case 'inline-scss':
      metadata.push(`  template: '<h2 class="${selector}">Component no. ${id}</h2>',`);
      metadata.push(
        `  styles: [\`$ref-color-${id}: #336699; .${selector} { color: $ref-color-${id}; }\`],`,
      );
      break;
    case 'external':
      metadata.push(`  templateUrl: './${compBase}.component.html',`);
      break;
    case 'external-css':
      metadata.push(`  templateUrl: './${compBase}.component.html',`);
      metadata.push(`  styleUrl: './${compBase}.component.css',`);
      break;
    case 'external-scss':
      metadata.push(`  templateUrl: './${compBase}.component.html',`);
      metadata.push(`  styleUrl: './${compBase}.component.scss',`);
      break;
  }

  return `import { Component } from '@angular/core';

@Component({
${metadata.join('\n')}
})
export class ${className} {}
`;
}

/** Writes one secondary entry point's source files (component + public-api.ts) into `entryDir`. */
function writeEntryPointSource(
  entryDir: string,
  id: string,
  styleFlavor: StyleFlavor,
  builder: LibraryBuilder,
): void {
  fs.mkdirSync(entryDir, { recursive: true });

  if (builder === 'ng-packagr') {
    // ng-packagr discovers secondary entry points by the presence of a per-directory ng-package.json.
    fs.writeFileSync(
      path.join(entryDir, 'ng-package.json'),
      JSON.stringify({ lib: { entryFile: 'public-api.ts' } }, null, 2) + '\n',
    );
  }

  const className = `RefComponent${id}`;
  const selector = `ref-comp-${id}`;
  const compBase = `comp-${id}`;

  fs.writeFileSync(
    path.join(entryDir, 'public-api.ts'),
    `export * from './${compBase}.component';\n`,
  );

  fs.writeFileSync(
    path.join(entryDir, `${compBase}.component.ts`),
    buildComponentSource(className, selector, id, compBase, styleFlavor),
  );

  if (
    styleFlavor === 'external' ||
    styleFlavor === 'external-css' ||
    styleFlavor === 'external-scss'
  ) {
    fs.writeFileSync(
      path.join(entryDir, `${compBase}.component.html`),
      `<h2 class="${selector}">Component no. ${id}</h2>\n`,
    );
  }

  if (styleFlavor === 'external-css') {
    fs.writeFileSync(
      path.join(entryDir, `${compBase}.component.css`),
      buildCssContent(selector, id),
    );
  }

  if (styleFlavor === 'external-scss') {
    fs.writeFileSync(
      path.join(entryDir, `${compBase}.component.scss`),
      buildScssContent(selector, id),
    );
  }
}

/** Generates `count` flat secondary entry points as direct siblings, returning their relative dirs. */
function generateFlatEntries(
  outDir: string,
  count: number,
  styleFlavor: StyleFlavor,
  builder: LibraryBuilder,
): string[] {
  const width = String(count).length;
  const dirs: string[] = [];
  for (let i = 1; i <= count; i++) {
    const id = String(i).padStart(width, '0');
    const relDir = `comp-${id}`;
    writeEntryPointSource(path.join(outDir, relDir), id, styleFlavor, builder);
    dirs.push(relDir);
  }

  return dirs;
}

/**
 * Generates a binary tree `depth` levels deep (`sub-a`/`sub-b` at each level), placing one
 * secondary entry point at each of the 2^depth leaves. Returns their relative dirs.
 */
function generateDeepEntries(
  outDir: string,
  depth: number,
  styleFlavor: StyleFlavor,
  builder: LibraryBuilder,
): string[] {
  const total = 2 ** depth;
  const width = String(total).length;
  const dirs: string[] = [];
  let counter = 0;

  function build(currentRelDir: string, level: number): void {
    if (level === depth) {
      counter++;
      const id = String(counter).padStart(width, '0');
      writeEntryPointSource(path.join(outDir, currentRelDir), id, styleFlavor, builder);
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

  const styleFlavor = options.styleFlavor ?? DEFAULT_STYLE_FLAVOR;
  const builder = options.builder ?? DEFAULT_LIBRARY_BUILDER;

  fs.writeFileSync(
    path.join(outDir, 'public-api.ts'),
    `export const REFERENCE_VERSION = '1.0.0';\n`,
  );

  const secondaryDirs =
    options.layout === 'flat'
      ? generateFlatEntries(outDir, options.count ?? 10, styleFlavor, builder)
      : generateDeepEntries(outDir, options.depth ?? 2, styleFlavor, builder);

  // Only the native builder reads an `exports` map; ng-packagr derives (and writes) it itself from
  // the per-entry-point ng-package.json files.
  const exportsMap: Record<string, string> = { '.': './public-api.ts' };
  if (builder === 'library') {
    for (const relDir of secondaryDirs) {
      exportsMap[`./${entryKey(relDir)}`] = `./${relDir.split(path.sep).join('/')}/public-api.ts`;
    }
  }

  // Fallback to a hardcoded version if the path lookup fails in the sandbox/environment.
  let peerRange = '^22.0.0';
  try {
    const angularCoreVersion = JSON.parse(
      fs.readFileSync(
        new URL('../../../node_modules/@angular/core/package.json', import.meta.url),
        'utf8',
      ),
    ).version as string;
    const match = angularCoreVersion.match(/^(\d+\.\d+)/);
    peerRange = match ? '^' + match[1] + '.0' : '^' + angularCoreVersion;
  } catch {
    // Ignore error, use fallback
  }

  fs.writeFileSync(
    path.join(outDir, 'package.json'),
    JSON.stringify(
      {
        name: `ref-${options.layout}`,
        version: '0.0.1',
        peerDependencies: {
          '@angular/core': peerRange,
          '@angular/common': peerRange,
        },
        ...(builder === 'library' ? { exports: exportsMap } : {}),
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

  let buildTarget: { builder: string; options: Record<string, unknown> };
  if (builder === 'library') {
    const buildOptions: Record<string, unknown> = {
      tsConfig: './tsconfig.lib.json',
      outputPath: 'dist',
    };
    if (styleFlavor === 'inline-scss') {
      // Inline style language is a project-wide builder option, not per-component -- this is the
      // only flavor that needs it set, since external .scss files are detected by extension and
      // 'css' (the default) already covers the other flavors.
      buildOptions['inlineStyleLanguage'] = 'scss';
    }
    buildTarget = { builder: '@angular/build:library', options: buildOptions };
  } else {
    const ngPackage: Record<string, unknown> = {
      dest: 'dist',
      lib: { entryFile: 'public-api.ts' },
    };
    if (styleFlavor === 'inline-scss') {
      // For ng-packagr the inline style language is configured in ng-package.json, not the builder.
      ngPackage['inlineStyleLanguage'] = 'scss';
    }
    fs.writeFileSync(
      path.join(outDir, 'ng-package.json'),
      JSON.stringify(ngPackage, null, 2) + '\n',
    );
    buildTarget = {
      builder: '@angular/build:ng-packagr',
      options: { project: './ng-package.json', tsConfig: './tsconfig.lib.json' },
    };
  }

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
            targets: { build: buildTarget },
          },
        },
      },
      null,
      2,
    ) + '\n',
  );

  return secondaryDirs.length;
}
