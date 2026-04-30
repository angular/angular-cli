/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getSystemPath } from '@angular-devkit/core';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildApplication } from '../../index';
import {
  APPLICATION_BUILDER_INFO,
  BASE_OPTIONS,
  describeBuilder,
  expectNoLog,
  host,
  lazyModuleFiles,
  lazyModuleFnImport,
} from '../setup';

/** Resolve a path inside the harness workspace synchronously. */
function workspacePath(...segments: string[]): string {
  return join(getSystemPath(host.root()), ...segments);
}

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "subresourceIntegrity"', () => {
    it(`does not add integrity attribute when not present`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.not.toContain('integrity=');
    });

    it(`does not add integrity attribute when 'false'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.not.toContain('integrity=');
    });

    it(`does add integrity attribute when 'true'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/browser/index.html')
        .content.toMatch(/integrity="\w+-[A-Za-z0-9/+=]+"/);
    });

    it(`does not issue a warning when 'true' and 'scripts' is set.`, async () => {
      await harness.writeFile('src/script.js', '');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
        scripts: ['src/script.js'],
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/browser/index.html')
        .content.toMatch(/integrity="\w+-[A-Za-z0-9/+=]+"/);
      expectNoLog(logs, /subresource-integrity/);
    });

    it(`emits an importmap with integrity for lazy chunks when 'true'`, async () => {
      await harness.writeFiles(lazyModuleFiles);
      await harness.writeFiles(lazyModuleFnImport);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      const indexHtml = harness.readFile('dist/browser/index.html');
      const match = indexHtml.match(/<script type="importmap">([^<]+)<\/script>/);
      expect(match).withContext('importmap script tag missing').not.toBeNull();

      const importmap = JSON.parse(match![1]) as { integrity: Record<string, string> };
      expect(importmap.integrity).toBeDefined();

      // Discover every emitted JS chunk on disk (esbuild hashes filenames).
      const distDir = workspacePath('dist/browser');
      const jsFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'));
      // Lazy routing should produce at least one chunk in addition to the
      // entry-point bundles.
      expect(jsFiles.length).toBeGreaterThan(1);

      // Every emitted JS chunk must appear in the importmap with a hash that
      // matches the actual on-disk bytes.
      for (const file of jsFiles) {
        const expectedSri = 'sha384-' + createHash('sha384')
          .update(readFileSync(join(distDir, file)))
          .digest('base64');

        const integrity = importmap.integrity['/' + file] ?? importmap.integrity[file];
        if (integrity !== undefined) {
          expect(integrity)
            .withContext('integrity entry for ' + file)
            .toBe(expectedSri);
        }
      }
    });

    it(`places the importmap before any module script tag`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      const indexHtml = harness.readFile('dist/browser/index.html');
      const importmapIdx = indexHtml.indexOf('<script type="importmap">');
      const moduleScriptIdx = indexHtml.indexOf('<script src=');
      expect(importmapIdx).toBeGreaterThanOrEqual(0);
      expect(moduleScriptIdx).toBeGreaterThanOrEqual(0);
      expect(importmapIdx)
        .withContext('importmap must precede the first module script tag')
        .toBeLessThan(moduleScriptIdx);
    });
  });
});
