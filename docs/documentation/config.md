<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/config)**.

# ng config

## Overview
`ng config [key] [value]` Get/set configuration values.
`[key]` should be in JSON path format. Example: `a[3].foo.bar[2]`.
If only the `[key]` is provided it will get the value.
If both the `[key]` and `[value]` are provided it will set the value.

## Options
<details>
  <summary>global</summary>
  <p>
    <code>--global</code> (alias: <code>-g</code>)
  </p>
  <p>
    Get/set the value in the global configuration (in your home directory).
  </p>
</details>
