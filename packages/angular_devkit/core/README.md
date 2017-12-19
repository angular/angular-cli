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

### SchemaRegistry

```
export interface SchemaRegistry {
  compile(schema: Object): Observable<SchemaValidator>;
}
```

### CoreSchemaRegistry

`SchemaRegistry` implementation using https://github.com/epoberezkin/ajv.

# Logger

# Utils

# Virtual FS