<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is deprecated and we no longer accept PRs to improve this. The new documentation will be available in [angular.io](https://angular.io)**.

# Angular CLI workspace file (angular.json) schema

## Properties

- **version** (`integer`): File format version. This is currently `"1"`.

- **newProjectRoot** (`string`): Path where new projects will be created.

- **defaultProject** (`string`): Default project name used in commands.

- **cli**: Workspace configuration options for Angular CLI.
  - *defaultCollection* (`string`): The default schematics collection to use.
  - *packageManager* (`string`): Specify which package manager tool to use.
  - *warnings* (`object`): Warning configuration.
    - *versionMismatch* (`boolean`): Show a warning when the global version is newer than the local one.
    - *typescriptMismatch* (`boolean`): The name of the project.

- **schematics** (`object`): Workspace configuration options for Schematics.
  - *schematic-package:schematic-name* (`object`): Object containing options for this schematic. JSON Schema for default schematics:
    - [@schematics/angular:component](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L74-L144)
    - [@schematics/angular:directive](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L145-L186)
    - [@schematics/angular:module](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L187-L223)
    - [@schematics/angular:service](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L224-L238)
    - [@schematics/angular:pipe](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L239-L269)
    - [@schematics/angular:class](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L270-L279)


- **projects**: Configuration options for each project in the workspace.
  - *root* (`string`): Root of the project files.
  - *sourceRoot* (`string`): The root of the source files, assets and index.html file structure..
  - *projectType* (`string`): the type of this project, `application` or `library`.
  - *prefix* (`string`): The prefix to apply to generated selectors.
  - *schematics* (`object`): Project configuration options for Schematics. Has the same format as top level Schematics configuration).
  - *architect* (`string`): Project configuration for Architect targets.
    - *targetName* (`string`): Name of this target.
      - *builder* (`string`): Builder for this target, in the format `package-name:builder-name`.
      - *options* (`string`): Options for this builder.
        JSON Schema for default schematics:
        - [@angular-devkit/build-angular:app-shell](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L489-L520)
        - [@angular-devkit/build-angular:browser](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L521-L906)
        - [@angular-devkit/build-angular:dev-server](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L907-L1028)
        - [@angular-devkit/build-angular:extract-i18n](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L1029-L1064)
        - [@angular-devkit/build-angular:karma](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L1065-L1267)
        - [@angular-devkit/build-angular:protractor](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L1268-L1323)
        - [@angular-devkit/build-angular:server](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L1324-L1518)
        - [@angular-devkit/build-angular:tslint](https://github.com/angular/angular-cli/blob/v6.0.0-rc.8/packages/%40angular/cli/lib/config/schema.json#L1519-L1594)
      - *configurations* (`object`): A map of alternative target options.
        - *configurationName* (`object`): Partial options override for this builder.
