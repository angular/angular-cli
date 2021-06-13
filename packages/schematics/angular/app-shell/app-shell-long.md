An app shell lets Universal render a portion of your application via a route at build time.
This gives users a meaningful first paint of your application that appears quickly
because the browser can simply render the HTML without the need to initialize any JavaScript.

Use this command with a routing app that is accompanied by a Universal server-side app.

To create an app shell, use the following command.

<code-example format="." language="bash">
 ng generate app-shell my-app
</code-example>

- `my-app` is the name of your client application
- `server-app` is the name of the Universal (server) application

The command adds two new architect build targets to your `angular.json` configuration file (along with a few other changes).

<code-example  format="." language="none" linenums="false">
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
</code-example>

To verify the that the app has been built with the default shell content:

1. Run the app-shell target.

   <code-example format="." language="bash">
       ng run my-app:app-shell
    </code-example>

1. Open `dist/app-shell/index.html` in your browser.

The default text "app-shell works!" verifies that the app-shell route was rendered as part of the output.
