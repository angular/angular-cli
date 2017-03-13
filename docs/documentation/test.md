<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng test

## Overview
`ng test` compiles the application into an output directory

### Running unit tests

```bash
ng test
```

Tests will execute after a build is executed via [Karma](http://karma-runner.github.io/0.13/index.html), and it will automatically watch your files for changes. You can run tests a single time via `--watch=false` or `--single-run`.

You can run tests with coverage via `--code-coverage`. The coverage report will be in the `coverage/` directory.

## Options
<details>
  <summary>app</summary>
  <p>
    `--app` (alias: `-a`) _default value: 1st app_
  </p>
  <p>
    Specifies app name or index to use.
  </p>
</details>

<details>
  <summary>browsers</summary>
  <p>
    `--browsers`
  </p>
  <p>
    Override which browsers tests are run against.
  </p>
</details>

<details>
  <summary>code-coverage</summary>
  <p>
    `--code-coverage` (alias: `-cc`) _default value: false_
  </p>
  <p>
    Coverage report will be in the coverage/ directory.
  </p>
</details>

<details>
  <summary>colors</summary>
  <p>
    `--colors`
  </p>
  <p>
    Enable or disable colors in the output (reporters and logs).
  </p>
</details>

<details>
  <summary>config</summary>
  <p>
    `--config` (alias: `-c`)
  </p>
  <p>
    Use a specific config file. Defaults to the protractor config file in angular-cli.json.
  </p>
</details>

<details>
  <summary>log-level</summary>
  <p>
    `--log-level`
  </p>
  <p>
    Level of logging.
  </p>
</details>

<details>
  <summary>poll</summary>
  <p>
    `--poll`
  </p>
  <p>
    Enable and define the file watching poll time period (milliseconds).
  </p>
</details>

<details>
  <summary>port</summary>
  <p>
    `--port`
  </p>
  <p>
    Port where the web server will be listening.
  </p>
</details>

<details>
  <summary>progress</summary>
  <p>
    `--progress` _default value: true_
  </p>
  <p>
    Log progress to the console while in progress.
  </p>
</details>

<details>
  <summary>reporters</summary>
  <p>
    `--reporters`
  </p>
  <p>
    List of reporters to use.
  </p>
</details>

<details>
  <summary>single-run</summary>
  <p>
    `--single-run` (alias: `-sr`) _default value: false_
  </p>
  <p>
    Run tests a single time.
  </p>
</details>

<details>
  <summary>sourcemap</summary>
  <p>
    `--sourcemap` (alias: `-sm`, `sourcemaps`)
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>

<details>
  <summary>watch</summary>
  <p>
    `--watch` (aliases: `-w`)
  </p>
  <p>
    Run build when files change.
  </p>
</details>
