<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/update)**.

# ng update

## Overview
`ng update` Updates the current application to latest versions.

```bash
ng update [package]
```

## Options
<details>
  <summary>dry-run</summary>
  <p>
    <code>--dry-run</code> (alias: <code>-d</code>)
  </p>
  <p>
    Run through without making any changes.
  </p>
</details>
<details>
  <summary>force</summary>
  <p>
    <code>--force</code>
  </p>
  <p>
    If false, will error out if installed packages are incompatible with the update.
  </p>
</details>
<details>
  <summary>all</summary>
  <p>
    <code>--all</code>
  </p>
  <p>
    Whether to update all packages in package.json.
  </p>
</details>
<details>
  <summary>next</summary>
  <p>
    <code>--next</code>
  </p>
  <p>
    Use the largest version, including beta and RCs.
  </p>
</details>
<details>
  <summary>migrate-only</summary>
  <p>
    <code>--migrate-only</code>
  </p>
  <p>
    Only perform a migration, does not update the installed version.
  </p>
</details>
<details>
  <summary>from</summary>
  <p>
    <code>--from</code>
  </p>
  <p>
    Version from which to migrate from. Only available with a single package being updated, and only on migration only.
  </p>
</details>
<details>
  <summary>to</summary>
  <p>
    <code>--to</code>
  </p>
  <p>
    Version up to which to apply migrations. Only available with a single package being updated, and only on migrations only. Requires from to be specified. Default to the installed version detected.
  </p>
</details>
<details>
  <summary>registry</summary>
  <p>
    <code>--registry</code>
  </p>
  <p>
    The NPM registry to use.
  </p>
</details>
