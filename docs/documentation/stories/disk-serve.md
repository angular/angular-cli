**Documentation below is deprecated and we no longer accept PRs to improve this. The new documentation will be available here [angular.io](https://angular.io/guide/build)**.

# Serve from Disk

The CLI supports running a live browser reload experience to users by running `ng serve`. This will compile the application upon file saves and reload the browser with the newly compiled application. This is done by hosting the application in memory and serving it via [webpack-dev-server](https://webpack.js.org/guides/development/#webpack-dev-server).

If you wish to get a similar experience with the application output to disk please use the steps below. This practice will allow you to ensure that serving the contents of your `dist` dir will be closer to how your application will behave when it is deployed.

## Environment Setup
### Install a web server
You will not be using webpack-dev-server, so you will need to install a web server for the browser to request the application. There are many to choose from but a good one to try is [lite-server](https://github.com/johnpapa/lite-server) as it will auto-reload your browser when new files are output.

## Usage
You will need two terminals to get the live-reload experience. The first will run the build in a watch mode to compile the application to the `dist` folder. The second will run the web server against the `dist` folder. The combination of these two processes will mimic the same behavior of ng serve.

### 1st terminal - Start the build
```bash
ng build --watch
```

### 2nd terminal - Start the web server
```bash
lite-server --baseDir="dist"
```
When using `lite-server` the default browser will open to the appropriate URL.
