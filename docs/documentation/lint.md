<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/lint)**.

# ng lint

## Overview
`ng lint` will lint you app code using tslint.

```bash
ng lint [project]
```

## Options
<details>
  <summary>configuration</summary>
  <p>
    <code>--configuration</code> (alias: <code>-c</code>)
  </p>
  <p>
    Specify the configuration to use.
  </p>
</details>
<details>
  <summary>tslint-config</summary>
  <p>
    <code>--tslint-config</code>
  </p>
  <p>
    The name of the TSLint configuration file.
  </p>
</details>
<details>
  <summary>fix</summary>
  <p>
    <code>--fix</code>
  </p>
  <p>
    Fixes linting errors (may overwrite linted files).
  </p>
</details>
<details>
  <summary>type-check</summary>
  <p>
    <code>--type-check</code>
  </p>
  <p>
    Controls the type check for linting.
  </p>
</details>
<details>
  <summary>force</summary>
  <p>
    <code>--force</code>
  </p>
  <p>
    Succeeds even if there was linting errors.
  </p>
</details>
<details>
  <summary>silent</summary>
  <p>
    <code>--silent</code>
  </p>
  <p>
    Show output text.
  </p>
</details>
<details>
  <summary>format</summary>
  <p>
    <code>--format</code>
  </p>
  <p>
    Output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso, fileslist, codeFrame).
  </p>
</details>
