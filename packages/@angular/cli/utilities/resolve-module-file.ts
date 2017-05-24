import * as path from 'path';
import * as fs from 'fs';
import { dynamicPathParser, DynamicPathOptions } from './dynamic-path-parser';

export function resolveModulePath(
  moduleNameFromFlag: string, project: any, projectRoot: any, appConfig: any): string {
  let baseModuleName = moduleNameFromFlag;
  let parentFolders = '';

  // If it's a full path from the cwd, we use it as is.
  if (fs.existsSync(moduleNameFromFlag) && fs.statSync(moduleNameFromFlag).isFile()) {
    return path.resolve(moduleNameFromFlag);
  }

  if (baseModuleName.includes(path.sep)) {
    const splitPath = baseModuleName.split(path.sep);
    baseModuleName = splitPath.pop();
    parentFolders = splitPath.join(path.sep);
  }

  if (baseModuleName.includes('.')) {
    baseModuleName = baseModuleName.replace(/(\.module)?(\.ts)?$/, '');
  }

  const baseModuleWithFileSuffix = `${baseModuleName}.module.ts`;

  const moduleRelativePath = path.join(parentFolders, baseModuleWithFileSuffix);
  let fullModulePath = buildFullPath(project, moduleRelativePath, appConfig, projectRoot);

  if (!fs.existsSync(fullModulePath)) {
    const moduleWithFolderPrefix =
      path.join(parentFolders, baseModuleName, baseModuleWithFileSuffix);
    fullModulePath = buildFullPath(project, moduleWithFolderPrefix, appConfig, projectRoot);
  }

  if (!fs.existsSync(fullModulePath)) {
    throw 'Specified module does not exist';
  }

  return fullModulePath;
}

function buildFullPath(project: any, relativeModulePath: string, appConfig: any, projectRoot: any) {
  const dynamicPathOptions: DynamicPathOptions = {
    project,
    entityName: relativeModulePath,
    appConfig,
    dryRun: false
  };
  const parsedPath = dynamicPathParser(dynamicPathOptions);
  const fullModulePath = path.join(projectRoot, parsedPath.dir, parsedPath.base);

  return fullModulePath;
}
