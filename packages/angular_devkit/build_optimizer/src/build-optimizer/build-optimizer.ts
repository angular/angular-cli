/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { readFileSync } from 'fs';
import {
  TransformJavascriptOptions,
  TransformJavascriptOutput,
  transformJavascript,
} from '../helpers/transform-javascript';
import { getImportTslibTransformer, testImportTslib } from '../transforms/import-tslib';
import { getPrefixClassesTransformer, testPrefixClasses } from '../transforms/prefix-classes';
import { getPrefixFunctionsTransformer } from '../transforms/prefix-functions';
import {
  getScrubFileTransformer,
  getScrubFileTransformerForCore,
  testScrubFile,
} from '../transforms/scrub-file';
import { getWrapEnumsTransformer } from '../transforms/wrap-enums';


// Angular packages are known to have no side effects.
const whitelistedAngularModules = [
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
];

// Factories created by AOT are known to have no side effects.
// In Angular 2/4 the file path for factories can be `.ts`, but in Angular 5 it is `.js`.
const ngFactories = [
  /\.ngfactory\.[jt]s/,
  /\.ngstyle\.[jt]s/,
];

// Known locations for the source files of @angular/core.
const coreFilesRegex = [
  /[\\/]node_modules[\\/]@angular[\\/]core[\\/]esm5[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]core[\\/]fesm5[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]core[\\/]esm2015[\\/]/,
  /[\\/]node_modules[\\/]@angular[\\/]core[\\/]fesm2015[\\/]/,
];

function isKnownCoreFile(filePath: string) {
  return coreFilesRegex.some(re => re.test(filePath));
}

function isKnownSideEffectFree(filePath: string) {
  return ngFactories.some((re) => re.test(filePath)) ||
    whitelistedAngularModules.some((re) => re.test(filePath));
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

  const { inputFilePath, isAngularCoreFile } = options;
  let { originalFilePath, content } = options;

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

  let selectedGetScrubFileTransformer = getScrubFileTransformer;

  if (
    isAngularCoreFile === true ||
    (isAngularCoreFile === undefined && originalFilePath && isKnownCoreFile(originalFilePath))
  ) {
    selectedGetScrubFileTransformer = getScrubFileTransformerForCore;
  }

  const isWebpackBundle = content.indexOf('__webpack_require__') !== -1;

  // Determine which transforms to apply.
  const getTransforms = [];

  let typeCheck = false;
  if (options.isSideEffectFree || originalFilePath && isKnownSideEffectFree(originalFilePath)) {
    getTransforms.push(
      // getPrefixFunctionsTransformer is rather dangerous, apply only to known pure es5 modules.
      // It will mark both `require()` calls and `console.log(stuff)` as pure.
      // We only apply it to whitelisted modules, since we know they are safe.
      // getPrefixFunctionsTransformer needs to be before getFoldFileTransformer.
      getPrefixFunctionsTransformer,
      selectedGetScrubFileTransformer,
    );
    typeCheck = true;
  } else if (testScrubFile(content)) {
    // Always test as these require the type checker
    getTransforms.push(
      selectedGetScrubFileTransformer,
    );
    typeCheck = true;
  }

  // tests are not needed for fast path
  // usage will be expanded once transformers are verified safe
  const ignoreTest = !options.emitSourceMap && !typeCheck;

  if (testPrefixClasses(content)) {
    getTransforms.unshift(getPrefixClassesTransformer);
  }

  // This transform introduces import/require() calls, but this won't work properly on libraries
  // built with Webpack. These libraries use __webpack_require__() calls instead, which will break
  // with a new import that wasn't part of it's original module list.
  // We ignore this transform for such libraries.
  if (!isWebpackBundle && (ignoreTest || testImportTslib(content))) {
    getTransforms.unshift(getImportTslibTransformer);
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
