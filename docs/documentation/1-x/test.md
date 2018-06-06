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
    <code>--app</code> (aliases: <code>-a</code>) <em>default value: 1st app</em>
  </p>
  <p>
    Specifies app name or index to use.
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
    <code>--code-coverage</code> (aliases: <code>-cc</code>) <em>default value: false</em>
  </p>
  <p>
    Coverage report will be in the coverage/ directory.
  </p>
</details>

<details>
  <summary>colors</summary>
  <p>
    <code>--colors</code>
  </p>
  <p>
    Enable or disable colors in the output (reporters and logs).
  </p>
</details>

<details>
  <summary>config</summary>
  <p>
    <code>--config</code> (aliases: <code>-c</code>)
  </p>
  <p>
    Use a specific config file. Defaults to the karma config file in `.angular-cli.json`.
  </p>
</details>

<details>
  <summary>environment</summary>
  <p>
    <code>--environment</code> (aliases: <code>-e</code>)
  </p>
  <p>
    Defines the build environment.
  </p>
</details>

<details>
  <summary>log-level</summary>
  <p>
    <code>--log-level</code>
  </p>
  <p>
    Level of logging.
  </p>
</details>

<details>
  <summary>poll</summary>
  <p>
    <code>--poll</code>
  </p>
  <p>
    Enable and define the file watching poll time period (milliseconds).
  </p>
</details>

<details>
  <summary>port</summary>
  <p>
    <code>--port</code>
  </p>
  <p>
    Port where the web server will be listening.
  </p>
</details>

<details>
  <summary>progress</summary>
  <p>
    <code>--progress</code> <em>default value: true inside TTY, false otherwise</em>
  </p>
  <p>
    Log progress to the console while in progress.
  </p>
</details>

<details>
  <summary>reporters</summary>
  <p>
    <code>--reporters</code>
  </p>
  <p>
    List of reporters to use.
  </p>
</details>

<details>
  <summary>single-run</summary>
  <p>
    <code>--single-run</code> (aliases: <code>-sr</code>)
  </p>
  <p>
    Run tests a single time.
  </p>
</details>

<details>
  <summary>sourcemap</summary>
  <p>
    <code>--sourcemap</code> (aliases: <code>-sm</code>, <code>sourcemaps</code>)
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>

<details>
  <summary>watch</summary>
  <p>
    <code>--watch</code> (aliases: <code>-w</code>)
  </p>
  <p>
    Run build when files change.
  </p>
</details>
