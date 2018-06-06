<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

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
    <code>--global</code> <em>default value: false</em>
  </p>
  <p>
    Get/set the value in the global configuration (in your home directory).
  </p>
</details>
