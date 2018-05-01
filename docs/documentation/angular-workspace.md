<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

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
  - *schematic-package:schematic-name* (`string`): Object containing options for this schematic.

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
      - *configurations* (`object`): A map of alternative target options.
        - *configurationName* (`object`): Partial options override for this builder.
