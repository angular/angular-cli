<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng e2e

## Overview
`ng e2e` serves the application and runs end-to-end tests

### Running end-to-end tests

```bash
ng e2e
```

End-to-end tests are run via [Protractor](https://angular.github.io/protractor/).

## Options
`--config` (`-c`) use a specific config file. Defaults to the protractor config file in `.angular-cli.json`.

`--specs` (`-sp`) override specs in the protractor config.
Can send in multiple specs by repeating flag (`ng e2e --specs=spec1.ts --specs=spec2.ts`).

`--element-explorer` (`-ee`) start Protractor's
[Element Explorer](https://github.com/angular/protractor/blob/master/docs/debugging.md#testing-out-protractor-interactively)
for debugging.

`--webdriver-update` (`-wu`) try to update webdriver.

`--serve` (`-s`) compile and serve the app.
All non-reload related serve options are also available (e.g. `--port=4400`).