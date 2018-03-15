import { createArchitectWorkspace } from './build-webpack-compat';


const cliConfig = {
  '$schema': './node_modules/@angular/cli/lib/config/schema.json',
  'project': {
    'name': 'master-project'
  },
  'apps': [
    {
      'root': 'src',
      'outDir': 'dist',
      'assets': [
        'assets',
        'favicon.ico'
      ],
      'index': 'index.html',
      'main': 'main.ts',
      'polyfills': 'polyfills.ts',
      'test': 'test.ts',
      'tsconfig': 'tsconfig.app.json',
      'testTsconfig': 'tsconfig.spec.json',
      'prefix': 'app',
      'styles': [
        'styles.css'
      ],
      'scripts': [] as any[],
      'environmentSource': 'environments/environment.ts',
      'environments': {
        'dev': 'environments/environment.ts',
        'prod': 'environments/environment.prod.ts'
      }
    },
    {
      'name': 'second-app',
      'root': 'src2',
      'outDir': 'dist2',
      'index': 'index.html',
      'main': 'main.ts',
      'polyfills': 'polyfills.ts',
      'test': 'test.ts',
      'tsconfig': 'tsconfig.app.json',
      'testTsconfig': 'tsconfig.spec.json',
      'prefix': 'app',
    }
  ],
  'e2e': {
    'protractor': {
      'config': './protractor.conf.js'
    }
  },
  'lint': [
    {
      'project': 'src/tsconfig.app.json',
      'exclude': '**/node_modules/**'
    },
    {
      'project': 'src/tsconfig.spec.json',
      'exclude': '**/node_modules/**'
    },
    {
      'project': 'e2e/tsconfig.e2e.json',
      'exclude': '**/node_modules/**'
    }
  ],
  'test': {
    'karma': {
      'config': './karma.conf.js'
    }
  },
  'defaults': {
    'styleExt': 'css',
    'component': {}
  }
};

const expectedWorkspace = {
  'name': 'master-project',
  'version': 1,
  'root': './',
  'projects': {
    '$$proj0': {
      'root': 'src',
      'projectType': 'application',
      'targets': {
        'browser': {
          'builder': '@angular-devkit/build-webpack:browser',
          'options': {
            'outputPath': '../dist',
            'index': 'index.html',
            'main': 'main.ts',
            'polyfills': 'polyfills.ts',
            'tsConfig': 'tsconfig.app.json',
            'scripts': [] as any[],
            'styles': [{ 'input': 'styles.css' }],
            'assets': [
              { 'glob': 'assets' },
              { 'glob': 'favicon.ico' },
            ],
            'progress': false
          },
          'configurations': {
            'production': {
              'optimizationLevel': 1,
              'outputHashing': 'all',
              'sourceMap': false,
              'extractCss': true,
              'namedChunks': false,
              'aot': true,
              'extractLicenses': true,
              'vendorChunk': false,
              'buildOptimizer': true
            }
          }
        },
        'dev-server': {
          'builder': '@angular-devkit/build-webpack:devServer',
          'options': {
            'browserTarget': '$$proj0:browser'
          },
          'configurations': {
            'production': {
              'browserTarget': '$$proj0:browser:production'
            }
          }
        },
        'karma': {
          'builder': '@angular-devkit/build-webpack:karma',
          'options': {
            'main': 'test.ts',
            'polyfills': 'polyfills.ts',
            'tsConfig': 'tsconfig.spec.json',
            'karmaConfig': '../karma.conf.js',
            'scripts': [] as any[],
            'styles': [{ 'input': 'styles.css' }],
            'assets': [
              { 'glob': 'assets' },
              { 'glob': 'favicon.ico' },
            ],
          }
        },
        'protractor': {
          'builder': '@angular-devkit/build-webpack:protractor',
          'options': {
            'devServerTarget': '$$proj0:dev-server',
            'protractorConfig': '../protractor.conf.js'
          }
        },
        'extract-i18n': {
          'builder': '@angular-devkit/build-webpack:extractI18n',
          'options': {
            'browserTarget': '$$proj0:browser'
          }
        },
        'tslint': {
          'builder': '@angular-devkit/build-webpack:tslint',
          'options': {
            'tslintConfig': '../tslint.json',
            'tsConfig': 'tsconfig.app.json',
            'exclude': [
              '**/node_modules/**'
            ]
          }
        },
      },
    },
    'second-app': {
      'root': 'src2',
      'projectType': 'application',
      'targets': {
        'browser': {
          'builder': '@angular-devkit/build-webpack:browser',
          'options': {
            'outputPath': '../dist2',
            'index': 'index.html',
            'main': 'main.ts',
            'polyfills': 'polyfills.ts',
            'tsConfig': 'tsconfig.app.json',
            'scripts': [] as any[],
            'styles': [] as any[],
            'assets': [] as any[],
            'progress': false
          },
          'configurations': {
            'production': {
              'optimizationLevel': 1,
              'outputHashing': 'all',
              'sourceMap': false,
              'extractCss': true,
              'namedChunks': false,
              'aot': true,
              'extractLicenses': true,
              'vendorChunk': false,
              'buildOptimizer': true
            }
          }
        },
      },
    },
  },
};


