/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ResultFile } from '../../../builders/application/results';
import { calculateHash, initializeHash } from '../../../utils/hash';
import { BuildOutputFileType } from '../../esbuild/bundler-files';
import { createBuildAssetsMiddleware } from './assets-middleware';

describe('createBuildAssetsMiddleware', () => {
  beforeAll(async () => {
    await initializeHash();
  });

  function createMockReqRes(
    url: string,
    headers: Record<string, string> = {},
  ): {
    req: IncomingMessage;
    res: ServerResponse & { setHeader: jasmine.Spy; end: jasmine.Spy };
  } {
    const req = {
      url,
      method: 'GET',
      headers,
    } as unknown as IncomingMessage;

    const res = {
      statusCode: 200,
      writableEnded: false,
      setHeader: jasmine.createSpy('setHeader'),
      end: jasmine.createSpy('end'),
    } as unknown as ServerResponse & { setHeader: jasmine.Spy; end: jasmine.Spy };

    return { req, res };
  }

  it('uses precomputed outputFile.hash for memory files instead of recalculating hash', () => {
    const contents = new TextEncoder().encode('body { color: red; }');
    const precomputedHash = 'precomputed-memory-hash';
    const buildResultFiles = new Map<string, ResultFile>([
      [
        'styles.css',
        {
          origin: 'memory',
          path: 'styles.css',
          contents,
          hash: precomputedHash,
          type: BuildOutputFileType.Browser,
        },
      ],
    ]);

    const readHandler = jasmine.createSpy('readHandler');
    const middleware = createBuildAssetsMiddleware('/', buildResultFiles, readHandler);
    const { req, res } = createMockReqRes('/styles.css');
    const next = jasmine.createSpy('next');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(readHandler).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/css');
    expect(res.setHeader).toHaveBeenCalledWith('ETag', `W/"${precomputedHash}"`);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.end).toHaveBeenCalledWith(contents);
  });

  it('returns 304 for memory files when If-None-Match matches precomputed outputFile.hash', () => {
    const contents = new TextEncoder().encode('body { color: red; }');
    const precomputedHash = 'precomputed-memory-hash';
    const buildResultFiles = new Map<string, ResultFile>([
      [
        'styles.css',
        {
          origin: 'memory',
          path: 'styles.css',
          contents,
          hash: precomputedHash,
          type: BuildOutputFileType.Browser,
        },
      ],
    ]);

    const middleware = createBuildAssetsMiddleware('/', buildResultFiles);
    const { req, res } = createMockReqRes('/styles.css', {
      'if-none-match': `W/"${precomputedHash}"`,
    });
    const next = jasmine.createSpy('next');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(304);
    expect(res.end).toHaveBeenCalledWith();
  });

  it('calculates hash from disk contents when outputFile.origin is disk', () => {
    const diskBuffer = Buffer.from('console.log("asset");', 'utf-8');
    const expectedHash = calculateHash(diskBuffer);
    const buildResultFiles = new Map<string, ResultFile>([
      [
        'assets/data.json',
        {
          origin: 'disk',
          path: 'assets/data.json',
          source: '/workspace/src/assets/data.json',
          type: BuildOutputFileType.Browser,
        },
      ],
    ]);

    const readHandler = jasmine.createSpy('readHandler').and.returnValue(diskBuffer);
    const middleware = createBuildAssetsMiddleware('/', buildResultFiles, readHandler);
    const { req, res } = createMockReqRes('/assets/data.json');
    const next = jasmine.createSpy('next');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(readHandler).toHaveBeenCalledOnceWith('/workspace/src/assets/data.json');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.setHeader).toHaveBeenCalledWith('ETag', `W/"${expectedHash}"`);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.end).toHaveBeenCalledWith(diskBuffer);
  });

  it('returns 304 for disk files when If-None-Match matches calculated hash', () => {
    const diskBuffer = Buffer.from('{"ok":true}', 'utf-8');
    const expectedHash = calculateHash(diskBuffer);
    const buildResultFiles = new Map<string, ResultFile>([
      [
        'assets/data.json',
        {
          origin: 'disk',
          path: 'assets/data.json',
          source: '/workspace/src/assets/data.json',
          type: BuildOutputFileType.Browser,
        },
      ],
    ]);

    const readHandler = jasmine.createSpy('readHandler').and.returnValue(diskBuffer);
    const middleware = createBuildAssetsMiddleware('/', buildResultFiles, readHandler);
    const { req, res } = createMockReqRes('/assets/data.json', {
      'if-none-match': `W/"${expectedHash}"`,
    });
    const next = jasmine.createSpy('next');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(readHandler).toHaveBeenCalledOnceWith('/workspace/src/assets/data.json');
    expect(res.statusCode).toBe(304);
    expect(res.end).toHaveBeenCalledWith();
  });
});
