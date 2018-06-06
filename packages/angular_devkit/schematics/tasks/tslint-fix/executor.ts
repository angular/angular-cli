/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { resolve } from '@angular-devkit/core/node';
import * as fs from 'fs';
import * as path from 'path';
import { Observable } from 'rxjs';
import {
  Configuration as ConfigurationNS,
  Linter as LinterNS,
} from 'tslint';  // tslint:disable-line:no-implicit-dependencies
import * as ts from 'typescript';  // tslint:disable-line:no-implicit-dependencies
import { SchematicContext, TaskExecutor } from '../../src';
import { TslintFixTaskOptions } from './options';


type ConfigurationT = typeof ConfigurationNS;
type LinterT = typeof LinterNS;


function _loadConfiguration(
  Configuration: ConfigurationT,
  options: TslintFixTaskOptions,
  root: string,
  file?: string,
) {
  if (options.tslintConfig) {
    return Configuration.parseConfigFile(options.tslintConfig, root);
  } else if (options.tslintPath) {
    const tslintPath = path.join(root, options.tslintPath);

    return Configuration.findConfiguration(tslintPath, file && path.join(root, file)).results;
  } else {
    throw new Error('Executor must specify a tslint configuration.');
  }
}


function _getFileContent(
  file: string,
  options: TslintFixTaskOptions,
  program?: ts.Program,
): string | undefined {
  // The linter retrieves the SourceFile TS node directly if a program is used
  if (program) {
    const source = program.getSourceFile(file);
    if (!source) {
      const message
        = `File '${file}' is not part of the TypeScript project '${options.tsConfigPath}'.`;
      throw new Error(message);
    }

    return source.getFullText(source);
  }

  // NOTE: The tslint CLI checks for and excludes MPEG transport streams; this does not.
  try {
    // Strip BOM from file data.
    // https://stackoverflow.com/questions/24356713
    return fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
  } catch (e) {
    throw new Error(`Could not read file '${file}'.`);
  }
}


function _listAllFiles(root: string): string[] {
  const result: string[] = [];

  function _recurse(location: string) {
    const dir = fs.readdirSync(path.join(root, location));

    dir.forEach(name => {
      const loc = path.join(location, name);
      if (fs.statSync(path.join(root, loc)).isDirectory()) {
        _recurse(loc);
      } else {
        result.push(loc);
      }
    });
  }
  _recurse('');

  return result;
}


export default function(): TaskExecutor<TslintFixTaskOptions> {
  return (options: TslintFixTaskOptions, context: SchematicContext) => {
    return new Observable(obs => {
      const root = process.cwd();
      const tslint = require(resolve('tslint', {
        basedir: root,
        checkGlobal: true,
        checkLocal: true,
      }));
      const includes = (
        Array.isArray(options.includes)
          ? options.includes
          : (options.includes ? [options.includes] : [])
      );

      const Linter = tslint.Linter as LinterT;
      const Configuration = tslint.Configuration as ConfigurationT;
      let program: ts.Program | undefined = undefined;
      let filesToLint: string[] = [];

      if (options.tsConfigPath) {
        const tsConfigPath = path.join(process.cwd(), options.tsConfigPath);

        if (!fs.existsSync(tsConfigPath)) {
          obs.error(new Error('Could not find tsconfig.'));

          return;
        }
        program = Linter.createProgram(tsConfigPath);
        filesToLint = Linter.getFileNames(program);
      }

      if (includes.length > 0) {
        const allFilesRel = _listAllFiles(root);
        const pattern = '^('
          + (includes as string[])
            .map(ex => '('
              + ex.split(/[\/\\]/g).map(f => f
                .replace(/[\-\[\]{}()+?.^$|]/g, '\\$&')
                .replace(/^\*\*/g, '(.+?)?')
                .replace(/\*/g, '[^/\\\\]*'))
                .join('[\/\\\\]')
              + ')')
            .join('|')
          + ')($|/|\\\\)';
        const re = new RegExp(pattern);

        filesToLint.push(...allFilesRel
          .filter(x => re.test(x))
          .map(x => path.join(root, x)),
        );
      }

      const lintOptions = {
        fix: true,
        formatter: options.format || 'prose',
      };

      const linter = new Linter(lintOptions, program);
      const config = _loadConfiguration(Configuration, options, root);

      for (const file of filesToLint) {
        const content = _getFileContent(file, options, program);

        if (!content) {
          continue;
        }

        linter.lint(file, content, config);
      }

      const result = linter.getResult();

      // Format and show the results.
      if (!options.silent) {
        const Formatter = tslint.findFormatter(options.format || 'prose');
        if (!Formatter) {
          throw new Error(`Invalid lint format "${options.format}".`);
        }
        const formatter = new Formatter();

        const output = formatter.format(result.failures, result.fixes);
        if (output) {
          context.logger.info(output);
        }
      }

      if (!options.ignoreErrors && result.errorCount > 0) {
        obs.error(new Error('Lint errors were found.'));
      } else {
        obs.next();
        obs.complete();
      }
    });
  };
}
