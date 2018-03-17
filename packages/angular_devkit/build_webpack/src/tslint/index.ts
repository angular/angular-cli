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
import { Observable } from 'rxjs/Observable';
import * as tslint from 'tslint'; // tslint:disable-line:no-implicit-dependencies
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import { stripBom } from '../angular-cli-files/utilities/strip-bom';


export interface TslintBuilderOptions {
  tslintConfig?: string;
  tsConfig?: string;
  fix: boolean;
  typeCheck: boolean;
  force: boolean;
  silent: boolean;
  format: string;
  exclude: string[];
  files: string[];
}

export class TslintBuilder implements Builder<TslintBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(target: BuilderConfiguration<TslintBuilderOptions>): Observable<BuildEvent> {

    const root = getSystemPath(target.root);
    const options = target.options;

    if (!options.tsConfig && options.typeCheck) {
      throw new Error('A "project" must be specified to enable type checking.');
    }

    return new Observable(obs => {
      const projectTslint = requireProjectModule(root, 'tslint') as typeof tslint;
      const tslintConfigPath = options.tslintConfig
        ? path.resolve(root, options.tslintConfig)
        : null;
      const Linter = projectTslint.Linter;
      const Configuration = projectTslint.Configuration;

      let program: ts.Program | undefined = undefined;
      if (options.tsConfig) {
        program = Linter.createProgram(path.resolve(root, options.tsConfig));
      }

      const files = getFilesToLint(root, options, Linter, program);
      const lintOptions = {
        fix: options.fix,
        formatter: options.format,
      };

      const linter = new Linter(lintOptions, program);

      let lastDirectory;
      let configLoad;
      for (const file of files) {
        const contents = getFileContents(file, options, program);

        // Only check for a new tslint config if the path changes.
        const currentDirectory = path.dirname(file);
        if (currentDirectory !== lastDirectory) {
          configLoad = Configuration.findConfiguration(tslintConfigPath, file);
          lastDirectory = currentDirectory;
        }

        if (contents && configLoad) {
          linter.lint(file, contents, configLoad.results);
        }
      }

      const result = linter.getResult();

      if (!options.silent) {
        const Formatter = projectTslint.findFormatter(options.format);
        if (!Formatter) {
          throw new Error(`Invalid lint format "${options.format}".`);
        }
        const formatter = new Formatter();

        const output = formatter.format(result.failures, result.fixes);
        if (output) {
          this.context.logger.info(output);
        }
      }

      // Print formatter output directly for non human-readable formats.
      if (['prose', 'verbose', 'stylish'].indexOf(options.format) == -1) {
        options.silent = true;
      }

      if (result.warningCount > 0 && !options.silent) {
        this.context.logger.warn('Lint warnings found in the listed files.');
      }

      if (result.errorCount > 0 && !options.silent) {
        this.context.logger.error('Lint errors found in the listed files.');
      }

      if (result.warningCount === 0 && result.errorCount === 0 && !options.silent) {
        this.context.logger.info('All files pass linting.');
      }

      const success = options.force || result.errorCount === 0;
      obs.next({ success });

      return obs.complete();
    });
  }
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
    const ignoreMatchers = ignore.map(pattern => new Minimatch(pattern, { dot: true }));

    programFiles = programFiles
      .filter(file => !ignoreMatchers.some(matcher => matcher.match(file)));
  }

  return programFiles;
}

function getFileContents(
  file: string,
  options: TslintBuilderOptions,
  program?: ts.Program,
): string | undefined {
  // The linter retrieves the SourceFile TS node directly if a program is used
  if (program) {
    if (program.getSourceFile(file) == undefined) {
      const message = `File '${file}' is not part of the TypeScript project '${options.tsConfig}'.`;
      throw new Error(message);
    }

    // TODO: this return had to be commented out otherwise no file would be linted, figure out why.
    // return undefined;
  }

  // NOTE: The tslint CLI checks for and excludes MPEG transport streams; this does not.
  try {
    return stripBom(readFileSync(file, 'utf-8'));
  } catch (e) {
    throw new Error(`Could not read file '${file}'.`);
  }
}

export default TslintBuilder;
