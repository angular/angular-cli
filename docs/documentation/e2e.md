<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng e2e

## Overview
`ng e2e` serves the application and runs end-to-end tests

### Running end-to-end tests

```bash
ng e2e
```

End-to-end tests are run via [Protractor] (https://angular.github.io/protractor/).

## Options
<details>
  <summary>config</summary>
  <p>
    `--config` (alias: `-c`)
  </p>
  <p>
    Use a specific config file. Defaults to the protractor config file in `.angular-cli.json`.
  </p>
</details>

<details>
  <summary>element-explorer</summary>
  <p>
    `--element-explorer` (alias: `-ee`) _default value: false_
  </p>
  <p>
    Start Protractor's [Element Explorer](https://github.com/angular/protractor/blob/master/docs/debugging.md#testing-out-protractor-interactively) for debugging.
  </p>
</details>

<details>
  <summary>serve</summary>
  <p>
    `--serve` (alias: `-s`) _default value: true_
  </p>
  <p>
    Compile and Serve the app. All serve options are also available. The live-reload option defaults to false, and the default port will be random.
  </p>
</details>

<details>
  <summary>specs</summary>
  <p>
    `--specs` (alias: `-sp`) _default value: []_
  </p>
  <p>
    Override specs in the protractor config. Can send in multiple specs by repeating flag (ng e2e --specs=spec1.ts --specs=spec2.ts).
  </p>
</details>

<details>
  <summary>webdrive-update</summary>
  <p>
    `--webdrive-update` (alias: `-wu`) _default value: true_
  </p>
  <p>
    Try to update webdriver.
  </p>
</details>
