/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type InlineCodeRequest,
  type InlineFileBatchRequest,
  inlineCode,
  inlineFileBatch,
} from '../tools/esbuild/i18n-inliner-worker';
import transformJavaScript, {
  type JavaScriptTransformRequest,
} from '../tools/esbuild/javascript-transformer-worker';

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
      switch (task.action) {
        case 'inlineCode':
          return inlineCode(task);
        case 'inlineFileBatch':
          return inlineFileBatch(task);
        default:
          throw new Error(
            `Unknown inline-i18n task action: ${(task as { action?: unknown }).action}`,
          );
      }
    default:
      throw new Error(`Unknown worker task tag: ${(task as { tag?: unknown })?.tag}`);
  }
}
