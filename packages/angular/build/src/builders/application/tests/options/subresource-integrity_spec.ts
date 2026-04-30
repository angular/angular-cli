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

    it(`embeds an ECMA-426 debugId in JS and source map and the integrity matches`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
        sourceMap: { scripts: true },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      const distDir = workspacePath('dist/browser');
      const allEntries = readdirSync(distDir);
      const jsFiles = allEntries.filter(
        (f) => f.endsWith('.js') && allEntries.includes(`${f}.map`),
      );
      expect(jsFiles.length).toBeGreaterThan(0);

      const debugIdRe = /^\s*\/\/\s*#\s*debugId=([0-9a-f-]+)\s*$/m;
      const indexHtml = harness.readFile('dist/browser/index.html');
      const importmapMatch = indexHtml.match(/<script type="importmap">([^<]+)<\/script>/);
      const importmap = importmapMatch
        ? (JSON.parse(importmapMatch[1]) as { integrity: Record<string, string> })
        : { integrity: {} };

      for (const file of jsFiles) {
        const js = readFileSync(join(distDir, file), 'utf-8');
        const map = JSON.parse(readFileSync(join(distDir, `${file}.map`), 'utf-8'));

        const idMatch = js.match(debugIdRe);
        expect(idMatch).withContext(`debugId comment in ${file}`).not.toBeNull();
        const id = idMatch![1];

        // ECMA-426: source map carries the same id under "debugId".
        expect(map.debugId).withContext(`debugId field in ${file}.map`).toBe(id);

        // Integrity hash recorded in index.html (initial) or in the importmap
        // (lazy) must match the bytes written to disk *after* debug-id
        // injection, otherwise SRI validation in the browser will fail.
        const onDisk = readFileSync(join(distDir, file));
        const expectedSri = `sha384-${createHash('sha384').update(onDisk).digest('base64')}`;
        const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedSri = expectedSri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const inHeadIntegrity = new RegExp(
          `(?:src|href)="${escapedFile}"[^>]*integrity="${escapedSri}"`,
        );
        const fromImportmap = importmap.integrity[`/${file}`];
        expect(inHeadIntegrity.test(indexHtml) || fromImportmap === expectedSri)
          .withContext(`integrity for ${file} must match on-disk bytes`)
          .toBeTrue();
      }
    });

    it(`places the debugId comment immediately above sourceMappingURL`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        sourceMap: { scripts: true },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      const distDir = workspacePath('dist/browser');
      const allEntries = readdirSync(distDir);
      const jsFiles = allEntries.filter(
        (f) => f.endsWith('.js') && allEntries.includes(`${f}.map`),
      );
      expect(jsFiles.length).toBeGreaterThan(0);

      const ordering = /\/\/\s*#\s*debugId=[0-9a-f-]+\s*\n\s*\/\/\s*#\s*sourceMappingURL=/;
      for (const file of jsFiles) {
        const js = readFileSync(join(distDir, file), 'utf-8');
        expect(ordering.test(js))
          .withContext(`debugId must precede sourceMappingURL in ${file}`)
          .toBeTrue();
      }
    });
  });
});
