<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng get

## Overview
`ng get [key]` Get a value from the configuration.
`[key]` should be in JSON path format. Example: `a[3].foo.bar[2]`.

## Options
<details>
  <summary>global</summary>
  <p>
    <code>--global</code> <em>default value: false</em>
  </p>
  <p>
    Get the value in the global configuration (in your home directory).
  </p>
</details>


# ng set

## Overview
`ng set [key]=[value]` Set a value in the configuration.
`[key]` should be in JSON path format. Example: `a[3].foo.bar[2]`.

## Options
<details>
  <summary>global</summary>
  <p>
    <code>--global</code> <em>default value: false</em>
  </p>
  <p>
    Get the value in the global configuration (in your home directory).
  </p>
</details>
