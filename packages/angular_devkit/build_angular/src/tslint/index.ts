/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { getSystemPath } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import * as glob from 'glob';
import { Minimatch } from 'minimatch';
import * as path from 'path';
import { Observable, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import * as tslint from 'tslint'; // tslint:disable-line:no-implicit-dependencies
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import { stripBom } from '../angular-cli-files/utilities/strip-bom';

export interface TslintBuilderOptions {
  tslintConfig?: string;
  tsConfig?: string | string[];
  fix: boolean;
  typeCheck: boolean;
  force: boolean;
  silent: boolean;
  format: string;
  exclude: string[];
  files: string[];
}

interface LintResult extends tslint.LintResult {
  fileNames: string[];
}

export default class TslintBuilder implements Builder<TslintBuilderOptions> {

  constructor(public context: BuilderContext) { }

  private async loadTslint() {
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

  run(builderConfig: BuilderConfiguration<TslintBuilderOptions>): Observable<BuildEvent> {

    const root = this.context.workspace.root;
    const systemRoot = getSystemPath(root);
    const options = builderConfig.options;
    const targetSpecifier = this.context.targetSpecifier;
    const projectName = targetSpecifier && targetSpecifier.project || '';

    // Print formatter output only for non human-readable formats.
    const printInfo = ['prose', 'verbose', 'stylish'].includes(options.format)
      && !options.silent;

    if (printInfo) {
      this.context.logger.info(`Linting ${JSON.stringify(projectName)}...`);
    }

    if (!options.tsConfig && options.typeCheck) {
      throw new Error('A "project" must be specified to enable type checking.');
    }

    return from(this.loadTslint())
      .pipe(concatMap(projectTslint => new Observable<BuildEvent>(obs => {
        const tslintConfigPath = options.tslintConfig
          ? path.resolve(systemRoot, options.tslintConfig)
          : null;
        const Linter = projectTslint.Linter;

        let result: undefined | LintResult;
        if (options.tsConfig) {
          const tsConfigs = Array.isArray(options.tsConfig) ? options.tsConfig : [options.tsConfig];
          const allPrograms =
            tsConfigs.map(tsConfig => Linter.createProgram(path.resolve(systemRoot, tsConfig)));

          for (const program of allPrograms) {
            const partial
              = lint(projectTslint, systemRoot, tslintConfigPath, options, program, allPrograms);
            if (result == undefined) {
              result = partial;
            } else {
              result.failures = result.failures
                .filter(curr => !partial.failures.some(prev => curr.equals(prev)))
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
          }
        } else {
          result = lint(projectTslint, systemRoot, tslintConfigPath, options);
        }

        if (result == undefined) {
          throw new Error('Invalid lint configuration. Nothing to lint.');
        }

        if (!options.silent) {
          const Formatter = projectTslint.findFormatter(options.format);
          if (!Formatter) {
            throw new Error(`Invalid lint format "${options.format}".`);
          }
          const formatter = new Formatter();

          const output = formatter.format(result.failures, result.fixes, result.fileNames);
          if (output) {
            this.context.logger.info(output);
          }
        }

        if (result.warningCount > 0 && printInfo) {
          this.context.logger.warn('Lint warnings found in the listed files.');
        }

        if (result.errorCount > 0 && printInfo) {
          this.context.logger.error('Lint errors found in the listed files.');
        }

        if (result.warningCount === 0 && result.errorCount === 0 && printInfo) {
          this.context.logger.info('All files pass linting.');
        }

        const success = options.force || result.errorCount === 0;
        obs.next({ success });

        return obs.complete();
      })));
  }
}

function lint(
  projectTslint: typeof tslint,
  systemRoot: string,
  tslintConfigPath: string | null,
  options: TslintBuilderOptions,
  program?: ts.Program,
  allPrograms?: ts.Program[],
): LintResult {
  const Linter = projectTslint.Linter;
  const Configuration = projectTslint.Configuration;

  const files = getFilesToLint(systemRoot, options, Linter, program);
  const lintOptions = {
    fix: options.fix,
    formatter: options.format,
  };

  const linter = new Linter(lintOptions, program);

  let lastDirectory;
  let configLoad;
  const lintedFiles: string[] = [];
  for (const file of files) {
    let contents = '';
    if (program && allPrograms) {
      if (!program.getSourceFile(file)) {
        if (!allPrograms.some(p => p.getSourceFile(file) !== undefined)) {
          // File is not part of any typescript program
          throw new Error(
            `File '${file}' is not part of a TypeScript project '${options.tsConfig}'.`);
        }

        // if the Source file exists but it's not in the current program skip
        continue;
      }
    } else {
      contents = getFileContents(file);
    }

    // Only check for a new tslint config if the path changes.
    const currentDirectory = path.dirname(file);
    if (currentDirectory !== lastDirectory) {
      configLoad = Configuration.findConfiguration(tslintConfigPath, file);
      lastDirectory = currentDirectory;
    }

    if (configLoad) {
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
  program?: ts.Program,
): string[] {
  const ignore = options.exclude;

  if (options.files.length > 0) {
    return options.files
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
