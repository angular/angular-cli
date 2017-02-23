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
`--watch` (`-w`) flag to run builds when files change

`--browsers` override which browsers tests are run against

`--colors` enable or disable colors in the output (reporters and logs)

`--log-level` level of logging

`--port` port where the web server will be listening

`--reporters` list of reporters to use

`--build` flag to build prior to running tests

`--poll` enable and define the file watching poll time period (milliseconds)
