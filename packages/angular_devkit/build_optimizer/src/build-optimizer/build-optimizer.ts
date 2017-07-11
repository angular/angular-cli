import { readFileSync } from 'fs';
import { RawSourceMap } from 'source-map';
const MagicString = require('magic-string');

import { transformJavascript } from '../helpers/transform-javascript';
import { getFoldFileTransformer } from '../transforms/class-fold';
import { getImportTslibTransformer } from '../transforms/import-tslib';
import { getPrefixFunctionsTransformer } from '../transforms/prefix-functions';
import { getScrubFileTransformer } from '../transforms/scrub-file';


const hasDecorators = /decorators/;
const hasCtorParameters = /ctorParameters/;
const hasTsHelpers = /var (__extends|__decorate|__metadata|__param) = /;

export interface BuildOptimizerOptions {
  content?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
}

export function buildOptimizer(options: BuildOptimizerOptions):
  { content: string, sourceMap: RawSourceMap | null } {

  options.emitSourceMap = !!options.emitSourceMap;
  const { inputFilePath, emitSourceMap, outputFilePath, strict } = options;
  let { content } = options;

  if (!inputFilePath && !content) {
    throw new Error('Either filePath or content must be specified in options.');
  }

  if (!content) {
    content = readFileSync(inputFilePath as string, 'UTF-8');
  }

  // Determine which transforms to apply.
  const getTransforms = [];

  if (hasTsHelpers.test(content)) {
    getTransforms.push(getImportTslibTransformer);
  }


  if (hasDecorators.test(content) || hasCtorParameters.test(content)) {
    // Order matters, getPrefixFunctionsTransformer needs to be called before
    // getFoldFileTransformer.
    getTransforms.push(...[
      getPrefixFunctionsTransformer,
      getScrubFileTransformer,
      getFoldFileTransformer,
    ]);
  }

  if (getTransforms.length > 0) {
    // Only transform if there are transforms to apply.
    return transformJavascript({
      content,
      getTransforms,
      emitSourceMap,
      inputFilePath,
      outputFilePath,
      strict,
    });
  } else if (emitSourceMap) {
    // Emit a sourcemap with no changes.
    const ms = new MagicString(content);

    return {
      content,
      sourceMap: ms.generateMap({
        source: inputFilePath,
        file: outputFilePath ? `${outputFilePath}.map` : null,
        includeContent: true,
      }),
    };
  } else {
    return {
      content,
      sourceMap: null,
    };
  }
}
