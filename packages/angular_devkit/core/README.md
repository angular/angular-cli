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