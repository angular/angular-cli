# Webpack Performance

Angular CLI supports the [webpack2's performance plugin](https://webpack.js.org/configuration/performance/#components/sidebar/sidebar.jsx).
You can set the basic properties in the `.angular-cli.json` file:
```
"performance": {
  "maxAssetSize": 100000,
  "maxEntrypointSize": 400000,
  "hints": "error" // false | "error" | "warning"
}
```