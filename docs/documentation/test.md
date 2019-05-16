<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/test)**.


# ng test

## Overview
`ng test` compiles the application into an output directory

### Running unit tests

```bash
ng test
```

Tests will execute after a build is executed via [Karma](http://karma-runner.github.io/0.13/index.html), and it will automatically watch your files for changes. You can run tests a single time via `--watch=false`.

You can run tests with coverage via `--code-coverage`. The coverage report will be in the `coverage/` directory.

## Options
<details>
  <summary>prod</summary>
  <p>
    <code>--prod</code>
  </p>
  <p>
    Flag to set configuration to "prod".
  </p>
</details>
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
  <summary>main</summary>
  <p>
    <code>--main</code>
  </p>
  <p>
    The name of the main entry-point file.
  </p>
</details>
<details>
  <summary>ts-config</summary>
  <p>
    <code>--ts-config</code>
  </p>
  <p>
    The name of the TypeScript configuration file.
  </p>
</details>
<details>
  <summary>karma-config</summary>
  <p>
    <code>--karma-config</code>
  </p>
  <p>
    The name of the Karma configuration file.
  </p>
</details>
<details>
  <summary>polyfills</summary>
  <p>
    <code>--polyfills</code>
  </p>
  <p>
    The name of the polyfills file.
  </p>
</details>
<details>
  <summary>environment</summary>
  <p>
    <code>--environment</code>
  </p>
  <p>
    Defines the build environment.
  </p>
</details>
<details>
  <summary>source-map</summary>
  <p>
    <code>--source-map</code>
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>
<details>
  <summary>progress</summary>
  <p>
    <code>--progress</code>
  </p>
  <p>
    Log progress to the console while building.
  </p>
</details>
<details>
  <summary>watch</summary>
  <p>
    <code>--watch</code>
  </p>
  <p>
    Run build when files change.
  </p>
</details>
<details>
  <summary>poll</summary>
  <p>
    <code>--poll</code>
  </p>
  <p>
    Enable and define the file watching poll time period in milliseconds.
  </p>
</details>
<details>
  <summary>preserve-symlinks</summary>
  <p>
    <code>--preserve-symlinks</code>
  </p>
  <p>
    Do not use the real path when resolving modules.
  </p>
</details>
<details>
  <summary>browsers</summary>
  <p>
    <code>--browsers</code>
  </p>
  <p>
    Override which browsers tests are run against.
  </p>
</details>
<details>
  <summary>code-coverage</summary>
  <p>
    <code>--code-coverage</code>
  </p>
  <p>
    Output a code coverage report.
  </p>
</details>
