**Documentation below is deprecated and we no longer accept PRs to improve this. The new documentation is available [here](https://angular.io/guide/build)**.

# Multiple Projects

Angular CLI supports multiple applications within one workspace.

To create another app you can use the following command:
```sh
ng generate application my-other-app
```

The new application will be generated inside `projects/my-other-app`.

Now we can `serve`, `build` etc. both the apps by passing the project name with the commands:

```sh
ng serve my-other-app
```

You can also create libraries, which is detailed in [Create a library](stories/create-library).