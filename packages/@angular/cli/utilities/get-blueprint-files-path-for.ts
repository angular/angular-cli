import * as path from 'path';
import { getAppFromConfig } from './app-utils';
const Blueprint = require('../ember-cli/lib/models/blueprint');

export function getBlueprintFilesPathFor(blueprintName: string) {
  const app = this.options && this.options.app;
  const appConfig = getAppFromConfig(app);

  if (appConfig.blueprints && appConfig.blueprints[blueprintName]) {
    return path.join(process.cwd(), appConfig.blueprints[blueprintName]);
  } else {
    return Blueprint.prototype.filesPath.apply(this);
  }
}
