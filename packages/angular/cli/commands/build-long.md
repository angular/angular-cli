Uses the Webpack build tool, with default target environment and build options specified in the workspace configuration file, `angular.json`.

You can override the configuration defaults by specifying an option on the command line. 
The command can accept option names given in either dash-case or camelCase.
Note that in the configuration file, you must specify names in camelCase.

The configuration options generally correspond to the command options.
Some additional options can only be set through the configuration file,
either by direct editing or with the `ng config` command.
These include `assets`, `styles`, and `scripts` objects that provide runtime-global resources to include in the project. 
Resources in CSS, such as images and fonts, are automatically written and fingerprinted at the root of the output folder.

For further details, see Workspace Configuration.
