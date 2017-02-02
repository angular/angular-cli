<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng serve

## Overview
`ng serve` builds the application and starts a web server

## Options
`--watch` (`-w`) rebuild when files change

`--port` (`-p`) port to serve the application on

`--host` (`-H`) host where to listen

`--proxy-config` (`-pc`) proxy configuration file

`--live-reload` (`-lr`) flag to turn off live reloading

`--live-reload-client` specify the URL that the live reload browser client will use

`--ssl` flag to turn on SSL

`--ssl-key` path to the SSL key

`--ssl-cert` path to the SSL cert

`--open` (`-o`) opens the app in the default browser

`--hmr` use hot module reload

`--target` (`-t`) define the build target

`--environment` (`-e`) defines the build environment

`--prod` flag to set build target and environment to production

`--dev` flag to set build target and environment to development

`--output-path` (`-po`) path where output will be placed

`--aot` flag whether to build using Ahead of Time compilation

`--sourcemap` (`-sm`) output sourcemaps

`--vendor-chunk` (`-vb`) use a separate bundle containing only vendor libraries

`--base-href` (`-bh`) base url for the application being built

`--deploy-url` (`-d`) url where files will be deployed

`--verbose` (`-v`) adds more details to output logging

`--progress` (`-pr`) log progress to the console while building

`--extract-css` (`-ec`) extract css from global styles onto css files instead of js ones

`--output-hashing` define the output filename cache-busting hashing mode

`--poll` enable and define the file watching poll time period (milliseconds)
