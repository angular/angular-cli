/*eslint-disable no-console */

// This file hooks up on require calls to transpile TypeScript.
const fs = require('fs');
const ts = require('typescript');
const old = require.extensions['.ts'];

require.extensions['.ts'] = function(m, filename) {
  // If we're in node module, either call the old hook or simply compile the
  // file without transpilation. We do not touch node_modules/**.
  // We do touch `angular-cli` files anywhere though.
  if (!filename.match(/angular-cli/) && filename.match(/node_modules/)) {
    if (old) {
      return old(m, filename);
    }
    return m._compile(fs.readFileSync(filename), filename);
  }

  // Node requires all require hooks to be sync.
  const source = fs.readFileSync(filename).toString();

  try {
    const result = ts.transpile(source, {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJs
    });

    // Send it to node to execute.
    return m._compile(result, filename);
  } catch (err) {
    console.error('Error while running script "' + filename + '":');
    console.error(err.stack);
    throw err;
  }
};


/**
 * Monkey patch `ember-cli/lib/utilities/find-build-file` to find our build
 * file when looking for `ember-cli-build.js`. This needs to be the first
 * thing that happens before we `require()` any ember files.
 *
 * TODO: Remove this hack and replace it with some configuration when/if we
 *       move away from ember. Or when ember allows us to configure this in
 *       an addon.
 */
const findBuildFileRequirePath = 'ember-cli/lib/utilities/find-build-file';
const originalFindBuildFile = require(findBuildFileRequirePath);

const mod = require.cache[require.resolve(findBuildFileRequirePath)];
mod.exports = function patchedFindBuildFile(name) {
  if (name == 'ember-cli-build.js') {
    const result = originalFindBuildFile.call(this, 'angular-cli-build.js');

    // Fallback to ember-cli-build if angular-cli-build isn't found.
    if (result) {
      return result;
    }
  }

  return originalFindBuildFile.apply(this, arguments);
};



const cli = require('ember-cli/lib/cli');
const path = require('path');


module.exports = function(options) {
  const oldStdoutWrite = process.stdout.write;
  process.stdout.write = function (line) {
    line = line.toString();
    if (line.match(/version:|WARNING:/)) {
      return;
    }
    if (line.match(/ember-cli-(inject-)?live-reload/)) {
      // don't replace 'ember-cli-live-reload' on ng init diffs
      return oldStdoutWrite.apply(process.stdout, arguments);
    }
    line = line.replace(/ember-cli(?!.com)/g, 'angular-cli')
      .replace(/ember(?!-cli.com)/g, 'ng');
    return oldStdoutWrite.apply(process.stdout, arguments);
  };

  const oldStderrWrite = process.stderr.write;
  process.stderr.write = function (line) {
    line = line.toString()
      .replace(/ember-cli(?!.com)/g, 'angular-cli')
      .replace(/ember(?!-cli.com)/g, 'ng');
    return oldStderrWrite.apply(process.stdout, arguments);
  };

  options.cli = {
    name: 'ng',
    root: path.join(__dirname, '..', '..'),
    npmPackage: 'angular-cli'
  };

  // ensure the environemnt variable for dynamic paths
  process.env.PWD = process.env.PWD || process.cwd();


  process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..', '..');

  return cli(options);
};
