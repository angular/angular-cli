<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng eject

## Overview
`ng eject` ejects your app and output the proper webpack configuration and scripts.

This command uses the same flags as `ng build`, generating webpack configuration to match those
flags.

You can use `--force` to overwrite existing configurations.
You can eject multiple times, to have a dev and prod config for instance, by renaming the ejected
configuration and using the `--force` flag.

### Ejecting the CLI

```bash
ng eject
```

## Options
<details>
  <summary>aot</summary>
  <p>
    <code>--aot</code>
  </p>
  <p>
    Build using Ahead of Time compilation.
  </p>
</details>

<details>
  <summary>app</summary>
  <p>
    <code>--app</code> (aliases: <code>-a</code>) <em>default value: 1st app</em>
  </p>
  <p>
    Specifies app name to use.
  </p>
</details>

<details>
  <summary>base-href</summary>
  <p>
    <code>--base-href</code> (aliases: <code>-bh</code>)
  </p>
  <p>
    Base url for the application being built.
  </p>
</details>

<details>
  <summary>deploy-url</summary>
  <p>
    <code>--deploy-url</code> (aliases: <code>-d</code>)
  </p>
  <p>
    URL where files will be deployed.
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
  <summary>extract-css</summary>
  <p>
    <code>--extract-css</code> (aliases: <code>-ec</code>)
  </p>
  <p>
    Extract css from global styles onto css files instead of js ones.
  </p>
</details>

<details>
  <summary>force</summary>
  <p>
    <code>--force</code> <em>default value: false</em>
  </p>
  <p>
    Overwrite any webpack.config.js and npm scripts already existing.
  </p>
</details>

<details>
  <summary>i18n-file</summary>
  <p>
    <code>--i18n-file</code>
  </p>
  <p>
    Localization file to use for i18n.
  </p>
</details>

<details>
  <summary>i18n-format</summary>
  <p>
    <code>--i18n-format</code>
  </p>
  <p>
    Format of the localization file specified with --i18n-file.
  </p>
</details>

<details>
  <summary>locale</summary>
  <p>
    <code>--locale</code>
  </p>
  <p>
    Locale to use for i18n.
  </p>
</details>

<details>
  <summary>missing-translation</summary>
  <p>
    <code>--missing-translation</code>
  </p>
  <p>
    How to handle missing translations for i18n.
  </p>
  <p>
    Values: <code>error</code>, <code>warning</code>, <code>ignore</code>
  </p>
</details>

<details>
  <summary>output-hashing</summary>
  <p>
    <code>--output-hashing</code> (aliases: <code>-oh</code>) <em>default value: </em>
  </p>
  <p>
    Define the output filename cache-busting hashing mode. Possible values: <code>none</code>, <code>all</code>, <code>media</code>, <code>bundles</code>
  </p>
</details>

<details>
  <summary>output-path</summary>
  <p>
    <code>--output-path</code> (aliases: <code>-op</code>) <em>default value: </em>
  </p>
  <p>
    Path where output will be placed.
  </p>
</details>

<details>
  <summary>poll</summary>
  <p>
    <code>--poll</code>
  </p>
  <p>
    Enable and define the file watching poll time period (milliseconds) .
  </p>
</details>

<details>
  <summary>progress</summary>
  <p>
    <code>--progress</code> (aliases: <code>-pr</code>) <em>default value: true inside TTY, false otherwise</em>
  </p>
  <p>
    Log progress to the console while building.
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
  <summary>target</summary>
  <p>
    <code>--target</code> (aliases: <code>-t</code>, <code>-dev</code>, <code>-prod</code>) <em>default value: development</em>
  </p>
  <p>
    Defines the build target.
  </p>
</details>

<details>
  <summary>vendor-chunk</summary>
  <p>
    <code>--vendor-chunk</code> (aliases: <code>-vc</code>) <em>default value: true</em>
  </p>
  <p>
    Use a separate bundle containing only vendor libraries.
  </p>
</details>

<details>
  <summary>common-chunk</summary>
  <p>
    <code>--common-chunk</code> (aliases: <code>-cc</code>) <em>default value: true</em>
  </p>
  <p>
    Use a separate bundle containing code used across multiple bundles.
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code> (aliases: <code>-v</code>) <em>default value: false</em>
  </p>
  <p>
    Adds more details to output logging.
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
