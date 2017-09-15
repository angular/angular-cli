/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { FileOperator, Rule } from '../engine/interface';
import { FileEntry } from '../tree/interface';
import { normalizePath } from '../utility/path';
import { chain, forEach } from './base';
import {template as templateImpl } from './template/template';
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


export const kPathTemplateComponentRE = /__([^_]+)__/g;
export const kPathTemplatePipeRE = /@([^@]+)/;


export type TemplateValue = boolean | string | number;
export type TemplatePipeFunction = (x: string) => TemplateValue;
export type TemplateOptions = {
  [key: string]: TemplateValue | TemplateOptions | TemplatePipeFunction,
};


export function applyContentTemplate<T extends TemplateOptions>(options: T): FileOperator {
  return (entry: FileEntry) => {
    const {path, content} = entry;
    if (isBinary(content)) {
      return entry;
    }

    return {
      path: path,
      content: new Buffer(templateImpl(content.toString('utf-8'), {})(options)),
    };
  };
}


export function contentTemplate<T extends TemplateOptions>(options: T): Rule {
  return forEach(applyContentTemplate(options));
}


export function applyPathTemplate<T extends TemplateOptions>(options: T): FileOperator {
  return (entry: FileEntry) => {
    let path = entry.path;
    const content = entry.content;
    const original = path;

    // Path template.
    path = normalizePath(path.replace(kPathTemplateComponentRE, (_, match) => {
      const [name, ...pipes] = match.split(kPathTemplatePipeRE);
      const value = typeof options[name] == 'function'
        ? (options[name] as TemplatePipeFunction).call(options, original)
        : options[name];

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
        return '' + (options[pipe] as TemplatePipeFunction)(acc);
      }, '' + value);
    }));

    return { path, content };
  };
}


export function pathTemplate<T extends TemplateOptions>(options: T): Rule {
  return forEach(applyPathTemplate(options));
}


export function template<T extends TemplateOptions>(options: T): Rule {
  return chain([
    contentTemplate(options),
    pathTemplate(options),
  ]);
}
