# Core
> Shared utilities for Angular DevKit.

# Exception

# Json

## Schema

### SchemaValidatorResult
```
export interface SchemaValidatorResult {
  success: boolean;
  errors?: string[];
}
```

### SchemaValidator

```
export interface SchemaValidator {
  (data: any): Observable<SchemaValidatorResult>;
}
```

### SchemaFormatter

```
export interface SchemaFormatter {
  readonly async: boolean;
  validate(data: any): boolean | Observable<boolean>;
}
```

### SchemaRegistry

```
export interface SchemaRegistry {
  compile(schema: Object): Observable<SchemaValidator>;
  addFormat(name: string, formatter: SchemaFormatter): void;
}
```

### CoreSchemaRegistry

`SchemaRegistry` implementation using https://github.com/epoberezkin/ajv.
Constructor accepts object containing `SchemaFormatter` that will be added automatically.

```
export class CoreSchemaRegistry implements SchemaRegistry {
  constructor(formats: { [name: string]: SchemaFormatter} = {}) {}
}
```

# Logger

# Utils

# Virtual FS

# Workspaces

The `workspaces` namespace provides an API for interacting with the workspace file formats.
It provides an abstraction of the underlying storage format of the workspace and provides
support for both reading and writing.  Currently, the only supported format is the JSON-based
format used by the Angular CLI.  For this format, the API provides internal change tracking of values which
enables fine-grained updates to the underlying storage of the workspace.  This allows for the
retention of existing formatting and comments.

A workspace is defined via the following object model.  Definition collection objects are specialized
Javascript `Map` objects with an additional `add` method to simplify addition and provide more localized
error checking of the newly added values.

```ts
export interface WorkspaceDefinition {
    readonly extensions: Record<string, JsonValue | undefined>;
    readonly projects: ProjectDefinitionCollection;
}

export interface ProjectDefinition {
    readonly extensions: Record<string, JsonValue | undefined>;
    readonly targets: TargetDefinitionCollection;
    root: string;
    prefix?: string;
    sourceRoot?: string;
}

export interface TargetDefinition {
    options?: Record<string, JsonValue | undefined>;
    configurations?: Record<string, Record<string, JsonValue | undefined> | undefined>;
    builder: string;
}
```

The API is asynchronous and has two main functions to facilitate reading, creation, and modifying
a workspace: `readWorkspace` and `writeWorkspace`.

```ts
export enum WorkspaceFormat {
  JSON,
}
```

```ts
export function readWorkspace(
  path: string,
  host: WorkspaceHost,
  format?: WorkspaceFormat,
): Promise<{ workspace: WorkspaceDefinition; }>;
```

```ts
export function writeWorkspace(
  workspace: WorkspaceDefinition,
  host: WorkspaceHost,
  path?: string,
  format?: WorkspaceFormat,
): Promise<void>;
```

A `WorkspaceHost` abstracts the underlying data access methods from the functions.  It provides
methods to read, write, and analyze paths.  A utility function is provided to create
an instance of a `WorkspaceHost` from the Angular DevKit's virtual filesystem host abstraction.

```ts
export interface WorkspaceHost {
    readFile(path: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
    isDirectory(path: string): Promise<boolean>;
    isFile(path: string): Promise<boolean>;
}

export function createWorkspaceHost(host: virtualFs.Host): WorkspaceHost;
```

## Usage Example

To demonstrate the usage of the API, the following code will show how to add a option property
to a build target for an application.

```ts
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { workspaces } from '@angular-devkit/core';

async function demonstrate() {
    const host = workspaces.createWorkspaceHost(new NodeJsSyncHost());
    const { workspace } = await workspaces.readWorkspace('path/to/workspace/directory/', host);

    const project = workspace.projects.get('my-app');
    if (!project) {
      throw new Error('my-app does not exist');
    }

    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
      throw new Error('build target does not exist');
    }

    buildTarget.options.optimization = true;

    await workspaces.writeWorkspace(workspace, host);
}

demonstrate();
```