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
    <code>--config</code> (aliases: <code>-c</code>)
  </p>
  <p>
    Use a specific config file. Defaults to the protractor config file in `.angular-cli.json`.
  </p>
</details>

<details>
  <summary>element-explorer</summary>
  <p>
    <code>--element-explorer</code> (aliases: <code>-ee</code>) <em>default value: false</em>
  </p>
  <p>
    Start Protractor's [Element Explorer](https://github.com/angular/protractor/blob/master/docs/debugging.md#testing-out-protractor-interactively) for debugging.
  </p>
</details>

<details>
  <summary>serve</summary>
  <p>
    <code>--serve</code> (aliases: <code>-s</code>) <em>default value: true</em>
  </p>
  <p>
    Compile and Serve the app. All serve options are also available. The live-reload option defaults to false, and the default port will be random.
  </p>
</details>

<details>
  <summary>specs</summary>
  <p>
    <code>--specs</code> (aliases: <code>-sp</code>) <em>default value: []</em>
  </p>
  <p>
    Override specs in the protractor config. Can send in multiple specs by repeating flag (ng e2e --specs=spec1.ts --specs=spec2.ts).
  </p>
</details>

<details>
  <summary>webdrive-update</summary>
  <p>
    <code>--webdrive-update</code> (aliases: <code>-wu</code>) <em>default value: true</em>
  </p>
  <p>
    Try to update webdriver.
  </p>
</details>
