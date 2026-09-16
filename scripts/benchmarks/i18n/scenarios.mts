/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import './init-env.mts';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import type { BuildOutputFile } from '../../../dist/@angular/build/src/tools/esbuild/bundler-files.d.ts';
import type { LocaleInlineOptions } from '../../../dist/@angular/build/src/tools/esbuild/i18n-inliner.d.ts';
import { generateSyntheticBundle, generateTranslations, initializeFixtures } from './fixtures.mts';
import type { BenchmarkScenario } from './harness.mts';

const requireFromBuild = createRequire(
  path.resolve(import.meta.dirname, '../../../packages/angular/build/package.json'),
);

const { I18nInliner } = requireFromBuild(
  '../../../dist/@angular/build/src/tools/esbuild/i18n-inliner.js',
) as typeof import('../../../dist/@angular/build/src/tools/esbuild/i18n-inliner.d.ts');

export interface ScenarioFactoryOptions {
  concurrency?: number;
}

const DEFAULT_LOCALES_8 = ['fr', 'de', 'es', 'ja', 'zh', 'it', 'pt', 'ko'];
const DEFAULT_LOCALES_32 = [
  'fr',
  'de',
  'es',
  'ja',
  'zh',
  'it',
  'pt',
  'ko',
  'ru',
  'pl',
  'nl',
  'tr',
  'ar',
  'hi',
  'sv',
  'da',
  'fi',
  'no',
  'cs',
  'el',
  'he',
  'hu',
  'id',
  'ms',
  'ro',
  'sk',
  'th',
  'uk',
  'vi',
  'bg',
  'hr',
  'sr',
];

interface GeneratedWorkload {
  files: BuildOutputFile[];
  locales: LocaleInlineOptions[];
  totalInputSizeBytes: number;
}

function createBundleSet(
  mainSizeBytes: number,
  chunkCount: number,
  chunkSizeBytes: number,
  messageCount: number,
  withSourceMap: boolean,
): BuildOutputFile[] {
  const files: BuildOutputFile[] = [];

  const mainMessages = Math.floor(messageCount * 0.4);
  const { codeFile: mainCode, mapFile: mainMap } = generateSyntheticBundle({
    filename: 'main.js',
    targetByteSize: mainSizeBytes,
    messageCount: mainMessages,
    withSourceMap,
    messageIdOffset: 0,
  });

  files.push(mainCode);
  if (mainMap) {
    files.push(mainMap);
  }

  const remainingMessages = messageCount - mainMessages;
  const messagesPerChunk = Math.max(1, Math.floor(remainingMessages / chunkCount));

  for (let i = 0; i < chunkCount; i++) {
    const { codeFile, mapFile } = generateSyntheticBundle({
      filename: `chunk_${i}.js`,
      targetByteSize: chunkSizeBytes,
      messageCount: messagesPerChunk,
      withSourceMap,
      messageIdOffset: mainMessages + i * messagesPerChunk,
    });

    files.push(codeFile);
    if (mapFile) {
      files.push(mapFile);
    }
  }

  return files;
}

function calculateInputSizeBytes(files: BuildOutputFile[]): number {
  return files.reduce((total, f) => {
    // Only count JS code size towards raw input volume (maps are auxiliary)
    return f.path.endsWith('.js') ? total + f.size : total;
  }, 0);
}

/**
 * 1. Standard App Scenario:
 * 1 main bundle (1 MB) + 20 route chunks (50 KB) = ~2 MB input JS, 8 locales, maps enabled.
 */
