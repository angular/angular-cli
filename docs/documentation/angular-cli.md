<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Angular CLI Config Schema

## Options

- **project**: The global configuration of the project.
  - *name* (`string`): The name of the project.
  - *ejected*(`boolean`): Whether or not this project was ejected. Default is `false`.


- **apps** (`array`): Properties of the different applications in this project.
  - *name* (`string`): Name of the app.
  - *root* (`string`): The root directory of the app.
  - *outDir* (`string`): The output directory for build results. Default is `dist/`.
  - *assets* (`array`): List of application assets.
  - *deployUrl* (`string`): URL where files will be deployed.
  - *index* (`string`): The name of the start HTML file. Default is `index.html`
  - *main* (`string`): The name of the main entry-point file.
  - *polyfills* (`string`): The name of the polyfills entry-point file. Loaded before the app.
  - *test* (`string`): The name of the test entry-point file.
  - *tsconfig* (`string`): The name of the TypeScript configuration file. Default is `tsconfig.app.json`.
  - *testTsconfig* (`string`): The name of the TypeScript configuration file for unit tests.
  - *prefix* (`string`): The prefix to apply to generated selectors.
  - *serviceWorker* (`boolean`): Experimental support for a service worker from @angular/service-worker. Default is `false`.
  - *showCircularDependencies* (`boolean`): Show circular dependency warnings on builds. Default is `true`.
  - *styles* (`string|array`): Global styles to be included in the build.
  - *stylePreprocessorOptions* : Options to pass to style preprocessors.
    - *includePaths* (`array`): Paths to include. Paths will be resolved to project root.
  - *scripts* (`array`): Global scripts to be included in the build.
  - *environmentSource* (`string`): Source file for environment config.
  - *environments* (`object`): Name and corresponding file for environment config.

- **e2e**: Confirguration for end-to-end tests.
  - *protractor*
    - *config* (`string`): Path to the config file.

- **lint** (`array`): Properties to be passed to TSLint.
  - *files* (`string|array`): File glob(s) to lint.
  - *project* (`string`): Location of the tsconfig.json project file. Will also use as files to lint if 'files' property not present.
  - *tslintConfig* (`string`): Location of the tslint.json configuration. Default is `tslint.json`.
  - *exclude* (`string|array`): File glob(s) to ignore.


- **test**: Configuration for unit tests.
  - *karma*
    - *config* (`string`): Path to the karma config file.
  - *codeCoverage*
    - *exclude* (`array`): Globs to exclude from code coverage.

- **defaults**: Specify the default values for generating.
  - *styleExt* (`string`): The file extension to be used for style files.
  - *poll* (`number`): How often to check for file updates.
  - *class*: Options for generating a class.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `false`.
  - *component*: Options for generating a component.
    - *flat* (`boolean`): Flag to indicate if a dir is created. Default is `false`.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `true`.
    - *inlineStyle* (`boolean`): Specifies if the style will be in the ts file. Default is `false`.
    - *inlineTemplate* (`boolean`): Specifies if the template will be in the ts file. Default is `false`.
    - *viewEncapsulation* (`string`): Specifies the view encapsulation strategy. Can be one of `Emulated`, `Native` or `None`.
    - *changeDetection* (`string`): Specifies the change detection strategy. Can be one of `Default` or `OnPush`.
  - *directive*: Options for generating a directive.
    - *flat* (`boolean`): Flag to indicate if a dir is created. Default is `true`.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `true`.
  - *guard*: Options for generating a guard.
    - *flat* (`boolean`): Flag to indicate if a dir is created. Default is `true`.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `true`.
  - *interface*: Options for generating a interface.
    - *prefix* (`string`): Prefix to apply to interface names. (i.e. I)
  - *module*: Options for generating a module.
    - *flat* (`boolean`): Flag to indicate if a dir is created. Default is `false`.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `false`.
  - *pipe*: Options for generating a pipe.
    - *flat* (`boolean`): Flag to indicate if a dir is created. Default is `true`.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `true`.
  - *service*: Options for generating a service.
    - *flat* (`boolean`): Flag to indicate if a dir is created. Default is `true`.
    - *spec* (`boolean`): Specifies if a spec file is generated. Default is `true`.
  - *serve*: Properties to be passed to the serve command
    - *port* (`number`): The port the application will be served on. Default is `4200`.
    - *host* (`string`): The host the application will be served on. Default is `localhost`.
    - *ssl* (`boolean`): Enables ssl for the application. Default is `false`.
    - *sslKey* (`string`): The ssl key used by the server. Default is `ssl/server.key`.
    - *sslCert* (`string`): The ssl certificate used by the server. Default is `ssl/server.crt`.

- **packageManager** (`string`): Specify which package manager tool to use. Options include `npm`, `cnpm` and `yarn`.

- **warnings**: Allow people to disable console warnings.
  - *nodeDeprecation* (`boolean`): Show a warning when the node version is incompatible. Default is `true`.
  - *packageDeprecation* (`boolean`): Show a warning when the user installed angular-cli. Default is `true`.
  - *versionMismatch* (`boolean`): Show a warning when the global version is newer than the local one. Default is `true`.
