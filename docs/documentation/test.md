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
`--app` Specifies app name or index to use.

`--browsers` Override which browsers tests are run against.

`--code-coverage` Coverage report will be in the coverage/ directory.

`--colors` Enable or disable colors in the output (reporters and logs).

`--config` Use a specific config file. Defaults to the protractor config file in angular-cli.json.

`--log-level` Level of logging.

`--poll` Enable and define the file watching poll time period (milliseconds).

`--port` Port where the web server will be listening.

`--progress` Log progress to the console while in progress.

`--reporters` List of reporters to use.

`--single-run` Run tests a single time.

`--sourcemap` Output sourcemaps.

`--watch` (`-w`) Run build when files change.