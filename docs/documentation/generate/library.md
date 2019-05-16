<!-- Links in /docs/documentation should NOT have \`.md\` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/generate)**.


# ng generate library

## Overview
`ng generate library [name]` generates a library project for Angular.

## Alias
lib - `ng generate lib [name]`

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
    <code>--force</code> (alias: <code>-f</code>)
  </p>
  <p>
    Forces overwriting of files.
  </p>
</details>
<details>
  <summary>entry-file</summary>
  <p>
    <code>--entry-file</code>
  </p>
  <p>
    The path to create the library's public API file.
  </p>
</details>
<details>
  <summary>prefix</summary>
  <p>
    <code>--prefix</code> (alias: <code>-p</code>)
  </p>
  <p>
    The prefix to apply to generated selectors.
  </p>
</details>
<details>
  <summary>skip-package-json</summary>
  <p>
    <code>--skip-package-json</code>
  </p>
  <p>
    Do not add dependencies to package.json.
  </p>
</details>
<details>
  <summary>skip-install</summary>
  <p>
    <code>--skip-install</code>
  </p>
  <p>
    Skip installing dependency packages.
  </p>
</details>
<details>
  <summary>skip-ts-config</summary>
  <p>
    <code>--skip-ts-config</code>
  </p>
  <p>
    Do not update tsconfig.json for development experience.
  </p>
</details>
