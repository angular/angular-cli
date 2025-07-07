/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BaseException, normalize, template as templateImpl } from '@angular-devkit/core';
import { EOL } from 'node:os';
import { FileOperator, Rule } from '../engine/interface';
import { FileEntry } from '../tree/interface';
import { chain, composeFileOperators, forEach, when } from './base';

export const TEMPLATE_FILENAME_RE: RegExp = /\.template$/;

export class OptionIsNotDefinedException extends BaseException {
  constructor(name: string) {
    super(`Option "${name}" is not defined.`);
  }
}

export class UnknownPipeException extends BaseException {
  constructor(name: string) {
    super(`Pipe "${name}" is not defined.`);
  }
}

export class InvalidPipeException extends BaseException {
  constructor(name: string) {
    super(`Pipe "${name}" is invalid.`);
  }
}

export type PathTemplateValue = boolean | string | number | undefined;
export type PathTemplatePipeFunction = (x: string) => PathTemplateValue;
export type PathTemplateData = {
  [key: string]: PathTemplateValue | PathTemplateData | PathTemplatePipeFunction;
};

export interface PathTemplateOptions {
  // Interpolation start and end strings.
  interpolationStart: string;
  // Interpolation start and end strings.
  interpolationEnd: string;

  // Separator for pipes. Do not specify to remove pipe support.
  pipeSeparator?: string;
}

const decoder = new TextDecoder('utf-8', { fatal: true });

export function applyContentTemplate<T>(options: T): FileOperator {
  return (entry: FileEntry) => {
    const { path, content } = entry;

    try {
      const decodedContent = decoder.decode(content).replace(/\r?\n/g, EOL);

      return {
        path,
        content: Buffer.from(templateImpl(decodedContent, {})(options)),
      };
    } catch (e) {
      // The second part should not be needed. But Jest does not support instanceof correctly.
      // See: https://github.com/jestjs/jest/issues/2549
      if (
        e instanceof TypeError ||
        (e as NodeJS.ErrnoException).code === 'ERR_ENCODING_INVALID_ENCODED_DATA'
      ) {
        return entry;
      }

      throw e;
    }
  };
}

export function contentTemplate<T>(options: T): Rule {
  return forEach(applyContentTemplate(options));
}

export function applyPathTemplate<T extends PathTemplateData>(
  data: T,
  options: PathTemplateOptions = {
    interpolationStart: '__',
    interpolationEnd: '__',
    pipeSeparator: '@',
  },
): FileOperator {
  const is = options.interpolationStart;
  const ie = options.interpolationEnd;
  const isL = is.length;
  const ieL = ie.length;

  return (entry: FileEntry) => {
    let path = entry.path as string;
    const content = entry.content;
    const original = path;

    let start = path.indexOf(is);
    // + 1 to have at least a length 1 name. `____` is not valid.
    let end = path.indexOf(ie, start + isL + 1);

    while (start != -1 && end != -1) {
      const match = path.substring(start + isL, end);
      let replacement = data[match];

      if (!options.pipeSeparator) {
        if (typeof replacement == 'function') {
          replacement = replacement.call(data, original);
        }

        if (replacement === undefined) {
          throw new OptionIsNotDefinedException(match);
        }
      } else {
        const [name, ...pipes] = match.split(options.pipeSeparator);
        replacement = data[name];

        if (typeof replacement == 'function') {
          replacement = replacement.call(data, original);
        }

        if (replacement === undefined) {
          throw new OptionIsNotDefinedException(name);
        }

        replacement = pipes.reduce((acc: string, pipe: string) => {
          if (!pipe) {
            return acc;
          }
          if (!(pipe in data)) {
            throw new UnknownPipeException(pipe);
          }
          const pipeFn = data[pipe];
          if (typeof pipeFn != 'function') {
            throw new InvalidPipeException(pipe);
          }

          // Coerce to string.
          return '' + pipeFn(acc);
        }, '' + replacement);
      }

      path = path.substring(0, start) + replacement + path.substring(end + ieL);

      start = path.indexOf(options.interpolationStart);
      // See above.
      end = path.indexOf(options.interpolationEnd, start + isL + 1);
    }

    return { path: normalize(path), content };
  };
}

export function pathTemplate<T extends PathTemplateData>(options: T): Rule {
  return forEach(applyPathTemplate(options));
}

/**
 * Remove every `.template` suffix from file names.
 */
export function renameTemplateFiles(): Rule {
  return forEach((entry) => {
    if (entry.path.match(TEMPLATE_FILENAME_RE)) {
      return {
        content: entry.content,
        path: normalize(entry.path.replace(TEMPLATE_FILENAME_RE, '')),
      };
    } else {
      return entry;
    }
  });
}

export function template<T extends object>(options: T): Rule {
  return chain([
    contentTemplate(options),
    // Force cast to PathTemplateData. We need the type for the actual pathTemplate() call,
    // but in this case we cannot do anything as contentTemplate are more permissive.
    // Since values are coerced to strings in PathTemplates it will be fine in the end.
    pathTemplate(options as {} as PathTemplateData),
  ]);
}

export function applyTemplates<T extends object>(options: T): Rule {
  return forEach(
    when(
      (path) => path.endsWith('.template'),
      composeFileOperators([
        applyContentTemplate(options),
        // See above for this weird cast.
        applyPathTemplate(options as {} as PathTemplateData),
        (entry) => {
          return {
            content: entry.content,
            path: entry.path.replace(TEMPLATE_FILENAME_RE, ''),
          } as FileEntry;
        },
      ]),
    ),
  );
}
