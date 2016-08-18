import * as Command from 'ember-cli/lib/models/command';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as chalk from 'chalk';
import * as SilentError from 'silent-error';
import * as denodeify from 'denodeify';
import { Promise } from 'es6-promise';
import { ModuleResolver } from '../utilities/module-resolver';
import * as dependentFilesUtils from '../utilities/get-dependent-files';

// denodeify asynchronous methods
const move = denodeify(fs.rename);
const globSearch = denodeify(glob);

const PromoteCommand = Command.extend({
  name: 'promote',
  description: 'Rewrites a file\'s relative imports and other component unit\'s dependencies' +
                'on that moved file to reflect the change in location of the file. ' +
                'Then, it moves the file and its associated files to the new locaiton.',
  aliases: ['p'],
  works: 'insideProject',
  anonymousOptions: ['<oldFilePath> <newDir>'],

  beforeRun: function(rawArgs: string[]) {
      // All operations should be sync in beforeRun.
      // Promise.reject() still causes 'run` attribute to execute.

      if (rawArgs.length === 0) {
        throw new SilentError(chalk.red('Please pass the arguments: ') +
                              chalk.cyan('ng promote <oldPath> <newPath>'));
      }
      // Current Directory in the project.
      const CWD = process.env.PWD;

      let filePaths: string[] = rawArgs
        .map((argument: string) => path.resolve(CWD, argument));

      // Validate first argument <oldPath>
      let oldPath = filePaths[0];

      const oldPathStats = fs.statSync(oldPath);
      // Check if it is a file.
      if (!oldPathStats.isFile()) {
        throw new SilentError(chalk.red('Give the full path of file.'));
      };
      // Throw error if a file is not a typescript file.
      if (path.extname(oldPath) !== '.ts') {
        throw new SilentError(`The file is not a typescript file: ${oldPath}`);
      };
      // Throw error if a file is an index file.
      if (path.basename(oldPath) === 'index.ts') {
        throw new SilentError(`Cannot promote index file: ${oldPath}`);
      };
      // Throw error if a file is a spec file.
      if (path.extname(path.basename(oldPath, '.ts')) === '.spec') {
        throw new SilentError(`Cannot promote a spec file: ${oldPath}`);
      };
      // Check the permission to read and/or write in the file.
      fs.accessSync(oldPath, fs.R_OK || fs.W_OK);

      // Validate second argument <newPath>
      const newPath = filePaths[1];
      const newPathStats = fs.statSync(newPath);

      // Check if it is a directory
      if (!newPathStats.isDirectory) {
        throw new SilentError(`newPath must be a directory: ${newPath}`);
      };
      // Check the permission to read/write/execute(move) in the directory.
      fs.accessSync(newPath, fs.R_OK || fs.X_OK || fs.W_OK);
      // Check for any files with the same name as oldPath.
      let sameNameFiles = glob.sync(path.join(newPath, '*.*.ts'), { nodir: true })
        .filter((file) => path.basename(file) === path.basename(oldPath));
      if (sameNameFiles.length > 0) {
        throw new SilentError(`newPath has a file with same name as oldPath: ${sameNameFiles}`);
      };
  },

  run: function (commandOptions, rawArgs: string[]) {
    // Get absolute paths of old path and new path
    let filePaths: string[] = rawArgs
      .map((argument: string) => path.resolve(process.env.PWD, argument));
    const oldPath = filePaths[0];
    const newPath = filePaths[1];
    const ROOT_PATH = path.resolve('src/app');

    let resolver = new ModuleResolver(oldPath, newPath, ROOT_PATH);
    return Promise.all([
        dependentFilesUtils.hasIndexFile(path.dirname(oldPath)),
        dependentFilesUtils.hasIndexFile(newPath)
    ])
    .then(([hasOldIndexFile, hasNewIndexFile]) => {
      // throw error when there are index files for components
      if (hasOldIndexFile || hasNewIndexFile) {
        return Promise.reject('Barrels will be deprecated soon. Promotion is thus rejected.');
      } else {
        return Promise.all([
          resolver.resolveDependentFiles(),
          resolver.resolveOwnImports()
        ]);
      }
    })
    .then(([changesForDependentFiles, changesForOwnImports]) => {
      console.log('Promoting...');
      let allChanges = changesForDependentFiles.concat(changesForOwnImports);
      return resolver.applySortedChangePromise(allChanges);
    })
    // Move the related files to new path.
    .then(() => dependentFilesUtils.getAllAssociatedFiles(oldPath))
    .then((files: string[]) => {
      return files.map((file) => move(file, path.join(newPath, path.basename(file))));
    })
    .then(() => console.log(`${chalk.green(oldPath)} is promoted to ${chalk.green(newPath)}.`));
  },
});

module.exports = PromoteCommand;
