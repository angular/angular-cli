/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as webpack from 'webpack';
import { markAsyncChunksNonInitial } from './async-chunks';

describe('async-chunks', () => {
  describe('markAsyncChunksNonInitial()', () => {
    it('sets `initial: false` for all extra entry points loaded asynchronously', () => {
      const chunks = [
        {
          id: 0,
          names: ['first'],
          initial: true,
          files: [],
        },
        {
          id: 1,
          names: ['second'],
          initial: true,
          files: [],
        },
        {
          id: 'third', // IDs can be strings too.
          names: ['third'],
          initial: true,
          files: [],
        },
      ];
      const entrypoints = {
        first: {
          chunks: [0],
        },
        second: {
          chunks: [1],
        },
        third: {
          chunks: ['third'],
        },
      };
      const webpackStats = { chunks, entrypoints };

      const extraEntryPoints = [
        {
          bundleName: 'first',
          inject: false, // Loaded asynchronously.
          input: 'first.css',
        },
        {
          bundleName: 'second',
          inject: true,
          input: 'second.js',
        },
        {
          bundleName: 'third',
          inject: false, // Loaded asynchronously.
          input: 'third.js',
        },
      ];

      const newChunks = markAsyncChunksNonInitial(webpackStats as unknown as webpack.StatsCompilation, extraEntryPoints);

      expect(newChunks).toEqual([
        {
          id: 0,
          names: ['first'],
          initial: false, // No longer initial because it was marked async.
          files: [],
        },
        {
          id: 1,
          names: ['second'],
          initial: true,
          files: [],
        },
        {
          id: 'third',
          names: ['third'],
          initial: false, // No longer initial because it was marked async.
          files: [],
        },
      ] as unknown as webpack.StatsChunk[]);
    });

    it('ignores runtime dependency of async chunks', () => {
      const chunks = [
        {
          id: 0,
          names: ['asyncStuff'],
          initial: true,
          files: [],
        },
        {
          id: 1,
          names: ['runtime'],
          initial: true,
          files: [],
        },
      ];
      const entrypoints = {
        asyncStuff: {
          chunks: [0, 1], // Includes runtime as a dependency.
        },
      };
      const webpackStats = { chunks, entrypoints };

      const extraEntryPoints = [
        {
          bundleName: 'asyncStuff',
          inject: false, // Loaded asynchronously.
          input: 'asyncStuff.js',
        },
      ];

      const newChunks = markAsyncChunksNonInitial(webpackStats as unknown as webpack.StatsCompilation, extraEntryPoints);

      expect(newChunks).toEqual([
        {
          id: 0,
          names: ['asyncStuff'],
          initial: false, // No longer initial because it was marked async.
          files: [],
        },
        {
          id: 1,
          names: ['runtime'],
          initial: true, // Still initial, even though its a dependency.
          files: [],
        },
      ] as unknown as webpack.StatsChunk[]);
    });
  });
});
