/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
// tslint:disable:no-console
import { logging } from '@angular-devkit/core';
import { ParsedArgs } from 'minimist';
import * as path from 'path';
import { Configuration, ILinterOptions, Linter, findFormatter } from 'tslint';
import * as ts from 'typescript';

// Excluded (regexes) of the files to not lint. Generated files should not be linted.
// TODO: when moved to using bazel for the build system, this won't be needed.
const excluded = [/^dist-schema[\\\/].*/, /.*\/third_party\/.*/];

function _buildRules(logger: logging.Logger) {
  const tsConfigPath = path.join(__dirname, '../etc/rules/tsconfig.json');
  const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

  const parsedTsConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsConfigPath),
  );
  const lintRulesProgram = ts.createProgram(parsedTsConfig.fileNames, parsedTsConfig.options);
  const result = lintRulesProgram.emit();

  if (result.emitSkipped) {
    const host: ts.FormatDiagnosticsHost = {
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
      getNewLine: () => ts.sys.newLine,
      getCanonicalFileName: (fileName: string) => fileName,
    };
    logger.fatal(ts.formatDiagnostics(result.diagnostics, host));
    process.exit(100);
  }
}

export default async function(options: ParsedArgs, logger: logging.Logger) {
  _buildRules(logger);

  const lintOptions: ILinterOptions = {
    fix: options.fix,
  };

  const program = Linter.createProgram(path.join(__dirname, '../tsconfig.json'));
  const linter = new Linter(lintOptions, program);
  const tsLintPath = path.join(__dirname, '../tslint.json');
  const tsLintConfig = Configuration.loadConfigurationFromPath(tsLintPath);

  // Remove comments from the configuration, ie. keys that starts with "//".
  [...tsLintConfig.rules.keys()]
    .filter(x => x.startsWith('//'))
    .forEach(key => tsLintConfig.rules.delete(key));

  // Console is used directly by tslint, and when finding a rule that doesn't exist it's considered
  // a warning by TSLint but _only_ shown on the console and impossible to see through the API.
  // In order to see any warnings that happen from TSLint itself, we hook into console.warn() and
  // record any calls.
  const oldWarn = console.warn;
  let warnings = false;
  console.warn = (...args) => {
    warnings = true;
    oldWarn(...args);
  };

  program.getRootFileNames().forEach(fileName => {
    const filePath = path.relative(process.cwd(), fileName).replace(/\\/g, '/');
    if (excluded.some(x => x.test(filePath))) {
      return;
    }

    linter.lint(fileName, ts.sys.readFile(fileName) || '', tsLintConfig);
  });

  console.warn = oldWarn;

  const result = linter.getResult();
  const Formatter = findFormatter('codeFrame');
  if (!Formatter) {
    throw new Error('Cannot find lint formatter.');
  }
  const formatter = new Formatter();

  if (result.errorCount > 0) {
    logger.error(formatter.format(result.failures));
    logger.info(`Errors:   ${result.errorCount}`);
    if (result.warningCount > 0) {
      logger.info(`Warnings: ${result.warningCount}`);
    }

    return 2;
  } else if (result.warningCount > 0) {
    logger.warn(formatter.format(result.failures));
    logger.info(`Warnings: ${result.warningCount}`);

    return 1;
  } else if (warnings) {
    logger.warn('TSLint found warnings, but code is okay. See above.');

    return 1;
  }

  return 0;
}
