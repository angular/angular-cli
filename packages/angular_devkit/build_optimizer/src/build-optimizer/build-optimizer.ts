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
import { getFoldFileTransformer } from '../transforms/class-fold';
import { getImportTslibTransformer, testImportTslib } from '../transforms/import-tslib';
import { getPrefixClassesTransformer, testPrefixClasses } from '../transforms/prefix-classes';
import { getPrefixFunctionsTransformer } from '../transforms/prefix-functions';
import { getScrubFileTransformer, testScrubFile } from '../transforms/scrub-file';
import { getWrapEnumsTransformer, testWrapEnums } from '../transforms/wrap-enums';


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

const es5AngularModules = [
  // Angular 4 packaging format has .es5.js as the extension.
  /\.es5\.js$/, // Angular 4
  // Angular 5 has esm5 folders.
  /[\\/]node_modules[\\/]@angular[\\/][^\\/]+[\\/]esm5[\\/]/,
  // All Angular versions have UMD with es5.
  /\.umd\.js$/,
];

// Factories created by AOT are known to have no side effects and contain es5 code.
// In Angular 2/4 the file path for factories can be `.ts`, but in Angular 5 it is `.js`.
const ngFactories = [
  /\.ngfactory\.[jt]s/,
  /\.ngstyle\.[jt]s/,
];

function isKnownSideEffectFree(filePath: string) {
  return ngFactories.some((re) => re.test(filePath)) || (
    whitelistedAngularModules.some((re) => re.test(filePath))
    && es5AngularModules.some((re) => re.test(filePath))
  );
}

export interface BuildOptimizerOptions {
  content?: string;
  originalFilePath?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
  isSideEffectFree?: boolean;
}

export function buildOptimizer(options: BuildOptimizerOptions): TransformJavascriptOutput {

  const { inputFilePath } = options;
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
      getScrubFileTransformer,
      getFoldFileTransformer,
    );
    typeCheck = true;
  } else if (testScrubFile(content)) {
    // Always test as these require the type checker
    getTransforms.push(
      getScrubFileTransformer,
      getFoldFileTransformer,
    );
    typeCheck = true;
  }

  // tests are not needed for fast path
  const ignoreTest = !options.emitSourceMap && !typeCheck;

  if (ignoreTest || testPrefixClasses(content)) {
    getTransforms.unshift(getPrefixClassesTransformer);
  }

  if (ignoreTest || testImportTslib(content)) {
    getTransforms.unshift(getImportTslibTransformer);
  }

  if (ignoreTest || testWrapEnums(content)) {
    getTransforms.unshift(getWrapEnumsTransformer);
  }

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
