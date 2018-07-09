/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, normalize, template as templateImpl } from '@angular-devkit/core';
import { FileOperator, Rule } from '../engine/interface';
import { FileEntry } from '../tree/interface';
import { chain, forEach } from './base';
import { isBinary } from './utils/is-binary';


export class OptionIsNotDefinedException extends BaseException {
  constructor(name: string) { super(`Option "${name}" is not defined.`); }
}


export class UnknownPipeException extends BaseException {
  constructor(name: string) { super(`Pipe "${name}" is not defined.`); }
}


export class InvalidPipeException extends BaseException {
  constructor(name: string) { super(`Pipe "${name}" is invalid.`); }
}


export const kPathTemplateComponentRE = /__(.+?)__/g;
export const kPathTemplatePipeRE = /@([^@]+)/;


export type PathTemplateValue = boolean | string | number | undefined;
export type PathTemplatePipeFunction = (x: string) => PathTemplateValue;
export type PathTemplateOptions = {
  [key: string]: PathTemplateValue | PathTemplateOptions | PathTemplatePipeFunction,
};


export function applyContentTemplate<T>(options: T): FileOperator {
  return (entry: FileEntry) => {
    const {path, content} = entry;
    if (isBinary(content)) {
      return entry;
    }

    return {
      path: path,
      content: Buffer.from(templateImpl(content.toString('utf-8'), {})(options)),
    };
  };
}


export function contentTemplate<T>(options: T): Rule {
  return forEach(applyContentTemplate(options));
}


export function applyPathTemplate<T extends PathTemplateOptions>(options: T): FileOperator {
  return (entry: FileEntry) => {
    let path = entry.path;
    const content = entry.content;
    const original = path;

    // Path template.
    path = normalize(path.replace(kPathTemplateComponentRE, (_, match) => {
      const [name, ...pipes] = match.split(kPathTemplatePipeRE);
      let value = options[name];

      if (typeof value == 'function') {
        value = value.call(options, original);
      }

      if (value === undefined) {
        throw new OptionIsNotDefinedException(name);
      }

      return pipes.reduce((acc: string, pipe: string) => {
        if (!pipe) {
          return acc;
        }
        if (!(pipe in options)) {
          throw new UnknownPipeException(pipe);
        }
        if (typeof options[pipe] != 'function') {
          throw new InvalidPipeException(pipe);
        }

        // Coerce to string.
        return '' + (options[pipe] as PathTemplatePipeFunction)(acc);
      }, '' + value);
    }));

    return { path, content };
  };
}


export function pathTemplate<T extends PathTemplateOptions>(options: T): Rule {
  return forEach(applyPathTemplate(options));
}


export function template<T>(options: T): Rule {
  return chain([
    contentTemplate(options),
    // Force cast to PathTemplateOptions. We need the type for the actual pathTemplate() call,
    // but in this case we cannot do anything as contentTemplate are more permissive.
    // Since values are coerced to strings in PathTemplates it will be fine in the end.
    pathTemplate(options as {} as PathTemplateOptions),
  ]);
}
