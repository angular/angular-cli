import {CliConfig as CliConfigInterface} from '../lib/config/schema';

export function getAppFromConfig(apps: CliConfigInterface['apps'], nameOrIndex: String) {
  let app = apps[0];
  if (nameOrIndex) {
    if (nameOrIndex.match(/^[0-9]+$/)) {
      const index = parseInt(nameOrIndex.toString(), 10);
      app = apps[index];
    } else {
      const filtered = apps.filter((currentApp: any) => currentApp.name === nameOrIndex);
      if (filtered.length > 0) {
        app = filtered[0];
      }
    }
  }
  return app;
}
