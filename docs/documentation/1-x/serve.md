<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng serve

## Overview
`ng serve` builds the application and starts a web server.

All the build Options are available in serve, below are the additional options.

## Options
<details>
  <summary>host</summary>
  <p>
    <code>--host</code> (aliases: <code>-H</code>) <em>default value: localhost</em>
  </p>
  <p>
    Listens only on localhost by default.
  </p>
</details>

<details>
  <summary>hmr</summary>
  <p>
    <code>--hmr</code> <em>default value: false</em>
  </p>
  <p>
    Enable hot module replacement.
  </p>
</details>

<details>
  <summary>live-reload</summary>
  <p>
    <code>--live-reload</code> (aliases: <code>-lr</code>) <em>default value: true</em>
  </p>
  <p>
    Whether to reload the page on change, using live-reload.
  </p>
</details>

<details>
  <summary>public-host</summary>
  <p>
    <code>--public-host</code> (aliases: <code>--live-reload-client</code>)
  </p>
  <p>
    Specify the URL that the browser client will use.
  </p>
</details>

<details>
  <summary>disable-host-check</summary>
  <p>
    <code>--disable-host-check</code> <em>default value: false</em>
  </p>
  <p>
    Don't verify connected clients are part of allowed hosts.
  </p>
</details>

<details>
  <summary>open</summary>
  <p>
    <code>--open</code> (aliases: <code>-o</code>) <em>default value: false</em>
  </p>
  <p>
    Opens the url in default browser.
  </p>
</details>

<details>
  <summary>port</summary>
  <p>
    <code>--port</code> (aliases: <code>-p</code>) <em>default value: 4200</em>
  </p>
  <p>
    Port to listen to for serving. <code>--port 0</code> will get a free port
  </p>
</details>

<details>
  <summary>ssl</summary>
  <p>
    <code>--ssl</code>
  </p>
  <p>
    Serve using HTTPS.
  </p>
</details>

<details>
  <summary>ssl-cert</summary>
  <p>
    <code>--ssl-cert</code> (aliases: <code>-</code>) <em>default value: </em>
  </p>
  <p>
    SSL certificate to use for serving HTTPS.
  </p>
</details>

<details>
  <summary>ssl-key</summary>
  <p>
    <code>--ssl-key</code>
  </p>
  <p>
    SSL key to use for serving HTTPS.
  </p>
</details>

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
  <summary>proxy-config</summary>
  <p>
    <code>--proxy-config</code> (aliases: <code>-pc</code>)
  </p>
  <p>
    Use a <a href="https://github.com/angular/angular-cli/blob/master/docs/documentation/stories/proxy.md">proxy</a> configuration file to send some requests to a backend server rather than the webpack dev server.
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


## Note
When running `ng serve`, the compiled output is served from memory, not from disk. This means that the application being served is not located on disk in the `dist` folder.
