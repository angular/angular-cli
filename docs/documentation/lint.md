<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng lint

## Overview
`ng lint` will lint you app code using tslint.

## Options
<details>
  <summary>fix</summary>
  <p>
    <code>--fix</code> <em>default value: false</em>
  </p>
  <p>
    Fixes linting errors (may overwrite linted files).
  </p>
</details>

<details>
  <summary>force</summary>
  <p>
    <code>--force</code> <em>default value: false</em>
  </p>
  <p>
    Succeeds even if there was linting errors.
  </p>
</details>

<details>
  <summary>type-check</summary>
  <p>
    <code>--type-check</code> <em>default value: false</em>
  </p>
  <p>
    Controls the type check for linting.
  </p>
</details>

<details>
  <summary>format</summary>
  <p>
    <code>--format</code> (aliases: <code>-t</code>) <em>default value: prose</em>
  </p>
  <p>
    Output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso, fileslist).
  </p>
</details>