export function createStandardAppScenario(options: ScenarioFactoryOptions = {}): BenchmarkScenario {
  let workload: GeneratedWorkload | undefined;

  return {
    name: 'standard-app',
    description: 'Standard App: 1 main bundle (1 MB) + 20 chunks (50 KB), 8 locales, sourcemaps ON',
    get inputSizeBytes() {
      return workload?.totalInputSizeBytes ?? 0;
    },
    get localeCount() {
      return DEFAULT_LOCALES_8.length;
    },
    async setup() {
      await initializeFixtures();
      const files = createBundleSet(1024 * 1024, 20, 50 * 1024, 1000, true);
      const locales = generateTranslations(DEFAULT_LOCALES_8, 1000);
      workload = {
        files,
        locales,
        totalInputSizeBytes: calculateInputSizeBytes(files),
      };
    },
    async run() {
      if (!workload) {
        return;
      }
      const inliner = new I18nInliner({
        missingTranslation: 'warning',
        maxConcurrency: options.concurrency,
      });
      try {
        await inliner.inlineAll(workload.files, workload.locales);
      } finally {
        await inliner.close();
      }
    },
  };
}

/**
 * 2. Standard App without Sourcemaps:
 * Evaluates inlining without source map generation and remapping.
 */
export function createStandardAppNoMapsScenario(
  options: ScenarioFactoryOptions = {},
): BenchmarkScenario {
  let workload: GeneratedWorkload | undefined;

  return {
    name: 'standard-app-no-maps',
    description:
      'Standard App (No Maps): 1 main bundle (1 MB) + 20 chunks (50 KB), 8 locales, sourcemaps OFF',
    get inputSizeBytes() {
      return workload?.totalInputSizeBytes ?? 0;
    },
    get localeCount() {
      return DEFAULT_LOCALES_8.length;
    },
    async setup() {
      await initializeFixtures();
      const files = createBundleSet(1024 * 1024, 20, 50 * 1024, 1000, false);
      const locales = generateTranslations(DEFAULT_LOCALES_8, 1000);
      workload = {
        files,
        locales,
        totalInputSizeBytes: calculateInputSizeBytes(files),
      };
    },
    async run() {
      if (!workload) {
        return;
      }
      const inliner = new I18nInliner({
        missingTranslation: 'warning',
        maxConcurrency: options.concurrency,
      });
      try {
        await inliner.inlineAll(workload.files, workload.locales);
      } finally {
        await inliner.close();
      }
    },
  };
}

/**
 * 3. Enterprise Multilingual Scenario:
 * 1 main bundle (2 MB) + 40 chunks (60 KB), 32 locales, 3,000 translations, sourcemaps ON.
 * Exercises sliding window batching (4 windows of 8 locales) and memory scaling.
 */
export function createEnterpriseScenario(options: ScenarioFactoryOptions = {}): BenchmarkScenario {
  let workload: GeneratedWorkload | undefined;

  return {
    name: 'enterprise-multilingual',
    description: 'Enterprise: 1 main (2 MB) + 40 chunks (60 KB), 32 locales, sourcemaps ON',
    get inputSizeBytes() {
      return workload?.totalInputSizeBytes ?? 0;
    },
    get localeCount() {
      return DEFAULT_LOCALES_32.length;
    },
    async setup() {
      await initializeFixtures();
      const files = createBundleSet(2 * 1024 * 1024, 40, 60 * 1024, 3000, true);
      const locales = generateTranslations(DEFAULT_LOCALES_32, 3000);
      workload = {
        files,
        locales,
        totalInputSizeBytes: calculateInputSizeBytes(files),
      };
    },
    async run() {
      if (!workload) {
        return;
      }
      const inliner = new I18nInliner({
        missingTranslation: 'warning',
        maxConcurrency: options.concurrency,
      });
      try {
        await inliner.inlineAll(workload.files, workload.locales);
      } finally {
        await inliner.close();
      }
    },
  };
}

/**
 * 4. Monolithic Dominant Scenario:
 * 1 dominant bundle (6 MB) + 5 small runtime chunks (30 KB), 8 locales, sourcemaps ON.
 * Evaluates whether LPT + DOMINANT_FILE_RATIO sharding saturates workers efficiently.
 */
