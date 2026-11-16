/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import type { ClientRequest, IncomingMessage } from 'node:http';
import https from 'node:https';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { InlineFontsProcessor } from './inline-fonts';

describe('InlineFontsProcessor', () => {
  describe('disk cache', () => {
    const url = 'https://fonts.googleapis.com/css2?family=Roboto';
    const content = '@font-face { font-family: Roboto; src: url(roboto.woff2); }';
    let tempRoot: string;
    let cache: { enabled: boolean; path: string; basePath: string };
    let cacheDirectory: string;
    let cacheFile: string;
    let getSpy: jasmine.Spy<typeof https.get>;

    beforeEach(async () => {
      const baseTmpDir = process.env['TEST_TMPDIR'];
      assert(baseTmpDir, 'TEST_TMPDIR is not set');
      tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-font-cache-test-'));
      cache = { enabled: true, path: join(tempRoot, 'cache'), basePath: tempRoot };
      cacheDirectory = join(cache.path, 'angular-build-fonts');
      cacheFile = join(cacheDirectory, createHash('sha256').update(url).digest('hex'));

      getSpy = spyOn(https, 'get').and.callFake((...args: unknown[]) => {
        const callback = args.at(-1);
        assert(typeof callback === 'function');
        const response = Readable.from([content]) as IncomingMessage;
        response.statusCode = 200;
        callback(response);

        return new EventEmitter() as ClientRequest;
      });
    });

    afterEach(async () => {
      if (tempRoot) {
        await rm(tempRoot, { recursive: true, force: true });
      }
    });

    it('should create the cache directory and save the stylesheet', async () => {
      const processor = new InlineFontsProcessor({ cache });

      expect(await processor.processURL(url)).toBe(content);
      expect(await readdir(cacheDirectory)).toHaveSize(1);
      expect(await readFile(cacheFile, 'utf8')).toBe(
        createHash('sha256').update(content).digest('hex') + content,
      );
    });

    it('should reuse the stylesheet across processor instances without another request', async () => {
      await mkdir(cacheDirectory, { recursive: true });
      expect(await new InlineFontsProcessor({ cache }).processURL(url)).toBe(content);
      getSpy.calls.reset();
      getSpy.and.throwError('Unexpected font request');

      expect(await new InlineFontsProcessor({ cache }).processURL(url)).toBe(content);
      expect(getSpy).not.toHaveBeenCalled();
      expect(existsSync(cacheFile)).toBeTrue();
    });

    it('should replace corrupted cache content with a downloaded stylesheet', async () => {
      await mkdir(cacheDirectory, { recursive: true });
      await writeFile(cacheFile, '0'.repeat(64) + content);

      expect(await new InlineFontsProcessor({ cache }).processURL(url)).toBe(content);
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(await readFile(cacheFile, 'utf8')).toBe(
        createHash('sha256').update(content).digest('hex') + content,
      );
    });

    it('should not cache stylesheets when the cache is disabled', async () => {
      const processor = new InlineFontsProcessor({ cache: { ...cache, enabled: false } });

      expect(await processor.processURL(url)).toBe(content);
      expect(await processor.processURL(url)).toBe(content);
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(existsSync(cache.path)).toBeFalse();
    });

    it('should still return the stylesheet when the cache cannot be written', async () => {
      await writeFile(cache.path, 'not a directory');

      expect(await new InlineFontsProcessor({ cache }).processURL(url)).toBe(content);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Google fonts', () => {
    const content = `
  <html>
    <head>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    </head>
    <body></body>
  </html>`;

    it('works with // protocol', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content.replace('https://', '//'));
      expect(html).toContain(`format('woff2');`);
    });

    it('should inline supported fonts and icons in HTML', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(`
      <html>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        <link href="theme.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
      </head>
      <body></body>
    </html>`);

      expect(html).not.toContain(
        'href="https://fonts.googleapis.com/css?family=Roboto:300,400,500"',
      );
      expect(html).not.toContain('href="https://fonts.googleapis.com/icon?family=Material+Icons"');
      expect(html).toContain('href="theme.css"');
      expect(html).toContain(`font-family: 'Roboto'`);
      expect(html).toContain(`font-family: 'Material Icons'`);
    });

    it('should inline multiple fonts from a single request with minification enabled', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: true,
      });

      const html = await inlineFontsProcessor.process(`
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500%7CGoogle+Sans:400,500%7CRoboto+Mono:400,500%7CMaterial+Icons&display=swap" rel="stylesheet">
        <link href="theme.css" rel="stylesheet">
      </head>
      <body></body>
    </html>`);

      expect(html).toContain(`'Google Sans'`);
      expect(html).toContain(`'Roboto'`);
      expect(html).toContain(`'Roboto Mono'`);
      expect(html).toContain(`'Material Icons'`);
    });

    it('works with http protocol', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content.replace('https://', 'http://'));
      expect(html).toContain(`format('woff2');`);
    });

    it('should remove comments and line breaks when `minifyInlinedCSS` is true', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: true,
      });

      const html = await inlineFontsProcessor.process(content);
      expect(html).not.toContain('/*');
      expect(html).toContain(';font-style:normal;');
    });

    it('should add preconnect hint', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content);
      expect(html).toContain(
        `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
      );
    });
  });

  describe('Adobe Typekit fonts', () => {
    const content = `
  <html>
    <head>
      <link href="https://use.typekit.net/plm1izr.css" rel="stylesheet">
    </head>
    <body></body>
  </html>`;

    it('should add preconnect hint', async () => {
      const inlineFontsProcessor = new InlineFontsProcessor({
        minify: false,
      });

      const html = await inlineFontsProcessor.process(content);
      expect(html).toContain(`<link rel="preconnect" href="https://use.typekit.net" crossorigin>`);
    });
  });
});
