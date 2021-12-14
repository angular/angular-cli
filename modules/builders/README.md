# Angular Universal Builders

Angular Universal comes with some custom Builders. All Parameters are also specified in their schema.json file.

# Builders

- prerender
- ssr-dev-server
- static-generator

## Prerender

### Description

This builder is used to prerender pages of your application. Prerendering is the process where a dynamic page is processed at build time generating static HTML.

For more information about this see: https://angular.io/guide/prerendering

Use this if you want to serve fast Pages, where you don't have changing Content on _each request_.

### Options

| Name          | Type of Value                                | Description                                                                       | Required |
| ------------- | -------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| browserTarget | Pattern: `^[^:\s]+:[^:\s]+(:[^\s]+)?$`       | Target to build.                                                                  | ✔️       |
| serverTarget  | Pattern: `^[^:\s]+:[^:\s]+(:[^\s]+)?$`       | Server target to use for prerendering the app.                                    | ✔️       |
| routesFile    | A Filename - Attention no schema validation! | The path to a file containing routes separated by newlines.                       |          |
| routes        | Unique Strings                               | The routes to render.                                                             |          |
| guessRoutes   | Bolean (default: true)                       | Whether or not the builder should extract routes and guess which paths to render. |          |
| numProcesses  | Number (min: 1, default: 1)                  | The number of cpus to use. Defaults to all but one.                               |          |

## SSR Dev Server

### Summary

This command is similar to ng serve, which offers live reload during development, but uses server-side rendering.
The application runs in watch mode and refreshes the browser after every change. This command is slower than the actual ng serve command.

Attention: This builder is _only for local development_.

### Options

| Name          | Type of Value               | Description                                                                                                                                            | Required |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| browserTarget | Pattern: `.+:.+(:.+)?`      | Target to build.                                                                                                                                       | ✔️       |
| serverTarget  | Pattern: `.+:.+(:.+)?`      | Server target to build.                                                                                                                                | ✔️       |
| host          | string (default: localhost) | Host to listen on.                                                                                                                                     |          |
| port          | number (default: 4200)      | Port to start the development server at. Default is 4200. Pass 0 to get a dynamically assigned port.                                                   |          |
| publicHost    | string                      | The URL that the browser client should use to connect to the development server. Use for a complex dev server setup, such as one with reverse proxies. |          |
| open          | boolean (default: false)    | Opens the url in default browser.                                                                                                                      |          |
| progress      | boolean (default: true)     | Log progress to the console while building.                                                                                                            |          |
| inspect       | boolean (default: false)    | Launch the development server in inspector mode and listen on address and port '127.0.0.1:9229'.                                                       |          |
| ssl           | boolean (default: false)    | Serve using HTTPS.                                                                                                                                     |          |
| sslKey        | string                      | SSL key to use for serving HTTPS.                                                                                                                      |          |
| sslCert       | string                      | SSL certificate to use for serving HTTPS.                                                                                                              |          |
| proxyConfig   | string                      | Proxy configuration file.                                                                                                                              |          |

## Static Generator

### Description

This builder is used to prerender pages of your application using the experimental [Clover](../common/clover/README.md) implementation.
Prerendering is the process where a dynamic page is processed at build time generating static HTML.

Attention:
Use this if you don't have any server side Code - as "serverTarget" is not configurable.

### Option

| Name          | Type of Value                          | Description                                                                       | Required |
| ------------- | -------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| browserTarget | Pattern: `^[^:\s]+:[^:\s]+(:[^\s]+)?$` | Target to build.                                                                  | ✔️       |
| routesFile    | string                                 | The path to a file containing routes separated by newlines.                       |          |
| routes        | array of Unique Strings                | The routes to render.                                                             |          |
| guessRoutes   | boolean (default: true)                | Whether or not the builder should extract routes and guess which paths to render. |          |
| numProcesses  | number (min: 1, default: 1)            | The number of cpus to use. Defaults to all but one.                               |          |
