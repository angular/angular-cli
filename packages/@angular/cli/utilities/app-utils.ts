import { CliConfig } from '../models/config';

export function getAppFromConfig(nameOrIndex?: String) {
  const apps: any[] = CliConfig.getValue('apps');
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
