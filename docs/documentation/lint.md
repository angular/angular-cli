<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng lint

## Overview
`ng lint` will lint you app code using tslint.

## Options
<details>
  <summary>fix</summary>
  <p>
    `--fix` _default value: false_
  </p>
  <p>
    Fixes linting errors (may overwrite linted files).
  </p>
</details>

<details>
  <summary>force</summary>
  <p>
    `--force` _default value: false_
  </p>
  <p>
    Succeeds even if there was linting errors.
  </p>
</details>

<details>
  <summary>type-check</summary>
  <p>
    `--type-check` _default value: false_
  </p>
  <p>
    Controls the type check for linting.
  </p>
</details>

<details>
  <summary>format</summary>
  <p>
    `--format` (alias: `-t`) _default value: prose_
  </p>
  <p>
    Output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso, fileslist).
  </p>
</details>
