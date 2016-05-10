'use strict';
// Load the environment file defined by the EMBER_ENV environment variable.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');


// Export the content of the transpiled file.
module.exports = function loadEnvironment(project, environment) {
  let env = environment || process.env['EMBER_ENV'] || 'dev';
  switch (env) {
  case 'production': env = 'prod'; break;
  case 'development': env = 'dev'; break;
  }

  // Load the content of the environment file.
  const filePath = path.join(project.root, `config/environment.${env}.ts`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const result = ts.transpile(source, {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJs
  });

  const Module = module.constructor;
  const m = new Module();
  m._compile(result, filePath);
  return m.exports.environment;
};
