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

      const initialJsFiles = new Set<string>();
      for (const [, src] of indexHtml.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)) {
        initialJsFiles.add(src);
      }
      for (const [, href] of indexHtml.matchAll(
        /<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"[^>]*>/g,
      )) {
        initialJsFiles.add(href);
      }

      const distDir = workspacePath('dist/browser');
      const lazyJsFiles = readdirSync(distDir).filter(
        (f) => f.endsWith('.js') && !initialJsFiles.has(f),
      );
      expect(lazyJsFiles.length)
        .withContext('expected at least one non-initial (lazy) JS file')
        .toBeGreaterThan(0);

      const importmapFiles = Object.keys(importmap.integrity);
      expect(importmapFiles.sort())
        .withContext('importmap integrity keys should match emitted lazy JS files')
        .toEqual(lazyJsFiles.sort());

      for (const [file, integrity] of Object.entries(importmap.integrity)) {
        const expectedSri =
          'sha384-' +
          createHash('sha384')
            .update(readFileSync(join(distDir, file)))
            .digest('base64');

        expect(integrity)
          .withContext('importmap integrity hash should match for emitted lazy JS file ' + file)
          .toBe(expectedSri);
      }
    });

    it(`places the importmap before any module script tag`, async () => {
      await harness.writeFiles(lazyModuleFiles);
      await harness.writeFiles(lazyModuleFnImport);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      const indexHtml = harness.readFile('dist/browser/index.html');
      const importmapIdx = indexHtml.indexOf('<script type="importmap">');
      const moduleScriptMatch = indexHtml.match(/<script[^>]*type="module"[^>]*>/);
      const moduleScriptIdx = moduleScriptMatch ? (moduleScriptMatch.index ?? -1) : -1;

      expect(importmapIdx).toBeGreaterThanOrEqual(0);
      expect(moduleScriptIdx).toBeGreaterThanOrEqual(0);
      expect(importmapIdx)
        .withContext('importmap must precede the first module script tag')
        .toBeLessThan(moduleScriptIdx);
    });
  });
});
