/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { ParsedArgs } from 'minimist';
import * as path from 'path';
import { Configuration, ILinterOptions, Linter, findFormatter } from 'tslint';
import * as ts from 'typescript';


function _buildRules(logger: logging.Logger) {
  const tsConfigPath = path.join(__dirname, '../rules/tsconfig.json');
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


export default function (options: ParsedArgs, logger: logging.Logger) {
  _buildRules(logger);

  const lintOptions: ILinterOptions = {
    fix: options.fix,
  };

  const program = Linter.createProgram(path.join(__dirname, '../tsconfig.json'));
  const linter = new Linter(lintOptions, program);
  const tsLintPath = path.join(__dirname, '../tslint.json');
  const tsLintConfig = Configuration.loadConfigurationFromPath(tsLintPath);

  program.getRootFileNames().forEach(fileName => {
    linter.lint(fileName, ts.sys.readFile(fileName) || '', tsLintConfig);
  });

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
    process.exit(2);
  } else if (result.warningCount > 0) {
    logger.warn(formatter.format(result.failures));
    logger.info(`Warnings: ${result.warningCount}`);
    process.exit(1);
  }
}
