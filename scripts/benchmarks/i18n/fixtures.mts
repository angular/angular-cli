/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import './init-env.mts';
import type { ɵParsedTranslation } from '@angular/localize';
import { transformSync } from 'esbuild';
import { createRequire } from 'node:module';

import path from 'node:path';

import type { BuildOutputFile } from '../../../dist/@angular/build/src/tools/esbuild/bundler-files.d.ts';
import type { LocaleInlineOptions } from '../../../dist/@angular/build/src/tools/esbuild/i18n-inliner.d.ts';

// Setup module paths to resolve dependencies from packages/angular/build
const requireFromBuild = createRequire(
  path.resolve(import.meta.dirname, '../../../packages/angular/build/package.json'),
);

const { BuildOutputFileType, createOutputFile } = requireFromBuild(
  '../../../dist/@angular/build/src/tools/esbuild/bundler-files.js',
) as typeof import('../../../packages/angular/build/src/tools/esbuild/bundler-files.js');

const { calculateHash, initializeHash } = requireFromBuild(
  '../../../dist/@angular/build/src/utils/hash.js',
) as typeof import('../../../packages/angular/build/src/utils/hash.js');

let isHashInitialized = false;

export async function initializeFixtures(): Promise<void> {
  if (!isHashInitialized) {
    await initializeHash();
    isHashInitialized = true;
  }
}

export function parsedTranslation(
  parts: string[],
  placeholderNames: string[] = [],
  text?: string,
): ɵParsedTranslation {
  return {
    messageParts: Object.assign([...parts], { raw: [...parts] }),
    placeholderNames,
    text: text ?? parts.join(''),
  };
}

export function generateTranslations(
  locales: string[],
  messageCount: number,
): LocaleInlineOptions[] {
  return locales.map((locale) => {
    const translation: Record<string, ɵParsedTranslation> = {};

    for (let i = 0; i < messageCount; i++) {
      const msgId = `msg_${i}`;
      translation[msgId] = parsedTranslation(
        [`[${locale}] Order #`, ` was confirmed for customer `, `. Thank you!`],
        ['orderId', 'customerName'],
        `[${locale}] Order #${i} was confirmed for customer Doe. Thank you!`,
      );
    }

    const translationIntegrity = calculateHash(JSON.stringify(translation));

    return {
      locale,
      translation,
      translationIntegrity,
    };
  });
}

export interface SyntheticBundleOptions {
  filename: string;
  targetByteSize: number;
  messageCount: number;
  withSourceMap?: boolean;
  messageIdOffset?: number;
}

export function generateSyntheticBundle(options: SyntheticBundleOptions): {
  codeFile: BuildOutputFile;
  mapFile?: BuildOutputFile;
} {
  const {
    filename,
    targetByteSize,
    messageCount,
    withSourceMap = true,
    messageIdOffset = 0,
  } = options;

  const parts: string[] = [
    '// Synthetic test bundle generated for i18n-inliner benchmark\n',
    'export const BUNDLE_META = { generated: true, timestamp: Date.now() };\n',
  ];

  // Generate functions with $localize call sites
  for (let i = 0; i < messageCount; i++) {
    const msgId = `msg_${messageIdOffset + i}`;
    parts.push(
      `export function renderMessage_${i}(orderId, customerName) {\n`,
      `  return $localize\`:@@${msgId}:Order #\${orderId}:orderId: ` +
        `was confirmed for customer \${customerName}:customerName:. Thank you!\`;\n`,
      `}\n`,
    );
  }

  // Calculate current approximate size and pad with realistic JS functions if needed
  let currentSize = parts.reduce((acc, str) => acc + str.length, 0);
  let classIndex = 0;

  while (currentSize < targetByteSize) {
    const filler =
      `export class DataProcessor_${classIndex} {\n` +
      `  constructor(id, options = {}) {\n` +
      `    this.id = id;\n` +
      `    this.options = Object.assign({ enabled: true, retries: 3 }, options);\n` +
      `    this.history = [];\n` +
      `  }\n` +
      `  process(batch) {\n` +
      `    if (!Array.isArray(batch)) return [];\n` +
      `    const result = batch.map((item, idx) => ({\n` +
      `      id: this.id + '_' + idx,\n` +
      `      source: item,\n` +
      `      timestamp: Date.now(),\n` +
      `      active: true\n` +
      `    }));\n` +
      `    this.history.push(...result);\n` +
      `    return result;\n` +
      `  }\n` +
      `}\n`;

    parts.push(filler);
    currentSize += filler.length;
    classIndex++;
  }

  const rawCode = parts.join('');

  let finalCode = rawCode;
  let finalMap: string | undefined;

  if (withSourceMap) {
    const result = transformSync(rawCode, {
      sourcemap: true,
      sourcefile: filename.replace(/\.js$/, '.ts'),
    });
    finalCode = result.code;
    finalMap = result.map;
  }

  const codeFile = createOutputFile(filename, finalCode, BuildOutputFileType.Browser);
  const mapFile = finalMap
    ? createOutputFile(filename + '.map', finalMap, BuildOutputFileType.Browser)
    : undefined;

  return { codeFile, mapFile };
}
