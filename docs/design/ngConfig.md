# ngConfig - Design

## Goals

Currently, a project scaffolded with the CLI have no way of specifying options and configurations affecting their projects. There are ways to affect the build (with the `angular-cli-build.js` file), but the following questions cannot be answered without actual project options:

* Where in my directory is my karma.conf file?
* What is my firebase database URL?
* Where is my client code?
* How can I use a different lazy-loading boundary prefix (or none at all)?
* Any other backend I want to run prior to `ng serve`?

# Proposed Solution

Since the data is static, we only need to keep it in a static store somewhere.

One solution would be to keep the data in the `package.json`. Unfortunately, the metadata contains too much data and the `package.json` file would become unmanageable.

Instead of polluting the package file, a `angular-cli.json` file will be created that contains all the values. Access to that file will be allowed to the user if he knows the structure of the file (unknown keys will be kept but ignored), and it's easy to read and write.


## Fallback

There should be two `angular-cli.json` files; one for the project and a general one. The general one should contain information that can be useful when scaffolding new apps, or informations about the user.

The project `angular-cli.json` goes into the project root. The global configuration should live at `$HOME/.angular-cli.json`.

## Structure

The structure should be defined by a JSON schema (see [here](http://json-schema.org/)). The schema will be used to generate the `d.ts`, but that file will be kept in the file system along the schema for IDEs.

Every PR that would change the schema should include the update to the `d.ts`.

# API

## CLI

#### Getting values

The new command `get` should be used to output values on the terminal. It takes a set of flags and an optional array of [paths](#path);

* `--glob` or `-g`; the path follows a glob format, where `*` can be replaced by any amount of characters and `?` by a single character. This will output `name=value` for each values matched.

Otherwise, outputs the value of the path passed in. If multiple paths are passed in, they follow the format of `name=value`.

#### Setting values

The new command `set` should be used to set values in the local configuration file. It takes a set of flags and an optional array of `[path](#path)=value`;

* `--global`; sets the value in the global configuration.
* `--remove`; removes the key (no value should be passed in).

The schema needs to be taken into account when setting the value of the field;

* If the field is a number, the string received from the command line is parsed. `NaN` throws an error.
* If the field is an object, an error is thrown.
* If the path is inside an object but the object hasn't been defined yet, sets the object with empty values (use the schema to create a valid object).

#### Path<a name="path"></a>

The paths are json formatted path; each `.` separates a map, while `[]` indicates an index in an array.

An example is the following:

    keyA.keyB.arrayC[3].value

## Model

A model should be created that will include loading and saving the configuration, including the global configuration.

**The model should be part of the project and created on the `project` object.**

That model can be used internally by the tool to get information. It will include a proxy handler that throws if an operation doesn't respect the schema. It will also sets values on globals and locals depending on which branches you access.

A simple API would return the TypeScript interface:

```typescript
class Config {
  // ...
  get local(): ICliConfig { /* ... */ }
  get global(): ICliConfig { /* ... */ }
}
```

The `local` and `global` getters return proxies that respect the JSON Schema defined for the Angular config. These proxies allow users to not worry about the existence of values; those values will only be created on disc when they are setted.

Also, `local` will always defer to the same key-path in `global` if a value isn't available. If a value is set and the parent exists in `global`, it should be created to `local` such that it's saved locally to the project. The proxies only care about the end points of `local` and `global`, not the existence of a parent in either.

For example, assuming the following globals/locals:

```js
// Global
{ 
  "key1": {
    "key2": {
      "value": 0,
      "value2": 1
    }
  }
}

// Local
{ 
  "key1": {
    "key2": {
      "value2": 2,
      "value3": 3
    }
  }
}
```

The following stands true:

```typescript
const config = new Config(/* ... */);

console.log(config.local.key1.key2.value);   // 0, even if it doesn't exist.
console.log(config.local.key1.key2.value2);  // 2, local overrides.
console.log(config.local.key1.key2.value3);  // 3.
console.log(config.local.key1.key2.value4);  // Schema's default value.

console.log(config.global.key1.key2.value);   // 0.
console.log(config.global.key1.key2.value2);  // 1, only global.
console.log(config.global.key1.key2.value3);  // Schema's default value.

config.local.key1.key2.value = 1;
// Now the value is 1 inside the local. Global stays the same.

config.local.key1.key2.value3 = 5;
// The global config isn't modified.

config.global.key1.key2.value4 = 99;
// The local config stays the same.
console.log(config.local.key1.key2.value4);  // 99, the global value.

config.save();  // Commits if there's a change to global and/or local.
```

