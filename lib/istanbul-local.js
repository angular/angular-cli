/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const { SourceMapConsumer } = require('source-map');
const Istanbul = require('istanbul');

const inlineSourceMapRe = /\/\/# sourceMappingURL=data:application\/json;base64,(\S+)$/;


// Use the internal DevKit Hook of the require extension installed by our bootstrapping code to add
// Istanbul (not Constantinople) collection to the code.
const codeMap = new Map();
exports.codeMap = codeMap;

exports.istanbulRequireHook = function(code, filename) {
  // Skip spec files.
  if (filename.match(/_spec\.ts$/)) {
    return code;
  }
  const codeFile = codeMap.get(filename);
  if (codeFile) {
    return codeFile.code;
  }

  const instrumenter = new Istanbul.Instrumenter({
    esModules: true,
    codeGenerationOptions: {
      sourceMap: filename,
      sourceMapWithCode: true,
    },
  });
  let instrumentedCode = instrumenter.instrumentSync(code, filename);
  const match = code.match(inlineSourceMapRe);

  if (match) {
    const sourceMapGenerator = instrumenter.sourceMap;
    // Fix source maps for exception reporting (since the exceptions happen in the instrumented
    // code.
    const sourceMapJson = JSON.parse(Buffer.from(match[1], 'base64').toString());
    const consumer = new SourceMapConsumer(sourceMapJson);
    sourceMapGenerator.applySourceMap(consumer, filename);

    instrumentedCode = instrumentedCode.replace(inlineSourceMapRe, '')
      + '//# sourceMappingURL=data:application/json;base64,'
      + new Buffer(sourceMapGenerator.toString()).toString('base64');

    // Keep the consumer from the original source map, because the reports from Istanbul (not
    // Constantinople) are already mapped against the code.
    codeMap.set(filename, { code: instrumentedCode, map: consumer });
  }

  return instrumentedCode;
};
