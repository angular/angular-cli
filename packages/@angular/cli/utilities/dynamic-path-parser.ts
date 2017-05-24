import * as path from 'path';
import * as process from 'process';
import * as fs from 'fs-extra';
const stringUtils = require('ember-cli-string-utils');

export interface DynamicPathOptions {
  project: any;
  entityName: string;
  appConfig: any;
  dryRun: boolean;
}

export function dynamicPathParser(options: DynamicPathOptions) {
  const projectRoot = options.project.root;
  const sourceDir = options.appConfig.root;
  const appRoot = path.join(sourceDir, 'app');
  const cwd = process.env.PWD;

  const rootPath = path.join(projectRoot, appRoot);
  let outputPath = path.join(rootPath, options.entityName);

  if (options.entityName.indexOf(path.sep) === 0) {
    outputPath = path.join(rootPath, options.entityName.substr(1));
  } else if (cwd.indexOf(rootPath) >= 0) {
    outputPath = path.join(cwd, options.entityName);
  }

  if (!fs.existsSync(outputPath)) {
    // Verify the path exists on disk.
    const parsedOutputPath = path.parse(outputPath);
    const parts = parsedOutputPath.dir.split(path.sep).slice(1);
    const newPath = parts.reduce((tempPath: string, part: string) => {
      // if (tempPath === '') {
      //   return part;
      // }

      const withoutPlus = path.join(tempPath, part);
      const withPlus = path.join(tempPath, '+' + part);
      if (fs.existsSync(withoutPlus)) {
        return withoutPlus;
      } else if (fs.existsSync(withPlus)) {
        return withPlus;
      }

      // Folder not found, create it, and return it
      const dasherizedPart = stringUtils.dasherize(part);
      const dasherizedDirName = path.join(tempPath, dasherizedPart);
      if (!options.dryRun) {
        fs.mkdirpSync(dasherizedDirName);
      }
      return dasherizedDirName;

    }, parsedOutputPath.root);
    outputPath = path.join(newPath, parsedOutputPath.name);
  }

  if (outputPath.indexOf(rootPath) < 0) {
    throw `Invalid path: "${options.entityName}" cannot be ` +
        `above the "${appRoot}" directory`;
  }

  const adjustedPath = outputPath.replace(projectRoot, '');

  const parsedPath = path.parse(adjustedPath);

  if (parsedPath.dir.indexOf(path.sep) === 0) {
    parsedPath.dir = parsedPath.dir.substr(1);
  }

  parsedPath.dir = parsedPath.dir === path.sep ? '' : parsedPath.dir;

  return { ...parsedPath, appRoot, sourceDir };
}
