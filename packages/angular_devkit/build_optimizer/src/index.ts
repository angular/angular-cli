export { default as buildOptimizerLoader } from './build-optimizer/webpack-loader';
export { buildOptimizer } from './build-optimizer/build-optimizer';

export { PurifyPlugin } from './purify/webpack-plugin';
export { purify } from './purify/purify';

export { transformJavascript } from './helpers/transform-javascript';

export { getFoldFileTransformer } from './transforms/class-fold';
export { getPrefixFunctionsTransformer } from './transforms/prefix-functions';
export { getScrubFileTransformer } from './transforms/scrub-file';
export { getImportTslibTransformer } from './transforms/import-tslib';
