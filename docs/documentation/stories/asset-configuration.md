**Documentation below is deprecated and we no longer accept PRs to improve this. The new documentation is available [here](https://angular.io/guide/build)**.

# Project assets

You use the `assets` array inside the build target in `angular.json` to list files or folders
you want to copy as-is when building your project. if you think you need to exclude files, 
consider not putting that thing in the assets

By default, the `src/assets/` folder and `src/favicon.ico` are copied over.

```json
"assets": [
  "src/assets",
  "src/favicon.ico"
]
```

You can also further configure assets to be copied by using objects as configuration.

The array below does the same as the default one:

```json
"assets": [
  { "glob": "**/*", "input": "src/assets/", "output": "/assets/" },
  { "glob": "favicon.ico", "input": "src/", "output": "/" },
]
```

- `glob` is a [node-glob](https://github.com/isaacs/node-glob) using `input` as base directory.
- `input` is relative to the workspace root.
- `ignore` is a list of globs to ignore from copying.
- `output` is relative to `outDir` (`dist/project-name` default).

 You can use this extended configuration to copy assets from outside your project.
 For instance, you can copy assets from a node package:

 ```json
"assets": [
  { "glob": "**/*", "input": "./node_modules/some-package/images", "output": "/some-package/" },
]
```

You can ignore certain files from copying by using the `ignore` option:
 ```json
"assets": [
  { "glob": "**/*", "input": "src/assets/", "ignore": ["**/*.svg"], "output": "/assets/" },
]
```

The contents of `node_modules/some-package/images/` will be available in `dist/some-package/`. 

## Writing assets outside of `dist/`

Because of the security implications, the CLI will always refuse to write files outside of
the project output path.