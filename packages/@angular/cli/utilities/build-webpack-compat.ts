import { relative, resolve } from 'path';

// TODO: this file should not be in 6.0 final, rather there should be a way of updating projects.
export function createArchitectWorkspace(cliConfig: any): any {
  const builderPackage = '@angular-devkit/build-webpack';
  const workspace = {
    name: (cliConfig.project && cliConfig.project.name) || 'converted-project',
    version: 1,
    root: './',
    projects: {}
  };

  cliConfig.apps.forEach((app: any, idx: number) => {
    const appName = app.name || `$$proj${idx}`;
    const project: any = {
      root: app.root,
      projectType: 'application',
      targets: {}
    };

    const extraEntryMapper = (extraEntry: string | any) =>
      typeof extraEntry === 'string' ? { input: extraEntry } : extraEntry;

    // Browser target
    const browserOptions: any = {
      // Make outputPath relative to root.
      outputPath: relative(resolve('/', app.root), resolve('/', app.outDir)).replace(/\\/, '/'),
      index: app.index,
      main: app.main,
      polyfills: app.polyfills,
      tsConfig: app.tsconfig,
      progress: false,
    };

    browserOptions.scripts = (app.scripts || []).map(extraEntryMapper);
    browserOptions.styles = (app.styles || []).map(extraEntryMapper);

    browserOptions.assets = (app.assets || []).map((asset: string | any) =>
      typeof asset === 'string' ? { glob: asset } : asset);

    project.targets['browser'] = {
      builder: `${builderPackage}:browser`,
      options: browserOptions,
      configurations: {
        production: {
          optimizationLevel: 1,
          outputHashing: 'all',
          sourceMap: false,
          extractCss: true,
          namedChunks: false,
          aot: true,
          extractLicenses: true,
          vendorChunk: false,
          buildOptimizer: true
        }
      }
    };

    // Dev-Server target
    const devServerOptions: any = {
      browserTarget: `${appName}:browser`,
    };

    project.targets['dev-server'] = {
      // TODO: consider changing build from `devServer` to `dev-server`.
      builder: `${builderPackage}:devServer`,
      options: devServerOptions,
      configurations: {
        production: {
          browserTarget: `${appName}:browser:production`,
        }
      }
    };

    // Karma target
    const karmaOptions: any = {
      main: app.test,
      polyfills: app.polyfills,
      tsConfig: app.testTsconfig,
      // Make karmaConfig relative to root.
      karmaConfig: relative(resolve('/', app.root),
        resolve('/', cliConfig.test.karma.config)).replace(/\\/, '/'),
    };

    karmaOptions.scripts = (app.scripts || []).map(extraEntryMapper);
    karmaOptions.styles = (app.styles || []).map(extraEntryMapper);

    karmaOptions.assets = (app.assets || []).map((asset: string | any) =>
      typeof asset === 'string' ? { glob: asset } : asset);

    project.targets['karma'] = {
      builder: `${builderPackage}:karma`,
      options: karmaOptions,
    };

    // Protractor target
    const protractorOptions: any = {
      protractorConfig: relative(resolve('/', app.root),
        resolve('/', cliConfig.e2e.protractor.config)).replace(/\\/, '/'),
      devServerTarget: `${appName}:dev-server`,
    };

    project.targets['protractor'] = {
      builder: `${builderPackage}:protractor`,
      options: protractorOptions,
    };

    // Protractor target
    const extractI18nOptions: any = {
      browserTarget: `${appName}:browser`
    };

    project.targets['extract-i18n'] = {
      // TODO: consider changing build from `extractI18n` to `extract-i18n`.
      builder: `${builderPackage}:extractI18n`,
      options: extractI18nOptions,
    };

    // Tslint target
    const lintOptions: any = {
      tslintConfig: relative(resolve('/', app.root),
        resolve('/', 'tslint.json')).replace(/\\/, '/'),
      // TODO: maybe have the tslint target support array of tsconfigs
      tsConfig: app.tsconfig,
      exclude: [cliConfig.lint[0].exclude],
    };

    project.targets['tslint'] = {
      builder: `${builderPackage}:tslint`,
      options: lintOptions,
    };


    (workspace.projects as any)[appName] = project;
  });

  return workspace;
}

export function getProjectName(appConfig: any, appArg: any) {
  if (appConfig.name) {
    return appConfig.name;
  }

  if (appArg && appArg.match(/^[0-9]+$/)) {
    return `$$proj${appArg}`;
  }

  return '$$proj0';
}

export function convertOptions(additionalInput: any) {
  const renamedOptions = [
    { from: 'target', to: 'optimizationLevel' },
    { from: 'tsconfig', to: 'tsConfig' },
    { from: 'locale', to: 'i18nLocale' },
    { from: 'missingTranslation', to: 'i18nMissingTranslation' },
    { from: 'sourcemaps', to: 'sourceMap' },
  ];

  for (const rename of renamedOptions) {
    if (additionalInput[rename.from]) {
      additionalInput[rename.to] = additionalInput[rename.from];
      delete additionalInput[rename.from];
    }
  }

  const convertedValues = [
    { option: 'optimizationLevel', fn: (val: string) => val === 'development' ? 0 : 1 }
  ];

  for (const convert of convertedValues) {
    if (additionalInput[convert.option]) {
      additionalInput[convert.option] = convert.fn(additionalInput[convert.option]);
    }
  }

  return additionalInput;
}
