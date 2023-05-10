/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TextDecoder, TextEncoder } from 'node:util';
import { TemplateTag } from '../../utils/literals';
import { FileBuffer } from './interface';

export function stringToFileBuffer(str: string): FileBuffer {
  return new TextEncoder().encode(str).buffer;
}

export function fileBufferToString(fileBuffer: FileBuffer): string {
  if (fileBuffer.toString.length === 1) {
    return (fileBuffer.toString as (enc: string) => string)('utf-8');
  }

  return new TextDecoder('utf-8').decode(new Uint8Array(fileBuffer));
}

/** @deprecated use `stringToFileBuffer` instead. */
export const fileBuffer: TemplateTag<FileBuffer> = (strings, ...values) => {
  return stringToFileBuffer(String.raw(strings, ...values));
};
