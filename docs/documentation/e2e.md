<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/e2e)**.

# ng e2e

## Overview
`ng e2e` serves the application and runs end-to-end tests.

```bash
ng e2e [project]
```

### Running end-to-end tests

```bash
ng e2e
```

End-to-end tests are run via [Protractor](http://www.protractortest.org/).

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
  <summary>protractor-config</summary>
  <p>
    <code>--protractor-config</code>
  </p>
  <p>
    The name of the Protractor configuration file.
  </p>
</details>
<details>
  <summary>dev-server-target</summary>
  <p>
    <code>--dev-server-target</code>
  </p>
  <p>
    Dev server target to run tests against.
  </p>
</details>
<details>
  <summary>suite</summary>
  <p>
    <code>--suite</code>
  </p>
  <p>
    Override suite in the protractor config.
  </p>
</details>
<details>
  <summary>element-explorer</summary>
  <p>
    <code>--element-explorer</code>
  </p>
  <p>
    Start Protractor's Element Explorer for debugging.
  </p>
</details>
<details>
  <summary>webdriver-update</summary>
  <p>
    <code>--webdriver-update</code>
  </p>
  <p>
    Try to update webdriver.
  </p>
</details>
<details>
  <summary>serve</summary>
  <p>
    <code>--serve</code>
  </p>
  <p>
    Compile and Serve the app.
  </p>
</details>
<details>
  <summary>port</summary>
  <p>
    <code>--port</code>
  </p>
  <p>
    The port to use to serve the application.
  </p>
</details>
<details>
  <summary>host</summary>
  <p>
    <code>--host</code>
  </p>
  <p>
    Host to listen on.
  </p>
</details>
<details>
  <summary>base-url</summary>
  <p>
    <code>--base-url</code>
  </p>
  <p>
    Base URL for protractor to connect to.
  </p>
</details>
