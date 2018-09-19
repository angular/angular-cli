
# Update Command

`ng update` is a new command in the CLI to update one or multiple packages, its peer dependencies, and the peer dependencies that depends on it.

If there are inconsistencies, for example if peer dependencies cannot be matches by a simple semver range, the tool will error out (and nothing will be committed on the filesystem).

## Command Line Usage

```bash
ng update <package1 [package2 [...]]> [options]
```

You can specify more than one package. Each package follows the convention of `[@scope/]packageName[@version-range-or-dist-tag]`. Packages not found in your dependencies will trigger an error. Any package that has a higher version in your `package.json` will trigger an error. 

| Flag | Argument | Description |
|---|---|---|
| `--all` | `boolean` | If true, implies that all dependencies should be updated. Defaults is false, using dependencies from the command line instead. |
| `--force` | `boolean` | If true, skip the verification step and perform the update even if some peer dependencies would be invalidated. Peer dependencies errors will still be shown as warning. Defaults to false. |
| `--next` | `boolean` | If true, allows version discovery to include Beta and RC. Defaults to false. |
| `--migrate-only` | `boolean` | If true, don't change the `package.json` file, only apply migration scripts. |
| `--from` | `version` | Apply migrations from a certain version number. |
| `--to` | `version` | Apply migrations up to a certain version number (inclusive). By default will update to the installed version. |

## Details

The schematic performs the following steps, in order:

1. Get all installed package names and versions from the `package.json` into `dependencyMap: Map<string, string>`.
1. From that map, fetch all `package.json` from the NPM repository, which contains all versions, and gather them in a `Map<string, NpmPackageJson>`.
  1. At the same time, update the `Map<>` with the version of the package which is believed to be installed (largest version number matching the version range).
  1. **WARNING**: this might not be the exact installed versions, unfortunately. We should have a proper `package-lock.json` loader, and support `yarn.lock` as well, but these are stretch goals (and where do we stop).
1. For each packages mentioned on the command line, update to the target version (by default largest non-beta non-rc version):  

  ```python
  # ARGV    The packages being requested by the user.
  # NPM     A map of package name to a map of version to PackageJson structure.
  # V       A map of package name to available versions.
  # PKG     A map of package name to PackageJson structure, for the installed versions.
  # next    A flag for the "--next" command line argument.

  # First add all updating packages' peer dependencies. This should be recursive but simplified
  # here for readability.
  ARGV += [ NPM[p][max([ v for v in V[p] if (not is_beta(v) or next) ])].peerDependencies
            for p in ARGV ]

  for p in ARGV:
    x = max([ v for v in V[p] if (not is_beta(v) or next) ])

    for other in set(PKG.keys()) - set([ p ]):
      # Verify all packages' peer dependencies.
      if has(other.peerDependencies, p) and !compatible(x, other.peerDependencies[p]):
        showError('Cannot update dependency "%s": "%s" is incompatible with the updated dependency' % (x, other))

      if any( has(other.peerDependencies, peer) and !compatible(x, other.peerDependencies[peer])
              for peer in PKG[p].peerDependencies.keys() ):
        showError('Cannot update dependency "%s": "%s" depends on an incompatible peer dependency' % (x, other))

    update_package_json(p, x)
```



## Library Developers

Libraries are responsible for defining their own update schematics. The `ng update` tool will update the package.json, and if it detects am `"ng-update"` key in package.json of the library, will run the update schematic on it (with version information metadata).

If a library does not define the `"ng-update"` key in their package.json, they are considered not supporting the update workflow and `ng update` is basically equivalent to `npm install`.

### Migration

In order to implement migrations in a library, the author must add the `ng-update` key to its `package.json`. This key contains the following fields:

