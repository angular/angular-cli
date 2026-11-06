/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { InlineCodeRequest, InlineFileBatchRequest } from '../tools/i18n/i18n-inliner-worker';
import transformJavaScript, {
  type JavaScriptTransformRequest,
} from '../tools/javascript-transformer/javascript-transformer-worker';

export interface TransformJsTask extends JavaScriptTransformRequest {
  tag: 'transform-js';
}

export interface InlineI18nFileBatchTask extends InlineFileBatchRequest {
  tag: 'inline-i18n';
  action: 'inlineFileBatch';
}

export interface InlineI18nCodeTask extends InlineCodeRequest {
  tag: 'inline-i18n';
  action: 'inlineCode';
}

export type InlineI18nTask = InlineI18nFileBatchTask | InlineI18nCodeTask;

export type SharedWorkerTask = TransformJsTask | InlineI18nTask;

type I18nWorkerModule = typeof import('../tools/i18n/i18n-inliner-worker');
let i18nWorker: I18nWorkerModule | undefined;

/**
 * Main worker dispatch function. Dispatches incoming tasks based on task tag.
 *
 * @param task The task payload dispatched to the shared build worker pool.
 * @returns The resolved result of the corresponding task handler.
 */
export default function workerRouter(task: SharedWorkerTask): Promise<unknown> {
  switch (task.tag) {
    case 'transform-js':
      return transformJavaScript(task);
    case 'inline-i18n':
      i18nWorker ??= require('../tools/i18n/i18n-inliner-worker') as I18nWorkerModule;
      switch (task.action) {
        case 'inlineCode':
          return i18nWorker.inlineCode(task);
        case 'inlineFileBatch':
          return i18nWorker.inlineFileBatch(task);
        default:
          throw new Error(
            `Unknown inline-i18n task action: ${(task as { action?: unknown }).action}`,
          );
      }
    default:
      throw new Error(`Unknown worker task tag: ${(task as { tag?: unknown })?.tag}`);
  }
}
