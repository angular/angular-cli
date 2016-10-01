import * as path from 'path';

export function getAliases(
  projectRoot: string,
  appConfig: any
) {
  const aliases: any = {};

  const appRoot = path.resolve(projectRoot, appConfig.root);

  if (appConfig.alias) {
    for (let aliasKey in appConfig.alias) {
      let alias = path.resolve(appRoot, appConfig.alias[aliasKey]);
      aliases[aliasKey] = alias;
    }
  }

  return aliases;
}
