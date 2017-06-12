/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {chain} from './base';
import {template as templateImpl} from './template/template';
import {isBinary} from './utils/is-binary';
import {Rule} from '../engine/interface';
import {BaseException} from '../exception/exception';
import {Tree} from '../tree/interface';



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



export function applyContentTemplate<T extends { [key: string]: any }>(original: string,
                                                                       options: T): string {
  return templateImpl(original, {})(options);
}


export function contentTemplate<T extends { [key: string]: any }>(options: T): Rule {
  return (tree: Tree) => {
    tree.files.forEach(originalPath => {
      // Lodash Template.
      const content = tree.read(originalPath);

      if (content && !isBinary(content)) {
        const output = applyContentTemplate(content.toString('utf-8'), options);
        tree.overwrite(originalPath, output);
      }
    });

    return tree;
  };
}


export function applyPathTemplate<T extends { [key: string]: any }>(original: string,
                                                                    options: T): string {
  // Path template.
  return original.replace(kPathTemplateComponentRE, (_, match) => {
    const [name, ...pipes] = match.split(kPathTemplatePipeRE);
    const value = typeof options[name] == 'function'
                ? options[name].call(options, original)
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
      return '' + (options[pipe])(acc);
    }, '' + value);
  });
}


export function pathTemplate<T extends { [key: string]: any }>(options: T): Rule {
  return (tree: Tree) => {
    tree.files.forEach(originalPath => {
      const newPath = applyPathTemplate(originalPath, options);
      if (originalPath === newPath) {
        return;
      }

      tree.rename(originalPath, newPath);
    });

    return tree;
  };
}



export function template<T extends { [key: string]: any }>(options: T): Rule {
  return chain([
    contentTemplate(options),
    pathTemplate(options)
  ]);
}
