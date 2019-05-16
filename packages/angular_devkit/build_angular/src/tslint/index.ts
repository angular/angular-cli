/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import * as glob from 'glob';
import { Minimatch } from 'minimatch';
import * as path from 'path';
import * as tslint from 'tslint'; // tslint:disable-line:no-implicit-dependencies
import { Program } from 'typescript';
import { stripBom } from '../angular-cli-files/utilities/strip-bom';
import { Schema as RealTslintBuilderOptions } from './schema';


type TslintBuilderOptions = RealTslintBuilderOptions & json.JsonObject;
interface LintResult extends tslint.LintResult {
  fileNames: string[];
}

async function _loadTslint() {
  let tslint;
  try {
    tslint = await import('tslint'); // tslint:disable-line:no-implicit-dependencies
  } catch {
    throw new Error('Unable to find TSLint. Ensure TSLint is installed.');
  }

  const version = tslint.Linter.VERSION && tslint.Linter.VERSION.split('.');
  if (!version || version.length < 2 || Number(version[0]) < 5 || Number(version[1]) < 5) {
    throw new Error('TSLint must be version 5.5 or higher.');
  }

  return tslint;
}


async function _run(
  options: TslintBuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const systemRoot = context.workspaceRoot;
  process.chdir(context.currentDirectory);
  const projectName = (context.target && context.target.project) || '<???>';

  // Print formatter output only for non human-readable formats.
  const printInfo =
    ['prose', 'verbose', 'stylish'].includes(options.format || '') && !options.silent;

  context.reportStatus(`Linting ${JSON.stringify(projectName)}...`);
  if (printInfo) {
    context.logger.info(`Linting ${JSON.stringify(projectName)}...`);
  }

  if (!options.tsConfig && options.typeCheck) {
    throw new Error('A "project" must be specified to enable type checking.');
  }

  const projectTslint = await _loadTslint();
  const tslintConfigPath = options.tslintConfig
    ? path.resolve(systemRoot, options.tslintConfig)
    : null;
  const Linter = projectTslint.Linter;

  let result: undefined | LintResult = undefined;
  if (options.tsConfig) {
    const tsConfigs = Array.isArray(options.tsConfig) ? options.tsConfig : [options.tsConfig];
    context.reportProgress(0, tsConfigs.length);
    const allPrograms = tsConfigs.map(tsConfig => {
      return Linter.createProgram(path.resolve(systemRoot, tsConfig));
    });

    let i = 0;
    for (const program of allPrograms) {
      const partial = await _lint(
        projectTslint,
        systemRoot,
        tslintConfigPath,
        options,
        program,
        allPrograms,
      );
      if (result === undefined) {
        result = partial;
      } else {
        result.failures = result.failures
          .filter(curr => {
            return !partial.failures.some(prev => curr.equals(prev));
          })
          .concat(partial.failures);

        // we are not doing much with 'errorCount' and 'warningCount'
        // apart from checking if they are greater than 0 thus no need to dedupe these.
        result.errorCount += partial.errorCount;
        result.warningCount += partial.warningCount;
        result.fileNames = [...new Set([...result.fileNames, ...partial.fileNames])];

        if (partial.fixes) {
          result.fixes = result.fixes ? result.fixes.concat(partial.fixes) : partial.fixes;
        }
      }

      context.reportProgress(++i, allPrograms.length);
    }
  } else {
    result = await _lint(projectTslint, systemRoot, tslintConfigPath, options);
  }

  if (result == undefined) {
    throw new Error('Invalid lint configuration. Nothing to lint.');
  }

  if (!options.silent) {
    const Formatter = projectTslint.findFormatter(options.format || '');
    if (!Formatter) {
      throw new Error(`Invalid lint format "${options.format}".`);
    }
    const formatter = new Formatter();

    const output = formatter.format(result.failures, result.fixes, result.fileNames);
    if (output.trim()) {
      context.logger.info(output);
    }
  }

  if (result.warningCount > 0 && printInfo) {
    context.logger.warn('Lint warnings found in the listed files.');
  }

  if (result.errorCount > 0 && printInfo) {
    context.logger.error('Lint errors found in the listed files.');
  }

  if (result.warningCount === 0 && result.errorCount === 0 && printInfo) {
    context.logger.info('All files pass linting.');
  }

  return {
    success: options.force || result.errorCount === 0,
  };
}


export default createBuilder<TslintBuilderOptions>(_run);


async function _lint(
  projectTslint: typeof tslint,
  systemRoot: string,
  tslintConfigPath: string | null,
  options: TslintBuilderOptions,
  program?: Program,
  allPrograms?: Program[],
): Promise<LintResult> {
  const Linter = projectTslint.Linter;
  const Configuration = projectTslint.Configuration;

  const files = getFilesToLint(systemRoot, options, Linter, program);
  const lintOptions = {
    fix: !!options.fix,
    formatter: options.format,
  };

  const linter = new Linter(lintOptions, program);

  let lastDirectory: string | undefined = undefined;
  let configLoad;
  const lintedFiles: string[] = [];
  for (const file of files) {
    if (program && allPrograms) {
      // If it cannot be found in ANY program, then this is an error.
      if (allPrograms.every(p => p.getSourceFile(file) === undefined)) {
        throw new Error(
          `File ${JSON.stringify(file)} is not part of a TypeScript project '${options.tsConfig}'.`,
        );
      } else if (program.getSourceFile(file) === undefined) {
        // The file exists in some other programs. We will lint it later (or earlier) in the loop.
        continue;
      }
    }

    const contents = getFileContents(file);

    // Only check for a new tslint config if the path changes.
    const currentDirectory = path.dirname(file);
    if (currentDirectory !== lastDirectory) {
      configLoad = Configuration.findConfiguration(tslintConfigPath, file);
      lastDirectory = currentDirectory;
    }

    if (configLoad) {
      // Give some breathing space to other promises that might be waiting.
      await Promise.resolve();
      linter.lint(file, contents, configLoad.results);
      lintedFiles.push(file);
    }
  }

  return {
    ...linter.getResult(),
    fileNames: lintedFiles,
  };
}

function getFilesToLint(
  root: string,
  options: TslintBuilderOptions,
  linter: typeof tslint.Linter,
  program?: Program,
): string[] {
  const ignore = options.exclude;
  const files = options.files || [];

  if (files.length > 0) {
    return files
      .map(file => glob.sync(file, { cwd: root, ignore, nodir: true }))
      .reduce((prev, curr) => prev.concat(curr), [])
      .map(file => path.join(root, file));
  }

  if (!program) {
    return [];
  }

  let programFiles = linter.getFileNames(program);

  if (ignore && ignore.length > 0) {
    // normalize to support ./ paths
    const ignoreMatchers = ignore
      .map(pattern => new Minimatch(path.normalize(pattern), { dot: true }));

    programFiles = programFiles
      .filter(file => !ignoreMatchers.some(matcher => matcher.match(path.relative(root, file))));
  }

  return programFiles;
}

function getFileContents(file: string): string {
  // NOTE: The tslint CLI checks for and excludes MPEG transport streams; this does not.
  try {
    return stripBom(readFileSync(file, 'utf-8'));
  } catch {
    throw new Error(`Could not read file '${file}'.`);
  }
}
