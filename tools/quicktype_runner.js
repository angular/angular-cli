/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

 /**
  * This file wraps around quicktype and can do one of two things;
  * 
  * `node quicktype_runner.js <in_path> <out_path>`
  *   Reads the in path and outputs the TS file at the out_path.
  * 
  * `node quicktype_runner.js --verify <in_path> <out_path>`
  *   Verify that creating the out_path from in_path schema gives the same content / code.
  */

// Imports.
const fs = require('fs');
const path = require('path');
const qtCore = require('quicktype-core');

// Header to add to all files.
const header = `
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
`.replace(/^\n/m, '');  // Remove the first \n, it's in the constant because formatting is 👍.

// Footer to add to all files.
const footer = ``;

/**
 * Create the TS file from the schema, and either verify or overwrite the outPath.
 * @param {boolean} verify 
 * @param {string} inPath 
 * @param {string} outPath 
 */
async function main(verify, inPath, outPath) {
  const buildWorkingDirectory = process.env['BUILD_WORKING_DIRECTORY'] || '.';
  outPath = path.resolve(buildWorkingDirectory, outPath);
  const content = await generate(inPath);

  if (verify) {
    if (!fs.existsSync(outPath)) {
      console.error(`Error: ${outPath} does not exist.`);
      process.exit(2);
    }

    const outContent = fs.readFileSync(outPath, 'utf-8');
    if (content !== outContent) {
      const bazelTarget = process.env['BAZEL_TARGET'].replace(/\.verify.*/, '.accept');
      console.error('Error: interfaces were different than golden.');
      console.error('Accept the new golden file:');
      console.error(`  bazel run ${bazelTarget}`);

      process.exit(3);
    }
  } else {
    fs.writeFileSync(outPath, content, 'utf-8');
  }
}


async function generate(inPath) {
  // Best description of how to use the API was found at
  //   https://blog.quicktype.io/customizing-quicktype/
  const inputData = new qtCore.InputData();
  const source = { name: 'Schema', schema: fs.readFileSync(inPath, 'utf-8') };

  await inputData.addSource('schema', source, () => new qtCore.JSONSchemaInput(undefined));

  const lang = new qtCore.TypeScriptTargetLanguage();

  const { lines } = await qtCore.quicktype({
    lang,
    inputData,
    alphabetizeProperties: true,
    src: [inPath],
    rendererOptions: {
      'just-types': true,
      'explicit-unions': true,
    }
  });

  return header + lines.join('\n') + footer;
}

// Parse arguments and run main().
const argv = process.argv.slice(2);
if (argv.length < 2 || argv.length > 3) {
  console.error('Must include 2 or 3 arguments.');
  process.exit(1);
}

if (!process.env['BAZEL_TARGET'] && !process.env['BUILD_WORKING_DIRECTORY']) {
  console.error('Must be run inside bazel.');
  process.exit(1);
}

const verify = argv.indexOf('--verify') !== -1;
if (verify) {
  argv.splice(argv.indexOf('--verify'), 1);
}

main(verify, ...argv)
  .then(() => process.exit(0))
  .catch(err => {
    console.log(err);
    process.exit(127);
  });
