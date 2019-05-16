<!-- Links in /docs/documentation should NOT have \`.md\` at the end, because they end up in our wiki at release. -->
**Documentation below is deprecated and we no longer accept PRs to improve this. The new documentation will be available in [angular.io](https://angular.io)**.

# App shell

App shell is a way to render a portion of your application via a route at build time. This gives users a meaningful first paint of your application because the browser does not need to initialize any JavaScript, just rendering the HTML.

## Steps

### Step 1: Prepare the application

An application must be set up with routing. This can be accomplished by running:
```
ng new my-app --routing
```
Or if you have an existing application you can manually add routing by including the RouterModule and defining a `<router-outlet>` within your app.


### Step 2: Create the app shell
```
ng generate app-shell --client-project my-app --universal-project server-app
```
`my-app` is the name of your client application
`server-app` is the name of the universal (or server) application

After running this command you will notice that the `angular.json` configuration file has been updated. Two new targets were added (and a few other changes):
```
"server": {
  "builder": "@angular-devkit/build-angular:server",
  "options": {
    "outputPath": "dist/my-app-server",
    "main": "src/main.server.ts",
    "tsConfig": "src/tsconfig.server.json"
  }
},
"app-shell": {
  "builder": "@angular-devkit/build-angular:app-shell",
  "options": {
    "browserTarget": "my-app:build",
    "serverTarget": "my-app:server",
    "route": "shell"
  }
}
```

### Step 3: Verify the app is built with the shell content

build with the app shell target
```
ng run my-app:app-shell
```
If you would like to build for production you should run the following command
```
ng run my-app:app-shell:production
ng run my-app:app-shell --configuration production
```

Verify the build output
Open dist/index.html
look for text "app-shell works!" which verifies that the app shell route was rendered as part of the output