export function createMonolithicScenario(options: ScenarioFactoryOptions = {}): BenchmarkScenario {
  let workload: GeneratedWorkload | undefined;

  return {
    name: 'monolithic-dominant',
    description: 'Monolithic: 1 dominant bundle (6 MB) + 5 small chunks (30 KB), 8 locales',
    get inputSizeBytes() {
      return workload?.totalInputSizeBytes ?? 0;
    },
    get localeCount() {
      return DEFAULT_LOCALES_8.length;
    },
    async setup() {
      await initializeFixtures();
      const files = createBundleSet(6 * 1024 * 1024, 5, 30 * 1024, 2000, true);
      const locales = generateTranslations(DEFAULT_LOCALES_8, 2000);
      workload = {
        files,
        locales,
        totalInputSizeBytes: calculateInputSizeBytes(files),
      };
    },
    async run() {
      if (!workload) {
        return;
      }
      const inliner = new I18nInliner({
        missingTranslation: 'warning',
        maxConcurrency: options.concurrency,
      });
      try {
        await inliner.inlineAll(workload.files, workload.locales);
      } finally {
        await inliner.close();
      }
    },
  };
}

/**
 * Helper to prime the persistent cache in an isolated process.
 */
export async function primeCache(cacheDir: string, concurrency?: number): Promise<void> {
  await initializeFixtures();
  const files = createBundleSet(1024 * 1024, 15, 50 * 1024, 1000, true);
  const locales = generateTranslations(DEFAULT_LOCALES_8, 1000);
  const primer = new I18nInliner({
    missingTranslation: 'warning',
    persistentCachePath: cacheDir,
    maxConcurrency: concurrency,
  });
  await primer.inlineAll(files, locales);
  await primer.close();
}

/**
 * 5. Persistent Cache Warm Scenario:
 * Evaluates throughput when 100% of transformed files and translations are pre-cached in LMDB.
 */
export function createPersistentCacheWarmScenario(
  options: ScenarioFactoryOptions = {},
): BenchmarkScenario {
  let workload: GeneratedWorkload | undefined;
  let cacheDir: string | undefined;

  return {
    name: 'persistent-cache-warm',
    description:
      'Persistent Cache (Warm): 100% LMDB cache hits for transformed files & translations',
    get inputSizeBytes() {
      return workload?.totalInputSizeBytes ?? 0;
    },
    get localeCount() {
      return DEFAULT_LOCALES_8.length;
    },
    async setup() {
      await initializeFixtures();
      cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'angular-i18n-bench-cache-'));
      const files = createBundleSet(1024 * 1024, 15, 50 * 1024, 1000, true);
      const locales = generateTranslations(DEFAULT_LOCALES_8, 1000);
      workload = {
        files,
        locales,
        totalInputSizeBytes: calculateInputSizeBytes(files),
      };

      // Prime the persistent cache out-of-process so cold worker thread allocations
      // do not inflate this process's RSS metrics.
      const primerCode =
        `import { primeCache } from ${JSON.stringify(path.resolve(import.meta.dirname, './scenarios.mts'))};\n` +
        `await primeCache(${JSON.stringify(cacheDir)}, ${options.concurrency ?? 'undefined'});\n`;

      spawnSync(
        process.execPath,
        ['--no-warnings=ExperimentalWarning', '--experimental-transform-types', '-e', primerCode],
        { stdio: 'inherit' },
      );
    },

    async run() {
      if (!workload || !cacheDir) {
        return;
      }
      const inliner = new I18nInliner({
        missingTranslation: 'warning',
        persistentCachePath: cacheDir,
        maxConcurrency: options.concurrency,
      });
      try {
        await inliner.inlineAll(workload.files, workload.locales);
      } finally {
        await inliner.close();
      }
    },
    async teardown() {
      if (cacheDir) {
        await fs.rm(cacheDir, { recursive: true, force: true }).catch(() => {});
      }
    },
  };
}

export function getAllScenarios(options: ScenarioFactoryOptions = {}): BenchmarkScenario[] {
  return [
    createStandardAppScenario(options),
    createStandardAppNoMapsScenario(options),
    createEnterpriseScenario(options),
    createMonolithicScenario(options),
    createPersistentCacheWarmScenario(options),
  ];
}

export function getScenarioByName(
  name: string,
  options: ScenarioFactoryOptions = {},
): BenchmarkScenario | undefined {
  const all = getAllScenarios(options);

  return all.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