| Field Name | Type | Description |
|---|---|---|
| `requirements` | `{ [packageName: string]: VersionRange }` | A map of package names to version to check for minimal requirement. If one of the libraries listed here does not match the version range specified in `requirements`, an error will be shown to the user to manually update those libraries. For example, `@angular/core` does not support updates from versions earlier than 5, so this field would be `{ '@angular/core': '>= 5' }`.
| `migrations` | `string` | A relative path (or resolved using Node module resolution) to a Schematics collection definition. |
| `packageGroup` | `string[]` | A list of npm packages that are to be grouped together. When running the update schematic it will automatically include all packages as part of the packageGroup in the update (if the user also installed them). |
| `packageGroupName` | `string` | The name of the packageGroup to use. By default, uses the first package in the packageGroup. The packageGroupName needs to be part of the packageGroup and should be a valid package name. |

#### Example given:
Library my-lib wants to have 2 steps to update from version 4 -> 4.5 and 4.5 to 5. It would add this information in its `package.json`:

```json
{
  "ng-update": {
    "requirements": {
      "my-lib": "^5"
    },
    "migrations": "./migrations/migration-collection.json"
  }
}
```

And create a migration collection (same schema as the Schematics collection):

```json
{
  "schematics": {
    "migration-01": {
      "version": "6",
      "factory": "./update-6"
    },
    "migration-02": {
      "version": "6.2",
      "factory": "./update-6_2"
    },
    "migration-03": {
      "version": "6.3",
      "factory": "./update-6_3"
    },
    "migration-04": {
      "version": "7",
      "factory": "./update-7"
    },
    "migration-05": {
      "version": "8",
      "factory": "./update-8"
    }
  }
}
```

The update tool would then read the current version of library installed, check against all `version` fields and run the schematics, until it reaches the version required by the user (inclusively). If such a collection is used to update from version 5 to version 7, the `01`, `02`, `03,` and `04` functions would be called. If the current version is 7 and a `--refactor-only` flag is passed, it would run the migration `04` only. More arguments are needed to know from which version you are updating.

Running `ng update @angular/core` would be the same as `ng generate @angular/core/migrations:migration-01`.

## Use cases

### Help

`ng update`, shows what updates would be applied;

```sh
$ ng update
We analyzed your package.json, there's some packages to update:

Name                Version            Command to update
----------------------------------------------------------------------------
@angular/cli        1.7.0  >  6.0.0    ng update @angular/cli
@angular/core       5.4.3  >  6.0.1    ng update @angular/core
@angular/material   5.2.1  >  6.0.0    ng update @angular/material
@angular/router     5.4.3  >  6.0.1    ng update @angular/core

There might be additional packages that are outdated.
```

### Simple Multi-steps

I have a dependency on Angular, Material and CLI. I want to update the CLI, then Angular, then Material in separate steps.

#### Details
1. `ng update @angular/cli`.  
Updates the CLI and packages that have a peer dependencies on the CLI (none), running refactoring tools from CLI 1 to 6.
1. `ng update @angular/core`.  
Updates the Core package and all packages that have a peer dependency on it. This can get tricky if `@angular/material` get caught in the update because the version installed does not directly allow the new version of `@angular/core`. In this case 

### Complex Case

package.json:

```json
{
  "dependencies": {
    "@angular/material": "5.0.0",
    "@angular/core": "5.5.5"
  }
}
```

Commands:

```bash
ng update @angular/core
```

- updates `@angular/core` to the `latest` dist-tag (6.0.0)
- sees that `@angular/material` is not compatible with 6.0.0; **error out.**

```bash
ng update @angular/material
```

- update `@angular/material` to latest version, that should be compatible with the current `@angular/core`.
- if that version is not compatible with you 
- tell the user about a higher version that requires an update to `@angular/core`.


## Notes

1. if someone is on CLI 1.5, the command is not supported. The user needs to update to `@angular/cli@latest`, then `ng update @angular/cli`. Post install hook will check versions of cli configuration and show a message to run the `ng update` command.
1. NPM proxies or cache are not supported by the first version of this command.
