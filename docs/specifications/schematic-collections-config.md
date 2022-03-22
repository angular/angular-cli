# Schematics Collections (`schematicCollections`)

The `schematicCollections` can be placed under the `cli` option in the global `.angular.json` configuration, at the root or at project level in `angular.json` .

```jsonc
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "schematicCollections": ["@schematics/angular", "@angular/material"]
  }
  // ...
}
```

## Rationale

When this option is not configured and a user would like to run a schematic which is not part of `@schematics/angular`,
the collection name needs to be provided to `ng generate` command in the form of `[collection-name:schematic-name]`. This make the `ng generate` command too verbose for repeated usages.

This is where the `schematicCollections` option can be useful. When adding `@angular/material` to the list of `schematicCollections`, the generate command will try to locate the schematic in the specified collections.

```
ng generate navigation
```

is equivalent to:

```
ng generate @angular/material:navigation
```

## Conflicting schematic names

When multiple collections have a schematic with the same name. Both `ng generate` and `ng new` will run the first schematic matched based on the ordering (as specified) of `schematicCollections`.