describe('createBuildFacadeWorkspace', () => {
  const convertedWorkspace = createArchitectWorkspace(cliConfig);

  it('should convert the top level workspace', () => {
    expect(convertedWorkspace).toEqual(jasmine.objectContaining({
      name: expectedWorkspace.name,
      version: expectedWorkspace.version,
      root: expectedWorkspace.root,
    }));
  });

  it('should convert apps', () => {
    const convertedWorkspace = createArchitectWorkspace(cliConfig);
    const firstProject = { ...expectedWorkspace.projects['$$proj0'] };
    const secondProject = { ...expectedWorkspace.projects['second-app'] };

    // We don't want to compare targets right now.
    delete convertedWorkspace.projects['$$proj0']['targets'];
    delete convertedWorkspace.projects['second-app']['targets'];
    delete firstProject['targets'];
    delete secondProject['targets'];

    const partialProjects = {
      '$$proj0': firstProject,
      'second-app': secondProject,
    };

    expect(convertedWorkspace.projects).toEqual(jasmine.objectContaining(partialProjects));
  });

  it('should convert the browser targets', () => {
    // TODO: check flag defaults for serve/build and stuff.
    // TODO: check environments
    expect(convertedWorkspace.projects['$$proj0'].targets.browser)
      .toEqual(expectedWorkspace.projects['$$proj0'].targets.browser);
    expect(convertedWorkspace.projects['second-app'].targets.browser)
      .toEqual(expectedWorkspace.projects['second-app'].targets.browser);

  });

  it('should convert the dev-server target', () => {
    expect(convertedWorkspace.projects['$$proj0'].targets['dev-server'])
      .toEqual(expectedWorkspace.projects['$$proj0'].targets['dev-server']);
  });

  it('should convert the karma target', () => {
    expect(convertedWorkspace.projects['$$proj0'].targets['karma'])
      .toEqual(expectedWorkspace.projects['$$proj0'].targets['karma']);
  });

  it('should convert the protractor target', () => {
    expect(convertedWorkspace.projects['$$proj0'].targets['protractor'])
      .toEqual(expectedWorkspace.projects['$$proj0'].targets['protractor']);
  });

  it('should convert the extract-i18n target', () => {
    expect(convertedWorkspace.projects['$$proj0'].targets['extract-i18n'])
      .toEqual(expectedWorkspace.projects['$$proj0'].targets['extract-i18n']);
  });

  it('should convert the tslint target', () => {
    expect(convertedWorkspace.projects['$$proj0'].targets['tslint'])
      .toEqual(expectedWorkspace.projects['$$proj0'].targets['tslint']);
  });
});
