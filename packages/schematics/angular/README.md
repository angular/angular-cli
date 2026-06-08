# @schematics/angular

This package contains a collection of [schematics](/packages/angular_devkit/schematics/README.md)
for generating an Angular application.

## Schematics

| Name           | Description                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| app-shell      | Generates an app shell for running a server-side version of an app                                    |
| application    | Generates a new basic app definition in the "projects" subfolder of the workspace                     |
| class          | Creates a new, generic class definition in the given project                                          |
| component      | Creates a new, generic component definition in the given project                                      |
| directive      | Creates a new, generic directive definition in the given project                                      |
| enum           | Generates a new, generic enum definition in the given project                                         |
| guard          | Generates a new, generic route guard definition in the given project                                  |
| interceptor    | Creates a new, generic interceptor definition in the given project                                    |
| interface      | Creates a new, generic interface definition in the given project                                      |
| library        | Creates a new, generic library project in the current workspace                                       |
| module         | Creates a new, generic NgModule definition in the given project                                       |
| ng-new         | Creates a new project by combining the workspace and application schematics                           |
| pipe           | Creates a new, generic pipe definition in the given project                                           |
| resolver       | Creates a new, generic resolver definition in the given project                                       |
| service        | Creates a new, generic service definition in the given project                                        |
| service-worker | Pass this schematic to the "run" command to create a service worker                                   |
| web-worker     | Creates a new, generic web worker definition in the given project                                     |
| workspace      | Initializes an empty workspace and adds the necessary dependencies required by an Angular application |

## Disclaimer

While the schematics when executed via the Angular CLI and their associated options are considered stable, the programmatic APIs are not considered officially supported and are not subject to the breaking change guarantees of SemVer.
