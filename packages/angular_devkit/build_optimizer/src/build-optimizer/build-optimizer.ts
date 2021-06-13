/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readFileSync } from 'fs';
import {
  TransformJavascriptOptions,
  TransformJavascriptOutput,
  TransformerFactoryCreator,
  transformJavascript,
} from '../helpers/transform-javascript';
import { getPrefixClassesTransformer, testPrefixClasses } from '../transforms/prefix-classes';
import { getPrefixFunctionsTransformer } from '../transforms/prefix-functions';
import { createScrubFileTransformerFactory, testScrubFile } from '../transforms/scrub-file';
import { getWrapEnumsTransformer } from '../transforms/wrap-enums';

// Angular packages are known to have no side effects.
const knownSideEffectFreeAngularModules = [
  /[\\/]node_modules[\\/]@angular[\\/]animations[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]common[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]compiler[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]core[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]forms[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]http[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]platform-browser-dynamic[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]platform-browser[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]platform-webworker-dynamic[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]platform-webworker[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]router[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]upgrade[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]material[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]cdk[\\/]/,
  /[\\/]node_modules[\\/]rxjs[\\/]/,
];

// Known locations for the source files of @angular/core.
const coreFilesRegex = /[\\/]node_modules[\\/]@angular[\\/]core[\\/][f]?esm2015[\\/]/;

function isKnownCoreFile(filePath: string) {
  return coreFilesRegex.test(filePath);
}

function isKnownSideEffectFree(filePath: string) {
  // rxjs add imports contain intentional side effects
  if (/[\\/]node_modules[\\/]rxjs[\\/]add[\\/]/.test(filePath)) {
    return false;
  }

  return knownSideEffectFreeAngularModules.some((re) => re.test(filePath));
}

export interface BuildOptimizerOptions {
  content?: string;
  originalFilePath?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
  isSideEffectFree?: boolean;
  isAngularCoreFile?: boolean;
}

export function buildOptimizer(options: BuildOptimizerOptions): TransformJavascriptOutput {
  const { inputFilePath } = options;
  let { originalFilePath, content, isAngularCoreFile } = options;

  if (!originalFilePath && inputFilePath) {
    originalFilePath = inputFilePath;
  }

  if (!inputFilePath && content === undefined) {
    throw new Error('Either filePath or content must be specified in options.');
  }

  if (content === undefined) {
    content = readFileSync(inputFilePath as string, 'UTF-8');
  }

  if (!content) {
    return {
      content: null,
      sourceMap: null,
      emitSkipped: true,
    };
  }

  if (isAngularCoreFile === undefined) {
    isAngularCoreFile = !!originalFilePath && isKnownCoreFile(originalFilePath);
  }

  const hasSafeSideEffects = originalFilePath && isKnownSideEffectFree(originalFilePath);

  // Determine which transforms to apply.
  const getTransforms: TransformerFactoryCreator[] = [];

  let typeCheck = false;
  if (hasSafeSideEffects) {
    // Angular modules have known safe side effects
    getTransforms.push(
      // getPrefixFunctionsTransformer is rather dangerous, apply only to known pure es5 modules.
      // It will mark both `require()` calls and `console.log(stuff)` as pure.
      // We only apply it to modules known to be side effect free, since we know they are safe.
      getPrefixFunctionsTransformer,
    );
    typeCheck = true;
  } else if (testPrefixClasses(content)) {
    // This is only relevant if prefix functions is not used since prefix functions will prefix IIFE wrapped classes.
    getTransforms.unshift(getPrefixClassesTransformer);
  }

  if (testScrubFile(content)) {
    // Always test as these require the type checker
    getTransforms.push(createScrubFileTransformerFactory(isAngularCoreFile));
    typeCheck = true;
  }

  getTransforms.push(getWrapEnumsTransformer);

  const transformJavascriptOpts: TransformJavascriptOptions = {
    content: content,
    inputFilePath: options.inputFilePath,
    outputFilePath: options.outputFilePath,
    emitSourceMap: options.emitSourceMap,
    strict: options.strict,
    getTransforms,
    typeCheck,
  };

  return transformJavascript(transformJavascriptOpts);
}
