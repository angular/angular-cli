<a name="14.1.0-rc.0"></a>

# 14.1.0-rc.0 (2022-07-13)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [2731fe7f6](https://github.com/angular/angular-cli/commit/2731fe7f67f3f2b81fae2f49aabba75436eda250) | fix  | handle cases when completion is enabled and running in an older CLI workspace |
| [669345998](https://github.com/angular/angular-cli/commit/669345998b7720b0e7be53aaee920a385cb8ef86) | fix  | remove deprecation warning of `no` prefixed schema options                    |

### @schematics/angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [b8bf3b480](https://github.com/angular/angular-cli/commit/b8bf3b480bef752641370e542ebb5aee649a8ac6) | fix  | only issue a warning for addDependency existing specifier |
| [14f8f5c5a](https://github.com/angular/angular-cli/commit/14f8f5c5abef19807b3cd2a17aa132117a03a54a) | fix  | remove browserslist configuration                         |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| [248860ad6](https://github.com/angular/angular-cli/commit/248860ad674b54f750bb5c197588bb6d031be208) | feat | add Sass file support to experimental esbuild-based builder                                   |
| [b3a14d056](https://github.com/angular/angular-cli/commit/b3a14d05629ba6e3b23c09b1bfdbc4b35d534813) | fix  | allow third-party sourcemaps to be ignored in esbuild builder                                 |
| [53dd929e5](https://github.com/angular/angular-cli/commit/53dd929e59f98a7088d150e861d18e97e6de4114) | fix  | ensure esbuild builder sourcemap sources are relative to workspace                            |
| [357c45e48](https://github.com/angular/angular-cli/commit/357c45e48431f9a6d79469a48e344dfc0132664f) | fix  | generate different content hashes for scripts which are changed during the optimization phase |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [624e0b0ec](https://github.com/angular/angular-cli/commit/624e0b0ec6d74d87914a2385cc42f0108beebbcc) | fix  | provide actionable warning when a workspace project has missing `root` property |

### @angular/create

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [cfe93fbc8](https://github.com/angular/angular-cli/commit/cfe93fbc89fad2f58826f0118ce7ff421cd0e4f2) | feat | add support for `yarn create` and `npm init` |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Jason Bedard and martinfrancois

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.6"></a>

# 14.0.6 (2022-07-13)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [178550529](https://github.com/angular/angular-cli/commit/1785505290940dad2ef9a62d4725e0d1b4b486d4) | fix  | handle cases when completion is enabled and running in an older CLI workspace |
| [10f24498e](https://github.com/angular/angular-cli/commit/10f24498ec2938487ae80d6ecea584e20b01dcbe) | fix  | remove deprecation warning of `no` prefixed schema options                    |

### @schematics/angular

| Commit                                                                                              | Type | Description                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| [dfa6d73c5](https://github.com/angular/angular-cli/commit/dfa6d73c5c45d3c3276fb1fecfb6535362d180c5) | fix  | remove browserslist configuration |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| [4d848c4e6](https://github.com/angular/angular-cli/commit/4d848c4e6f6944f32b9ecb2cf2db5c544b3894fe) | fix  | generate different content hashes for scripts which are changed during the optimization phase |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [2500f34a4](https://github.com/angular/angular-cli/commit/2500f34a401c2ffb03b1dfa41299d91ddebe787e) | fix  | provide actionable warning when a workspace project has missing `root` property |

## Special Thanks

Alan Agius and martinfrancois

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0-next.4"></a>

# 14.1.0-next.4 (2022-07-06)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [cbccfd426](https://github.com/angular/angular-cli/commit/cbccfd426a2e27c1fd2e274aaee4d02c53eb7c9e) | fix  | during an update only use package manager force option with npm 7+                   |
| [dbe0dc174](https://github.com/angular/angular-cli/commit/dbe0dc174339d872426501c1c1dca689db2b9bad) | fix  | improve error message for project-specific ng commands when run outside of a project |
| [93ba050b0](https://github.com/angular/angular-cli/commit/93ba050b0c6b58274661d2063174920d191a7639) | fix  | show deprecated workspace config options in IDE                                      |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [9e3152466](https://github.com/angular/angular-cli/commit/9e3152466b9b3cdb00450f63399e7b8043250fe7) | fix  | prevent importing `RouterModule` parallel to `RoutingModule` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [7a2460914](https://github.com/angular/angular-cli/commit/7a246091435773ff4d669b1dfe2684b366010919) | fix  | disable glob mounting for patterns that start with a forward slash  |
| [88701115c](https://github.com/angular/angular-cli/commit/88701115c69ced4bbc1bea07e4ef8941a2b54771) | fix  | don't override base-href in HTML when it's not set in builder       |
| [d2bbcd7b6](https://github.com/angular/angular-cli/commit/d2bbcd7b6803fcc9da27f804f12f194110d26eb2) | fix  | improve detection of CommonJS dependencies                          |
| [53e9c459d](https://github.com/angular/angular-cli/commit/53e9c459d6b5fae3884128beaa941c71cd6562cc) | fix  | support hidden component stylesheet sourcemaps with esbuild builder |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [5319428e1](https://github.com/angular/angular-cli/commit/5319428e14a7e364a58caa8ca936964cfc5503cf) | fix  | do not run ngcc when `node_modules` does not exist |

## Special Thanks

Alan Agius, Charles Lyding, JoostK and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.5"></a>

# 14.0.5 (2022-07-06)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [98a6aad60](https://github.com/angular/angular-cli/commit/98a6aad60276960bd6bcecda73172480e4bdec48) | fix  | during an update only use package manager force option with npm 7+                   |
| [094aa16aa](https://github.com/angular/angular-cli/commit/094aa16aaf5b148f2ca94cae45e18dbdeaacad9d) | fix  | improve error message for project-specific ng commands when run outside of a project |
| [e5e07fff1](https://github.com/angular/angular-cli/commit/e5e07fff1919c46c15d6ce61355e0c63007b7d55) | fix  | show deprecated workspace config options in IDE                                      |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [f9f970cab](https://github.com/angular/angular-cli/commit/f9f970cab515a8a1b1fbb56830b03250dd5cccce) | fix  | prevent importing `RouterModule` parallel to `RoutingModule` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [aa8ed532f](https://github.com/angular/angular-cli/commit/aa8ed532f816f2fa23b1fe443a216c5d75507432) | fix  | disable glob mounting for patterns that start with a forward slash  |
| [c76edb8a7](https://github.com/angular/angular-cli/commit/c76edb8a79d1a12376c2a163287251c06e1f0222) | fix  | don't override base-href in HTML when it's not set in builder       |
| [f64903528](https://github.com/angular/angular-cli/commit/f649035286d640660c3bc808b7297fb60d0888bc) | fix  | improve detection of CommonJS dependencies                          |
| [74dbd5fc2](https://github.com/angular/angular-cli/commit/74dbd5fc273aece097b2b3ee0b28607d24479d8c) | fix  | support hidden component stylesheet sourcemaps with esbuild builder |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [7aed97561](https://github.com/angular/angular-cli/commit/7aed97561c2320f92f8af584cc9852d4c8d818b9) | fix  | do not run ngcc when `node_modules` does not exist |

## Special Thanks

Alan Agius, Charles Lyding, JoostK and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0-next.3"></a>

# 14.1.0-next.3 (2022-06-29)

### @angular/cli

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [5a012b5fc](https://github.com/angular/angular-cli/commit/5a012b5fce2f38fa6b97c84c874e85dc726d2f0d) | fix  | correctly handle `--collection` option in `ng new` |
| [8b65abe1b](https://github.com/angular/angular-cli/commit/8b65abe1b037cf00cb3c95ab98f7b6ba3ceef561) | fix  | improve global schema validation                   |
| [4fa039b69](https://github.com/angular/angular-cli/commit/4fa039b692be8bc97d0b382f015783d12f214a65) | fix  | remove color from help epilogue                    |

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [ab8ab30c8](https://github.com/angular/angular-cli/commit/ab8ab30c879f04777b9a444a7f3072682ea161b5) | fix  | use `sourceRoot` instead of `src` in universal schematic |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [ecdbe721a](https://github.com/angular/angular-cli/commit/ecdbe721a1be10a59e7ee1b2f446b20c1e7de95b) | fix  | complete builders on the next event loop iteration |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [4fcfc37cb](https://github.com/angular/angular-cli/commit/4fcfc37cb957513cb61d01946959669559e93393) | fix  | exit dev-server when CTRL+C is pressed                                 |
| [2b962549d](https://github.com/angular/angular-cli/commit/2b962549d3c8c4aa3814f604ef67525822a5e04d) | fix  | exit localized builds when CTRL+C is pressed                           |
| [b40aeed44](https://github.com/angular/angular-cli/commit/b40aeed4414afcb1c90c7f0c609aa78f13790f03) | fix  | hide stacktraces from webpack errors                                   |
| [43f495d57](https://github.com/angular/angular-cli/commit/43f495d57be37fa81cfade3d8e4291483a971f7c) | fix  | set base-href in service worker manifest when using i18n and app-shell |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [7ababc210](https://github.com/angular/angular-cli/commit/7ababc210b3eb023bfd4c8f05178cb2f75472bb2) | fix  | restore process title after NGCC is executed           |
| [34ecf669d](https://github.com/angular/angular-cli/commit/34ecf669ddb05da84f200d6972dbc8439007e1aa) | fix  | show a compilation error on invalid TypeScript version |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard, Paul Gschwendtner, Tim Bowersox and renovate[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.4"></a>

# 14.0.4 (2022-06-29)

### @angular/cli

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [fc72c625b](https://github.com/angular/angular-cli/commit/fc72c625bb7db7b9c8d865086bcff05e2db426ee) | fix  | correctly handle `--collection` option in `ng new` |
| [f5badf221](https://github.com/angular/angular-cli/commit/f5badf221d2a2f5357f93bf0e32146669f8bbede) | fix  | improve global schema validation                   |
| [ed302ea4c](https://github.com/angular/angular-cli/commit/ed302ea4c80b4f6fe8a73c5a0d25055a7dca1db2) | fix  | remove color from help epilogue                    |

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [c58c66c0d](https://github.com/angular/angular-cli/commit/c58c66c0d5c76630453151b65b1a1c3707c82e9f) | fix  | use `sourceRoot` instead of `src` in universal schematic |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [88acec1fd](https://github.com/angular/angular-cli/commit/88acec1fd302d7d8a053e37ed0334ec6a30c952c) | fix  | complete builders on the next event loop iteration |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [694b73dfa](https://github.com/angular/angular-cli/commit/694b73dfa12e5aefff8fc5fdecf220833ac40b42) | fix  | exit dev-server when CTRL+C is pressed                                 |
| [6d4782199](https://github.com/angular/angular-cli/commit/6d4782199c4a4e92a9c0b189d6a7857ca631dd3f) | fix  | exit localized builds when CTRL+C is pressed                           |
| [282baffed](https://github.com/angular/angular-cli/commit/282baffed507926e806db673b6804b9299c383af) | fix  | hide stacktraces from webpack errors                                   |
| [c4b0abf5b](https://github.com/angular/angular-cli/commit/c4b0abf5b8c1e392ead84c8810e8d6e615fd0024) | fix  | set base-href in service worker manifest when using i18n and app-shell |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [33f1cc192](https://github.com/angular/angular-cli/commit/33f1cc192d963b4a4348bb41b8fb0969ffd5c342) | fix  | restore process title after NGCC is executed           |
| [6796998bf](https://github.com/angular/angular-cli/commit/6796998bf4dd829f9ac085a52ce7e9d2cda73fd1) | fix  | show a compilation error on invalid TypeScript version |

## Special Thanks

Alan Agius, Charles Lyding and Tim Bowersox

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0-next.2"></a>

# 14.1.0-next.2 (2022-06-23)

### @angular/cli

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [3884b8652](https://github.com/angular/angular-cli/commit/3884b865262c1ffa5652ac0f4d67bbf59087f453) | fix  | add esbuild browser builder to workspace schema                        |
| [4f31b57df](https://github.com/angular/angular-cli/commit/4f31b57df36da5230dd247791d0875d60b929035) | fix  | disable version check when running `ng completion` commands            |
| [fd92eaa86](https://github.com/angular/angular-cli/commit/fd92eaa86521f6cfd8b90884ce6b2443e9ed571d) | fix  | provide an actionable error when using `--configuration` with `ng run` |
| [ba3f67193](https://github.com/angular/angular-cli/commit/ba3f671936496571337bfb4e18d2ca5d0e56f515) | fix  | temporarily handle boolean options in schema prefixed with `no`        |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [a7709b718](https://github.com/angular/angular-cli/commit/a7709b718c953d83f3bde00fa3bf896501359946) | feat | add `externalDependencies` to the esbuild browser builder     |
| [667799423](https://github.com/angular/angular-cli/commit/66779942358e6faf43f6311e5c59fced3e793e46) | fix  | fix incorrect glob cwd in karma when using `--include` option |
| [0f02b0011](https://github.com/angular/angular-cli/commit/0f02b0011bea5bb7fff935d46768b32455ebb05e) | fix  | handle `codeCoverageExclude` correctly in Windows             |
| [1fc7d4f56](https://github.com/angular/angular-cli/commit/1fc7d4f56b00f6aa6f2ebb4db7675e84c94062a2) | fix  | ignore supported browsers during i18n extraction              |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [1af3f71aa](https://github.com/angular/angular-cli/commit/1af3f71aa26047a6baac815c0495b1a676c2c861) | fix  | workspace writer skip creating empty projects property |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Paul Gschwendtner and renovate[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.3"></a>

# 14.0.3 (2022-06-23)

### @angular/cli

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [b3db91baf](https://github.com/angular/angular-cli/commit/b3db91baf50c92589549a66ffef437f7890d3de7) | fix  | disable version check when running `ng completion` commands            |
| [cdab9fa74](https://github.com/angular/angular-cli/commit/cdab9fa7431db7e2a75e04e776555b8e5e15fc94) | fix  | provide an actionable error when using `--configuration` with `ng run` |
| [5521648e3](https://github.com/angular/angular-cli/commit/5521648e33af634285f6352b43a324a1ee023e27) | fix  | temporarily handle boolean options in schema prefixed with `no`        |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [5e960ce24](https://github.com/angular/angular-cli/commit/5e960ce246e7090f57ce22723911a743aa8fcb0c) | fix  | fix incorrect glob cwd in karma when using `--include` option |
| [1b5e92075](https://github.com/angular/angular-cli/commit/1b5e92075e64563459942d4de785f1a8bef46ec7) | fix  | handle `codeCoverageExclude` correctly in Windows             |
| [ff6d81a45](https://github.com/angular/angular-cli/commit/ff6d81a4539657446c8f5770cefe688d2d578450) | fix  | ignore supported browsers during i18n extraction              |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [170c16f2e](https://github.com/angular/angular-cli/commit/170c16f2ea769e76a48f1ac215ee88ba47ff511d) | fix  | workspace writer skip creating empty projects property |

## Special Thanks

Alan Agius, Charles Lyding and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0-next.1"></a>

# 14.1.0-next.1 (2022-06-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [82ec1af4e](https://github.com/angular/angular-cli/commit/82ec1af4e1e34fe5b18db328b4bce6405a03c7b8) | fix  | show more actionable error when command is ran in wrong scope |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [7cbbf2f2b](https://github.com/angular/angular-cli/commit/7cbbf2f2ba83d27812e9b83859524937dad31fb1) | fix  | remove vscode testing configurations for `minimal` workspaces |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [b06ae5514](https://github.com/angular/angular-cli/commit/b06ae55140c01f8b5107527fd0af1da3b04a721f) | feat | add service worker support to experimental esbuild builder |
| [1f66edebc](https://github.com/angular/angular-cli/commit/1f66edebcc968ed01acd06506226f5cd60c71afe) | fix  | replace fallback locale for `en-US`                        |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard and Julien Marcou

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.2"></a>

# 14.0.2 (2022-06-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [23095e9c3](https://github.com/angular/angular-cli/commit/23095e9c3fc514c7e9a892833d8a18270da5bd95) | fix  | show more actionable error when command is ran in wrong scope |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [5a486cb64](https://github.com/angular/angular-cli/commit/5a486cb64253ba2829160a6f1fa3bf0e381d45ea) | fix  | remove vscode testing configurations for `minimal` workspaces |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| [9d88c96d8](https://github.com/angular/angular-cli/commit/9d88c96d898c5c46575a910a7230d239f4fe7a77) | fix  | replace fallback locale for `en-US` |

## Special Thanks

Alan Agius and Julien Marcou

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.8"></a>

# 13.3.8 (2022-06-15)

### @angular/pwa

| Commit                                                                                              | Type | Description                        |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| [c7f994f88](https://github.com/angular/angular-cli/commit/c7f994f88a396be96c01da1017a15083d5f544fb) | fix  | add peer dependency on Angular CLI |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0-next.0"></a>

# 14.1.0-next.0 (2022-06-08)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [707911d42](https://github.com/angular/angular-cli/commit/707911d423873623d4201d2fbce4a294ab73a135) | feat | support controlling `addDependency` utility rule install behavior |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [526cdb263](https://github.com/angular/angular-cli/commit/526cdb263a8c74ad228f584f70dc029aa69351d7) | feat | allow `chain` rule to accept iterables of rules |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Jason Bedard and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.1"></a>

# 14.0.1 (2022-06-08)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| [e4fb96657](https://github.com/angular/angular-cli/commit/e4fb96657f044d97562008b5b3c6f3a55ac8ba3a) | fix  | add text to help output to indicate that additional commands are available when ran in different context |
| [7952e5790](https://github.com/angular/angular-cli/commit/7952e579066f7191f4b82a10816c6a41a4ea5644) | fix  | avoid creating unnecessary global configuration                                                          |
| [66a1d6b9d](https://github.com/angular/angular-cli/commit/66a1d6b9d2e1fba3d5ee88a6c5d81206f530ce3a) | fix  | correct scope cache command                                                                              |
| [e2d964289](https://github.com/angular/angular-cli/commit/e2d964289fe2a418e5f4e421249e2f8da64185cc) | fix  | correctly print package manager name when an install is needed                                           |
| [75fd3330d](https://github.com/angular/angular-cli/commit/75fd3330d4c27263522ea931eb1545ce0a34ab6a) | fix  | during an update only use package manager force option with npm 7+                                       |
| [e223890c1](https://github.com/angular/angular-cli/commit/e223890c1235b4564ec15eb99d71256791a21c3c) | fix  | ensure full process exit with older local CLI versions                                                   |
| [0cca3638a](https://github.com/angular/angular-cli/commit/0cca3638adb46cd5d0c18b823c83d4b604d7c798) | fix  | handle project being passed as a flag                                                                    |
| [b1451cb5e](https://github.com/angular/angular-cli/commit/b1451cb5e90f43df365202a6fdfcfbc9e0853ca4) | fix  | improve resilience of logging during process exit                                                        |
| [17fec1357](https://github.com/angular/angular-cli/commit/17fec13577ac333fc66c3752c75be58146c9ebac) | fix  | provide actionable error when project cannot be determined                                               |

### @schematics/angular

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [73dcf39c6](https://github.com/angular/angular-cli/commit/73dcf39c6e7678a3915a113fd72829549ccc3b8e) | fix  | remove strict setting under application project |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [c788d5b56](https://github.com/angular/angular-cli/commit/c788d5b56a1a191e7ca53c3b63245e3979a1cf44) | fix  | log modified and removed files when using the `verbose` option |
| [6e8fe0ed5](https://github.com/angular/angular-cli/commit/6e8fe0ed54d88132da0238fdb3a6e97330c85ff7) | fix  | replace dev-server socket path from `/ws` to `/ng-cli-ws`      |
| [651adadf4](https://github.com/angular/angular-cli/commit/651adadf4df8b66c60771f27737cb2a67957b46a) | fix  | update Angular peer dependencies to 14.0 stable                |

### @angular/pwa

| Commit                                                                                              | Type | Description                        |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| [cfd264d06](https://github.com/angular/angular-cli/commit/cfd264d061109c7989933e51a14b6bf83b289b07) | fix  | add peer dependency on Angular CLI |

## Special Thanks

Alan Agius, Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.0"></a>

# 14.0.0 (2022-06-02)

## Breaking Changes

### @angular/cli

- Several changes to the `ng analytics` command syntax.

  - `ng analytics project <setting>` has been replaced with `ng analytics <setting>`
  - `ng analytics <setting>` has been replaced with `ng analytics <setting> --global`

- Support for Node.js v12 has been removed as it will become EOL on 2022-04-30. Please use Node.js v14.15 or later.
- Support for TypeScript 4.4 and 4.5 has been removed. Please update to TypeScript 4.6.
- `--all` option from `ng update` has been removed without replacement. To update packages which don’t provide `ng update` capabilities in your workspace `package.json` use `npm update`, `yarn upgrade-interactive` or `yarn upgrade` instead.
- Deprecated option `--prod` has been removed from all builders. `--configuration production`/`-c production` should be used instead if the default configuration of the builder is not configured to `production`.
- `--configuration` cannot be used with `ng run`. Provide the configuration as part of the target. Ex: `ng run project:builder:configuration`.
- Deprecated `ng x18n` and `ng i18n-extract` commands have been removed in favor of `ng extract-i18n`.
- Several changes in the Angular CLI commands and arguments handling.

  - `ng help` has been removed in favour of the `—-help` option.
  - `ng —-version` has been removed in favour of `ng version` and `ng v`.
  - Deprecated camel cased arguments are no longer supported. Ex. using `—-sourceMap` instead of `—-source-map` will result in an error.
  - `ng update`, `—-migrate-only` option no longer accepts a string of migration name, instead use `—-migrate-only -—name <migration-name>`.
  - `—-help json` help has been removed.

### @angular-devkit/architect-cli

- camel case arguments are no longer allowed.

### @angular-devkit/schematics-cli

- camel case arguments are no longer allowed.

### @angular-devkit/build-angular

- `browser` and `karma` builders `script` and `styles` options input files extensions are now validated.

  Valid extensions for `scripts` are:

  - `.js`
  - `.cjs`
  - `.mjs`
  - `.jsx`
  - `.cjsx`
  - `.mjsx`

  Valid extensions for `styles` are:

  - `.css`
  - `.less`
  - `.sass`
  - `.scss`
  - `.styl`

- We now issue a build time error since importing a CSS file as an ECMA module is non standard Webpack specific feature, which is not supported by the Angular CLI.

  This feature was never truly supported by the Angular CLI, but has as such for visibility.

- Reflect metadata polyfill is no longer automatically provided in JIT mode
  Reflect metadata support is not required by Angular in JIT applications compiled by the CLI.
  Applications built in AOT mode did not and will continue to not provide the polyfill.
  For the majority of applications, the reflect metadata polyfill removal should have no effect.
  However, if an application uses JIT mode and also uses the previously polyfilled reflect metadata JavaScript APIs, the polyfill will need to be manually added to the application after updating.
  To replicate the previous behavior, the `core-js` package should be manually installed and the `import 'core-js/proposals/reflect-metadata';` statement should be added to the application's `polyfills.ts` file.
- `NG_BUILD_CACHE` environment variable has been removed. `cli.cache` in the workspace configuration should be used instead.
- The deprecated `showCircularDependencies` browser and server builder option has been removed. The recommended method to detect circular dependencies in project code is to use either a lint rule or other external tools.

### @angular-devkit/core

- `parseJson` and `ParseJsonOptions` APIs have been removed in favor of 3rd party JSON parsers such as `jsonc-parser`.
- The below APIs have been removed without replacement. Users should leverage other Node.js or other APIs.
  - `fs` namespace
  - `clean`
  - `mapObject`

### @angular-devkit/schematics

- Schematics `NodePackageInstallTask` will not execute package scripts by default
  The `NodePackageInstallTask` will now use the package manager's `--ignore-scripts` option by default.
  The `--ignore-scripts` option will prevent package scripts from executing automatically during an install.
  If a schematic installs packages that need their `install`/`postinstall` scripts to be executed, the
  `NodePackageInstallTask` now contains an `allowScripts` boolean option which can be enabled to provide the
  previous behavior for that individual task. As with previous behavior, the `allowScripts` option will
  prevent the individual task's usage of the `--ignore-scripts` option but will not override the package
  manager's existing configuration.
- Deprecated `analytics` property has been removed from `TypedSchematicContext` interface

### @ngtools/webpack

- `ivy` namespace has been removed from the public API.

  - `ivy.AngularWebpackPlugin` -> `AngularWebpackPlugin`
  - `ivy.AngularPluginOptions` -> `AngularPluginOptions`

## Deprecations

### @angular/cli

- The `defaultCollection` workspace option has been deprecated in favor of `schematicCollections`.

  Before

  ```json
  "defaultCollection": "@angular/material"
  ```

  After

  ```json
  "schematicCollections": ["@angular/material"]
  ```

- The `defaultProject` workspace option has been deprecated. The project to use will be determined from the current working directory.

### @angular-devkit/core

- - `ContentHasMutatedException`, `InvalidUpdateRecordException`, `UnimplementedException` and `MergeConflictException` symbol from `@angular-devkit/core` have been deprecated in favor of the symbol from `@angular-devkit/schematics`.
  - `UnsupportedPlatformException` - A custom error exception should be created instead.

### @angular/cli

| Commit                                                                                              | Type     | Description                                                                        |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| [afafa5788](https://github.com/angular/angular-cli/commit/afafa5788f11b8727c39bb0a390300a706aba5bc) | feat     | add `--global` option to `ng analytics` command                                    |
| [bb550436a](https://github.com/angular/angular-cli/commit/bb550436a476d74705742a8c36f38971b346b903) | feat     | add `ng analytics info` command                                                    |
| [e5bf35ea3](https://github.com/angular/angular-cli/commit/e5bf35ea3061a3e532aa85df44551107e62e24c5) | feat     | add `ng cache` command                                                             |
| [7ab22ed40](https://github.com/angular/angular-cli/commit/7ab22ed40d521e3cec29ab2d66d0289c3cdb4106) | feat     | add disable/enable aliases for off/on `ng analytics` command                       |
| [4212fb8de](https://github.com/angular/angular-cli/commit/4212fb8de2f4f3e80831a0803acc5fc6e54db1e1) | feat     | add prompt to set up CLI autocompletion                                            |
| [0316dea67](https://github.com/angular/angular-cli/commit/0316dea676be522b04d654054880cc5794e3c8b3) | feat     | add prompts on missing builder targets                                             |
| [607a723f7](https://github.com/angular/angular-cli/commit/607a723f7d623ec8a15054722b2afd13042f66a1) | feat     | add support for auto completion                                                    |
| [366cabc66](https://github.com/angular/angular-cli/commit/366cabc66c3dd836e2fdfea8dad6c4c7c2096b1d) | feat     | add support for multiple schematics collections                                    |
| [036327e9c](https://github.com/angular/angular-cli/commit/036327e9ca838f9ef3f117fbd18949d9d357e68d) | feat     | deprecated `defaultProject` option                                                 |
| [fb0622893](https://github.com/angular/angular-cli/commit/fb06228932299870774a7b254f022573f5d8175f) | feat     | don't prompt to set up autocompletion for `ng update` and `ng completion` commands |
| [4ebfe0341](https://github.com/angular/angular-cli/commit/4ebfe03415ebe4e8f1625286d1be8bd1b54d3862) | feat     | drop support for Node.js 12                                                        |
| [022d8c7bb](https://github.com/angular/angular-cli/commit/022d8c7bb142e8b83f9805a39bc1ae312da465eb) | feat     | make `ng completion` set up CLI autocompletion by modifying `.bashrc` files        |
| [2e15df941](https://github.com/angular/angular-cli/commit/2e15df9417dcc47b12785a8c4c9074bf05d0450c) | feat     | remember after prompting users to set up autocompletion and don't prompt again     |
| [7fa3e6587](https://github.com/angular/angular-cli/commit/7fa3e6587955d0638929758d3c257392c242c796) | feat     | support TypeScript 4.6.2                                                           |
| [9e69331fa](https://github.com/angular/angular-cli/commit/9e69331fa61265c77d6281232bb64a2c63509290) | feat     | use PNPM as package manager when `pnpm-lock.yaml` exists                           |
| [6f6b453fb](https://github.com/angular/angular-cli/commit/6f6b453fbf90adad16eba7ea8929a11235c1061b) | fix      | `ng doc` doesn't open browser in Windows                                           |
| [8e66c9188](https://github.com/angular/angular-cli/commit/8e66c9188be827380e5acda93c7e21fae718b9ce) | fix      | `ng g` show descrption from `collection.json` if not present in `schema.json`      |
| [9edeb8614](https://github.com/angular/angular-cli/commit/9edeb86146131878c5e8b21b6adaa24a26f12453) | fix      | add long description to `ng update`                                                |
| [160cb0718](https://github.com/angular/angular-cli/commit/160cb071870602d9e7fece2ce381facb71e7d762) | fix      | correctly handle `--search` option in `ng doc`                                     |
| [d46cf6744](https://github.com/angular/angular-cli/commit/d46cf6744eadb70008df1ef25e24fb1db58bb997) | fix      | display option descriptions during auto completion                                 |
| [09f8659ce](https://github.com/angular/angular-cli/commit/09f8659cedcba70903140d0c3eb5d0e10ebb506c) | fix      | display package manager during `ng update`                                         |
| [a49cdfbfe](https://github.com/angular/angular-cli/commit/a49cdfbfefbdd756882be96fb61dc8a0d374b6e0) | fix      | don't prompt for analytics when running `ng analytics`                             |
| [4b22593c4](https://github.com/angular/angular-cli/commit/4b22593c4a269ea4bd63cef39009aad69f159fa1) | fix      | ensure all available package migrations are executed                               |
| [054ae02c2](https://github.com/angular/angular-cli/commit/054ae02c2fb8eed52af76cf39a432a3770d301e4) | fix      | favor project in cwd when running architect commands                               |
| [ff4eba3d4](https://github.com/angular/angular-cli/commit/ff4eba3d4a9417d2baef70aaa953bdef4bb426a6) | fix      | handle duplicate arguments                                                         |
| [5a8bdeb43](https://github.com/angular/angular-cli/commit/5a8bdeb434c7561334bfc8865ed279110a44bd93) | fix      | hide private schematics from `ng g` help output                                    |
| [644f86d55](https://github.com/angular/angular-cli/commit/644f86d55b75a289e641ba280e8456be82383b06) | fix      | improve error message for Windows autocompletion use cases                         |
| [3012036e8](https://github.com/angular/angular-cli/commit/3012036e81fc6e5fc6c0f1df7ec626f91285673e) | fix      | populate path with working directory in nested schematics                          |
| [8a396de6a](https://github.com/angular/angular-cli/commit/8a396de6a8a58347d2201a43d7f5101f94f20e89) | fix      | print entire config when no positional args are provided to `ng config`            |
| [bdf2b9bfa](https://github.com/angular/angular-cli/commit/bdf2b9bfa9893a940ba254073d024172e0dc1abc) | fix      | print schematic errors correctly                                                   |
| [efc3c3225](https://github.com/angular/angular-cli/commit/efc3c32257a65caf36999dc34cadc41eedcbf323) | fix      | remove analytics prompt postinstall script                                         |
| [bf15b202b](https://github.com/angular/angular-cli/commit/bf15b202bb1cd073fe01cf387dce2c033b5bb14c) | fix      | remove cache path from global valid paths                                          |
| [142da460b](https://github.com/angular/angular-cli/commit/142da460b22e07a5a37b6140b50663446c3a2dbf) | fix      | remove incorrect warning during `ng update`                                        |
| [96a0d92da](https://github.com/angular/angular-cli/commit/96a0d92da2903edfb3835ce86b3700629d6e43ad) | fix      | remove JSON serialized description from help output                                |
| [78460e995](https://github.com/angular/angular-cli/commit/78460e995a192336db3c4be9d0592b4e7a2ff2c8) | fix      | remove type casting and add optional chaining for current in optionTransforms      |
| [e5bdadac4](https://github.com/angular/angular-cli/commit/e5bdadac44ac023363bc0a2473892fc17430b81f) | fix      | skip prompt or warn when setting up autocompletion without a global CLI install    |
| [ca401255f](https://github.com/angular/angular-cli/commit/ca401255f49568cfe5f9ec6a35ea5b91c91afa70) | fix      | sort commands in help output                                                       |
| [b97772dfc](https://github.com/angular/angular-cli/commit/b97772dfc03401fe1faa79e77742905341bd5d46) | fix      | support silent package installs with Yarn 2+                                       |
| [87cd5cd43](https://github.com/angular/angular-cli/commit/87cd5cd4311e71a15ea1ecb82dde7480036cb815) | fix      | workaround npm 7+ peer dependency resolve errors during updates                    |
| [d94a67353](https://github.com/angular/angular-cli/commit/d94a67353dcdaa30cf5487744a7ef151a6268f2d) | refactor | remove deprecated `--all` option from `ng update`                                  |
| [2fc7c73d7](https://github.com/angular/angular-cli/commit/2fc7c73d7e40dbb0a593df61eeba17c8a8f618a9) | refactor | remove deprecated `--prod` flag                                                    |
| [b69ca3a7d](https://github.com/angular/angular-cli/commit/b69ca3a7d22b54fc06fbc1cfb559b2fd915f5609) | refactor | remove deprecated command aliases for `extract-i18n`.                              |
| [2e0493130](https://github.com/angular/angular-cli/commit/2e0493130acfe7244f7ee3ef28c961b1b04d7722) | refactor | replace command line arguments parser                                              |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [7b78b7840](https://github.com/angular/angular-cli/commit/7b78b7840e95b0f4dca2fcb9218b67dd7500ff2c) | feat | add --standalone to ng generate                                           |
| [e49220fba](https://github.com/angular/angular-cli/commit/e49220fba0d158be0971989e26eb199ec02fa113) | feat | add migratiom to remove `defaultProject` in workspace config              |
| [3fa38b08b](https://github.com/angular/angular-cli/commit/3fa38b08ba8ef57a6079873223a7d6088d5ea64e) | feat | introduce `addDependency` rule to utilities                               |
| [b07ccfbb1](https://github.com/angular/angular-cli/commit/b07ccfbb1b2045d285c23dd4b654e1380892fcb2) | feat | introduce a utility subpath export for Angular rules and utilities        |
| [7e7de6858](https://github.com/angular/angular-cli/commit/7e7de6858dd71bd461ceb0f89e29e2c57099bbcc) | feat | update Angular dependencies to use `^` as version prefix                  |
| [69ecddaa7](https://github.com/angular/angular-cli/commit/69ecddaa7d8b01aa7a9e61c403a4b9a8669e34c4) | feat | update new and existing projects compilation target to `ES2020`           |
| [7e8e42063](https://github.com/angular/angular-cli/commit/7e8e42063f354c402d758f10c8ba9bee7e0c8aff) | fix  | add migration to remove `package.json` in libraries secondary entrypoints |
| [b928d973e](https://github.com/angular/angular-cli/commit/b928d973e97f33220afe16549b41c4031feb5c5e) | fix  | alphabetically order imports during component generation                  |
| [09a71bab6](https://github.com/angular/angular-cli/commit/09a71bab6044e517319f061dbd4555ce57fe6485) | fix  | Consolidated setup with a single `beforeEach()`                           |
| [1921b07ee](https://github.com/angular/angular-cli/commit/1921b07eeb710875825dc6f7a4452bd5462e6ba7) | fix  | don't add path mapping to old entrypoint definition file                  |
| [c927c038b](https://github.com/angular/angular-cli/commit/c927c038ba356732327a026fe9a4c36ed23c9dec) | fix  | remove `@types/node` from new projects                                    |
| [27cb29438](https://github.com/angular/angular-cli/commit/27cb29438aa01b185b2dca3617100d87f45f14e8) | fix  | remove extra space in standalone imports                                  |

### @angular-devkit/architect-cli

| Commit                                                                                              | Type     | Description                      |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| [c7556b62b](https://github.com/angular/angular-cli/commit/c7556b62b7b0eab5717ed6eeab3fa7f0f1f2a873) | refactor | replace parser with yargs-parser |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type     | Description                      |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| [5330d52ae](https://github.com/angular/angular-cli/commit/5330d52aee32daca27fa1a2fa15712f4a408602a) | refactor | replace parser with yargs-parser |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                    |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| [00186fb93](https://github.com/angular/angular-cli/commit/00186fb93f66d8da51886de37cfa4599f3e89af9) | feat     | add initial experimental esbuild-based application browser builder             |
| [d23a168b8](https://github.com/angular/angular-cli/commit/d23a168b8d558ae9d73c8c9eed4ff199fc4d74b9) | feat     | validate file extensions for `scripts` and `styles` options                    |
| [2adf252dc](https://github.com/angular/angular-cli/commit/2adf252dc8a7eb0ce504de771facca56730e5272) | fix      | add es2015 exports package condition to browser-esbuild                        |
| [72e820e7b](https://github.com/angular/angular-cli/commit/72e820e7b2bc6904b030f1092bbb610334a4036f) | fix      | better handle Windows paths in esbuild experimental builder                    |
| [587082fb0](https://github.com/angular/angular-cli/commit/587082fb0fa7bdb6cddb36327f791889d76e3e7b) | fix      | close compiler on Karma exit                                                   |
| [c52d10d1f](https://github.com/angular/angular-cli/commit/c52d10d1fc4b70483a2043edfa73dc0f323f6bf1) | fix      | close dev-server on error                                                      |
| [48630ccfd](https://github.com/angular/angular-cli/commit/48630ccfd7a672fc5174ef484b3bd5c549d32fef) | fix      | detect `tailwind.config.cjs` as valid tailwindcss configuration                |
| [4d5f6c659](https://github.com/angular/angular-cli/commit/4d5f6c65918c1a8a4bde0a0af01089242d1cdc4a) | fix      | downlevel libraries based on the browserslist configurations                   |
| [1a160dac0](https://github.com/angular/angular-cli/commit/1a160dac00f34aab089053281c640dba3efd597f) | fix      | ensure karma sourcemap support on Windows                                      |
| [07e776ea3](https://github.com/angular/angular-cli/commit/07e776ea379a50a98a50cf590156c2dc1b272e78) | fix      | fail build when importing CSS files as an ECMA modules                         |
| [ac1383f9e](https://github.com/angular/angular-cli/commit/ac1383f9e5d491181812c090bd4323f46110f3d8) | fix      | properly handle locally-built APF v14 libraries                                |
| [966d25b55](https://github.com/angular/angular-cli/commit/966d25b55eeb6cb84eaca183b30e7d3b0d0a2188) | fix      | remove unneeded JIT reflect metadata polyfill                                  |
| [b8564a638](https://github.com/angular/angular-cli/commit/b8564a638df3b6971ef2ac8fb838e6a7c910ac3b) | refactor | remove deprecated `NG_BUILD_CACHE` environment variable                        |
| [0a1cd584d](https://github.com/angular/angular-cli/commit/0a1cd584d8ed00889b177f4284baec7e5427caf2) | refactor | remove deprecated `showCircularDependencies` browser and server builder option |

### @angular-devkit/core

| Commit                                                                                              | Type     | Description                                               |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [c5b3e9299](https://github.com/angular/angular-cli/commit/c5b3e9299130132aecfa19219405e1964d0c5443) | refactor | deprecate unused exception classes                        |
| [67144b9e5](https://github.com/angular/angular-cli/commit/67144b9e54b5a9bfbc963e386b01275be5eaccf5) | refactor | remove deprecated `parseJson` and `ParseJsonOptions` APIs |
| [a0c02af7e](https://github.com/angular/angular-cli/commit/a0c02af7e340bb16f4e6f523c2d835c9b18926b3) | refactor | remove deprecated fs, object and array APIs               |

### @angular-devkit/schematics

| Commit                                                                                              | Type     | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| [c9c781c7d](https://github.com/angular/angular-cli/commit/c9c781c7d5f3c6de780912fd7c624a457e6da14c) | feat     | add parameter to `listSchematicNames` to allow returning hidden schematics. |
| [0e6425fd8](https://github.com/angular/angular-cli/commit/0e6425fd88ea32679516251efdca6ff07cc4b56a) | feat     | disable package script execution by default in `NodePackageInstallTask`     |
| [25498ad5b](https://github.com/angular/angular-cli/commit/25498ad5b2ba6fa5a88c9802ddeb0ed85c5d9b60) | feat     | re-export core string helpers from schematics package                       |
| [464cf330a](https://github.com/angular/angular-cli/commit/464cf330a14397470e1e57450a77f421a45a927e) | feat     | support null for options parameter from OptionTransform type                |
| [33f9f3de8](https://github.com/angular/angular-cli/commit/33f9f3de869bba2ecd855a01cc9a0a36651bd281) | feat     | support reading JSON content directly from a Tree                           |
| [01297f450](https://github.com/angular/angular-cli/commit/01297f450387dea02eafd6f5701c417ab5c5d844) | feat     | support reading text content directly from a Tree                           |
| [48f9b79bc](https://github.com/angular/angular-cli/commit/48f9b79bc4d43d0180bab5af5726621a68204a15) | fix      | support ignore scripts package installs with Yarn 2+                        |
| [3471cd6d8](https://github.com/angular/angular-cli/commit/3471cd6d8696ae9c28dba901d3e0f6868d69efc8) | fix      | support quiet package installs with Yarn 2+                                 |
| [44c1e6d0d](https://github.com/angular/angular-cli/commit/44c1e6d0d2db5f2dc212d63a34ade045cb7854d5) | refactor | remove deprecated `analytics` property                                      |

### @angular/pwa

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [243cb4062](https://github.com/angular/angular-cli/commit/243cb40622fef4107b0162bc7b6a374471cebc14) | fix  | remove `@schematics/angular` utility deep import usage |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description                                      |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| [0c344259d](https://github.com/angular/angular-cli/commit/0c344259dcdc10a35840151bfe3ae1b27f9b53ff) | fix      | update peer dependency to reflect TS 4.6 support |
| [044101554](https://github.com/angular/angular-cli/commit/044101554dfbca07d74f2a4391f94875df7928d2) | perf     | use Webpack's built-in xxhash64 support          |
| [9277eed1d](https://github.com/angular/angular-cli/commit/9277eed1d9603d5e258eb7ae27de527eba919482) | refactor | remove deprecated ivy namespace                  |

## Special Thanks

Adrien Crivelli, Alan Agius, Charles Lyding, Cédric Exbrayat, Daniil Dubrava, Doug Parker, Elton Coelho, George Kalpakas, Jason Bedard, Joey Perrott, Kristiyan Kostadinov, Paul Gschwendtner, Pawel Kozlowski, Tobias Speicher and alkavats1

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.7"></a>

# 13.3.7 (2022-05-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [a54018d8f](https://github.com/angular/angular-cli/commit/a54018d8f5f976034bf0a33f826245b7a6b74bbe) | fix  | add debugging and timing information in JavaScript and CSS optimization plugins |

## Special Thanks

Alan Agius and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.6"></a>

# 13.3.6 (2022-05-18)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| [e20964c43](https://github.com/angular/angular-cli/commit/e20964c43c52125b6d2bfa9bbea444fb2eea1e15) | fix  | resolve relative schematic from `angular.json` instead of current working directory |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                    |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------ |
| [16fec8d58](https://github.com/angular/angular-cli/commit/16fec8d58b6ec421df5e7809c45838baf232b4a9) | fix  | update `babel-loader` to 8.2.5 |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.5"></a>

# 13.3.5 (2022-05-04)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [6da0910d3](https://github.com/angular/angular-cli/commit/6da0910d345eb84084e32a462432a508d518f402) | fix  | update `@ampproject/remapping` to `2.2.0` |

## Special Thanks

Alan Agius, Charles Lyding and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.4"></a>

# 13.3.4 (2022-04-27)

### @angular/cli

| Commit                                                                                              | Type | Description                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| [f4da75656](https://github.com/angular/angular-cli/commit/f4da756560358273098df2a5cae7848201206c77) | fix  | change wrapping of schematic code |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [5d0141bfb](https://github.com/angular/angular-cli/commit/5d0141bfb4ae80b1a7543eab64e9c381c932eaef) | fix  | correctly resolve custom service worker configuration file |

## Special Thanks

Charles Lyding and Wagner Maciel

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.3"></a>

# 13.3.3 (2022-04-13)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [d38b247cf](https://github.com/angular/angular-cli/commit/d38b247cf19edf5ecf7792343fa2bc8c05a3a8b8) | fix  | display debug logs when using the `--verbose` option |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                 |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------- |
| [5682baee4](https://github.com/angular/angular-cli/commit/5682baee4b562b314dad781403dcc0c46e0a8abb) | fix  | emit devserver setup errors |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.2"></a>

# 13.3.2 (2022-04-06)

### @angular/cli

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [49dc63d09](https://github.com/angular/angular-cli/commit/49dc63d09a7a7f2b7759b47e79fac934b867e9b4) | fix  | ensure lint command auto-add exits after completion |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [bbe74b87e](https://github.com/angular/angular-cli/commit/bbe74b87e52579c06b911db6173f33c67b8010a6) | fix  | provide actionable error message when routing declaration cannot be found |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [c97c8e7c9](https://github.com/angular/angular-cli/commit/c97c8e7c9bbcad66ba80967681cac46042c3aca7) | fix  | update `minimatch` dependency to `3.0.5` |

## Special Thanks

Alan Agius, Charles Lyding and Morga Cezary

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.1"></a>

# 13.3.1 (2022-03-30)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| [cf3cb2ecf](https://github.com/angular/angular-cli/commit/cf3cb2ecf9ca47a984c4272f0094f2a1c68c7dfe) | fix  | fix extra comma added when use --change-detection=onPush and --style=none to generate a component |

### @angular-devkit/architect-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [9f8d4dea0](https://github.com/angular/angular-cli/commit/9f8d4dea0449e236de7b928c5cc97e597a6f5844) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [ba3486de9](https://github.com/angular/angular-cli/commit/ba3486de94e733addf0ac17706b806dd813c9046) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/benchmark

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [1f7fa6970](https://github.com/angular/angular-cli/commit/1f7fa6970e8cddb2ba0c42df0e048a57292b7fe8) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [293526c31](https://github.com/angular/angular-cli/commit/293526c31db9f0becc0ffc2d60999c80afa8a308) | fix  | add `node_modules` prefix to excludes RegExp   |
| [58ed97410](https://github.com/angular/angular-cli/commit/58ed97410b760909d523b05c3b4a06364e3c9a0f) | fix  | allow Workers in Stackblitz                    |
| [4cd2331d3](https://github.com/angular/angular-cli/commit/4cd2331d34e2a9ab2ed78edf0284dbfefef511a5) | fix  | don't override asset info when updating assets |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [c7c75820f](https://github.com/angular/angular-cli/commit/c7c75820f1d4ef827336626b78c8c3e5c0bd1f00) | fix  | add Angular CLI major version as analytics dimension |

## Special Thanks

Alan Agius and gauravsoni119

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.17"></a>

# 12.2.17 (2022-03-31)

### @angular-devkit/architect-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [ccb0f95f3](https://github.com/angular/angular-cli/commit/ccb0f95f33ff0d23a0ff9b237d0d78fc4c864787) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [abcdf4df2](https://github.com/angular/angular-cli/commit/abcdf4df20c29907ee28a38842942464addcf259) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/benchmark

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [2656a330e](https://github.com/angular/angular-cli/commit/2656a330eb365f37c3b6f8894436b4449d157e63) | fix  | update `minimist` to `1.2.6` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="11.2.19"></a>

# 11.2.19 (2022-03-30)

### @angular-devkit/architect-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [75caa1143](https://github.com/angular/angular-cli/commit/75caa1143f4007c9550ab0dabb62ae4df91e3827) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [80d479e9f](https://github.com/angular/angular-cli/commit/80d479e9fdfcf6863ebbe0986ea6cd29309f398d) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/benchmark

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [f61cd1a79](https://github.com/angular/angular-cli/commit/f61cd1a79b6960711d4aa5b16d04308bbdc67beb) | fix  | update `minimist` to `1.2.6` |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.0"></a>

# 13.3.0 (2022-03-16)

### @angular/cli

| Commit                                                                                              | Type | Description            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| [c995ed5e8](https://github.com/angular/angular-cli/commit/c995ed5e8a8e1b20cf376f4c48c5141fd5f4548a) | feat | support TypeScript 4.6 |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.6"></a>

# 13.2.6 (2022-03-09)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [90a5531b1](https://github.com/angular/angular-cli/commit/90a5531b1fbe4043ab47f921ad6b858d34e7c7d0) | fix  | ignore css only chunks during naming |

## Special Thanks

Alan Agius, Charles Lyding and Daniele Maltese

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.5"></a>

# 13.2.5 (2022-02-23)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                           |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------- |
| [acf1e5e4a](https://github.com/angular/angular-cli/commit/acf1e5e4a5b359be125272f7e4055208116a13d8) | fix  | don't rename blocks which have a name |
| [7a493979c](https://github.com/angular/angular-cli/commit/7a493979ccb71e974d668fca67d75e1b194f8608) | fix  | update `terser` to `5.11.0`           |

## Special Thanks

Alan Agius and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.4"></a>

# 13.2.4 (2022-02-17)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [48c655ac9](https://github.com/angular/angular-cli/commit/48c655ac98e1d69622dd832c6a915c48e703cd8f) | fix  | update `esbuild` to `0.14.22`          |
| [c0736ea0b](https://github.com/angular/angular-cli/commit/c0736ea0b173861bb5ceb9315d27038eb28535e1) | fix  | update license-webpack-plugin to 4.0.2 |

## Special Thanks

Alan Agius, Anner Visser and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.3"></a>

# 13.2.3 (2022-02-09)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| [8c8377fee](https://github.com/angular/angular-cli/commit/8c8377fee4999266f4e58bf3c3091100d4393df7) | fix  | block Karma from starting until build is complete |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [1317e470e](https://github.com/angular/angular-cli/commit/1317e470ec74d1dd9dced2d0ec0022abfe921995) | fix  | support locating PNPM lock file during NGCC processing |

## Special Thanks

Alan Agius, Derek Cormier and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.2"></a>

# 13.2.2 (2022-02-02)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [cc5505cfc](https://github.com/angular/angular-cli/commit/cc5505cfcf12732fad4f85e6e76c8e4f0584c13a) | fix  | add `whatwg-url` to downlevel exclusion list              |
| [ff54b49e7](https://github.com/angular/angular-cli/commit/ff54b49e7097cda2eb835bc8c9674f71fcc91c3c) | fix  | ensure to use content hash as filenames hashing mechanism |
| [b0e2bb289](https://github.com/angular/angular-cli/commit/b0e2bb289050efc77478a0f50778abbec9c5a318) | perf | update `license-webpack-plugin` to `4.0.1`                |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [c8826a973](https://github.com/angular/angular-cli/commit/c8826a9738f860e374bd65a058c6be1b02545133) | fix  | correctly resolve schema references defaults |

## Special Thanks

Alan Agius, Derek Cormier and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.1"></a>

# 13.2.1 (2022-01-31)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| [acd752773](https://github.com/angular/angular-cli/commit/acd752773d85e4debbc2b415c7ea369bc3d7018a) | fix  | invalid browsers version ranges |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.0"></a>

# 13.2.0 (2022-01-26)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [41a828e20](https://github.com/angular/angular-cli/commit/41a828e2068b881f744846c3f0edbff8c62cb9ce) | fix  | updated Angular new project version to v13.2.0-next.0 |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------- |
| [f2c6b2b7e](https://github.com/angular/angular-cli/commit/f2c6b2b7ec88a1b7e45884b38faa0978af1b4b74) | fix  | correctly handle ESM builders |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [cbe028e37](https://github.com/angular/angular-cli/commit/cbe028e37c8af6f2e17cbbeddc968c9410151bbb) | feat | expose i18nDuplicateTranslation option of browser and server builders |
| [509322b62](https://github.com/angular/angular-cli/commit/509322b6214b3425bd209087ac99ee9b14edeaba) | fix  | Don't use TAILWIND_MODE=watch                                         |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [820ff2a3e](https://github.com/angular/angular-cli/commit/820ff2a3e84c5a55e23359e3a45714db83362a2a) | fix  | correctly handle ESM webpack configurations |

## Special Thanks

Alan Agius, Cédric Exbrayat, Derek Cormier, Doug Parker, Joey Perrott, Jordan Pittman, grant-wilson and minijus

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.4"></a>

# 13.1.4 (2022-01-19)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [2f2069dba](https://github.com/angular/angular-cli/commit/2f2069dbaa70c3d4725923f1c3ccbf56b1f57576) | fix  | disable parsing `new URL` syntax                      |
| [bddd0fb9f](https://github.com/angular/angular-cli/commit/bddd0fb9f34a8706dd1646952eed08970b9cddbe) | fix  | support ESNext as target for JavaScript optimizations |

## Special Thanks

Alan Agius, Derek Cormier and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.3"></a>

# 13.1.3 (2022-01-12)

### @angular/cli

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [4c9d72c65](https://github.com/angular/angular-cli/commit/4c9d72c659d912bd9ef4590a2e88340932a96868) | fix  | remove extra space in `Unable to find compatible package` during `ng add` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [9b07191b1](https://github.com/angular/angular-cli/commit/9b07191b1ccdcd2a6bb17686471acddd5862dcf5) | fix  | set `skipTest` flag for resolvers when using ng new --skip-tests |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [5b39e0eca](https://github.com/angular/angular-cli/commit/5b39e0eca6e8a3825f66ad6cd1818e551bf98f08) | fix  | automatically purge stale build cache entries          |
| [6046e06b9](https://github.com/angular/angular-cli/commit/6046e06b926af29f89c605504f5356ec553c6390) | fix  | correctly resolve `core-js/proposals/reflect-metadata` |
| [de68daa55](https://github.com/angular/angular-cli/commit/de68daa5581dd1f257382da16704d442b540ec41) | fix  | enable `:where` CSS pseudo-class                       |
| [6a617ff4a](https://github.com/angular/angular-cli/commit/6a617ff4a2fe75968965dc5dcf0f3ba7bae92935) | fix  | ensure `$localize` calls are replaced in watch mode    |
| [92b4e067b](https://github.com/angular/angular-cli/commit/92b4e067b24bdcd1bb7e40612b5355ce61e040ce) | fix  | load translations fresh start                          |
| [d674dcd1a](https://github.com/angular/angular-cli/commit/d674dcd1af409910dd4f41ac676349aee363ebdb) | fix  | localized bundle generation fails in watch mode        |
| [6876ad36e](https://github.com/angular/angular-cli/commit/6876ad36efaadac5c4d371cff96c9a4cfa0e3d2b) | fix  | use `contenthash` instead of `chunkhash` for chunks    |
| [11fd02105](https://github.com/angular/angular-cli/commit/11fd02105908e155c4a9c7f87e9641127cc2f378) | fix  | websocket client only injected if required             |
| [6ca0e41a9](https://github.com/angular/angular-cli/commit/6ca0e41a9b54aef0a8ea626be73e06d19370f3a7) | perf | update `esbuild` to `0.14.11`                          |

## Special Thanks

Alan Agius, Bill Barry, Derek Cormier, Elio Goettelmann, Joey Perrott, Kasper Christensen, Lukas Spirig and Zoltan Lehoczky

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.15"></a>

# 12.2.15 (2022-01-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [526115fdb](https://github.com/angular/angular-cli/commit/526115fdb7d35ff01f5dbdb6027d9f5e925e4056) | fix  | updated webpack-dev-server to latest security patch |

## Special Thanks

Doug Parker and iRealNirmal

<a name="11.2.18"></a>

# 11.2.18 (2022-01-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [534678450](https://github.com/angular/angular-cli/commit/534678450196a45610e88a85ee01317aa43dc788) | fix  | updated webpack-dev-server to latest security patch |

## Special Thanks

Doug Parker and iRealNirmal

<a name="13.2.0-next.1"></a>

# 13.2.0-next.1 (2021-12-15)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [41a828e20](https://github.com/angular/angular-cli/commit/41a828e2068b881f744846c3f0edbff8c62cb9ce) | fix  | updated Angular new project version to v13.2.0-next.0 |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [0323a35b4](https://github.com/angular/angular-cli/commit/0323a35b47a4a2fd3870b09d46e3655714e50abd) | fix  | add `tailwindcss` support for version 3                       |
| [471930007](https://github.com/angular/angular-cli/commit/471930007cb9cd26264eab483fdfd1f5b4db6641) | fix  | display FS cache information when `verbose` option is used    |
| [f1d2873ca](https://github.com/angular/angular-cli/commit/f1d2873ca7ee337748366d04878514c2c27a72a2) | fix  | only extract CSS styles when are specified in `styles` option |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [b03b9eefe](https://github.com/angular/angular-cli/commit/b03b9eefeac77b93931803de208118e3a6c5a928) | perf | reduce redudant module rebuilds when cache is restored |

## Special Thanks

Alan Agius, Cédric Exbrayat, Derek Cormier and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.2"></a>

# 13.1.2 (2021-12-15)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [1ddbd75ae](https://github.com/angular/angular-cli/commit/1ddbd75ae200c14b5f33556bd6d5ae6b7722d14e) | fix  | add `tailwindcss` support for version 3                       |
| [adf925c07](https://github.com/angular/angular-cli/commit/adf925c0755b6e78a57932becdb7b7a764afb9e6) | fix  | display FS cache information when `verbose` option is used    |
| [09c3826c9](https://github.com/angular/angular-cli/commit/09c3826c9d9128a6b520d0fe8da3cb466d18cddc) | fix  | only extract CSS styles when are specified in `styles` option |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [f31d7f79d](https://github.com/angular/angular-cli/commit/f31d7f79dfa8f997fecdcfec1ebc6cfbe657f3fb) | perf | reduce redudant module rebuilds when cache is restored |

## Special Thanks

Alan Agius, Derek Cormier and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="11.2.17"></a>

# 11.2.17 (2021-12-16)

### @angular/cli

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [1efff8f82](https://github.com/angular/angular-cli/commit/1efff8f82df38b7485f8a8dcdd5bfea5a457c6a1) | fix  | exclude deprecated packages with removal migration from update |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="11.2.16"></a>

# 11.2.16 (2021-12-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [f456b0962](https://github.com/angular/angular-cli/commit/f456b0962b9f339759bc86c092256f68d68d9ecf) | fix  | error when updating Angular packages across multi-major migrations                        |
| [886d2511e](https://github.com/angular/angular-cli/commit/886d2511e292b687acce1ac4c6924f992494d14f) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |
| [776d1210a](https://github.com/angular/angular-cli/commit/776d1210a9e62bf2531d977138f49f93820a8b87) | fix  | update `ng update` output for Angular packages                                            |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="10.2.4"></a>

# 10.2.4 (2021-12-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [745d77728](https://github.com/angular/angular-cli/commit/745d777288a5ae0e79b4ecdf7b8483f242ba8e66) | fix  | error when updating Angular packages across multi-major migrations                        |
| [460ea21b5](https://github.com/angular/angular-cli/commit/460ea21b5d4b8759a3f7457b885110022dd21dfc) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |
| [03da12899](https://github.com/angular/angular-cli/commit/03da1289996790ae574a49bb46123c74417a97c2) | fix  | update `ng update` output for Angular packages                                            |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [d6582d489](https://github.com/angular/angular-cli/commit/d6582d48944f7bf169f3902e4c19186a6751f473) | fix  | change `karma-jasmine-html-reporter` dependency to use tilde |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.1"></a>

# 13.1.1 (2021-12-10)

### @schematics/angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [a315b968a](https://github.com/angular/angular-cli/commit/a315b968a36e6aae990e52d9a18673fef9b5fda6) | fix  | updated Angular new project version to v13.1.0 |

## Special Thanks

Alan Agius, Cédric Exbrayat and Derek Cormier

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.0"></a>

# 13.1.0 (2021-12-09)

### @angular/cli

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [56f802b7d](https://github.com/angular/angular-cli/commit/56f802b7dd26bfc774b6b00982a1dbbe0bafddd0) | feat | ask to install angular-eslint when running ng lint in new projects |
| [ecd9fb5c7](https://github.com/angular/angular-cli/commit/ecd9fb5c774b6301348c4514da04d58ae8903d06) | feat | provide more detailed error for not found builder                  |
| [0b6071af3](https://github.com/angular/angular-cli/commit/0b6071af3a51e7d3f38a661bd4e0a3c3e81aff2f) | fix  | `ng doc` does open browser on Windows                              |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [d5d9f042f](https://github.com/angular/angular-cli/commit/d5d9f042f2ea42573b7ff4fab90cab85d0c5ec0b) | feat | add VS Code configurations when generating a new workspace |
| [f95cc8281](https://github.com/angular/angular-cli/commit/f95cc8281a64bd9ac19e0fa5d92cb0a6ee8c32ec) | feat | generate new projects using TypeScript 4.5                 |
| [21809e14c](https://github.com/angular/angular-cli/commit/21809e14cd5c666c82fdaebc9e601341dfb76d0a) | feat | loosen project name validation                             |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [339bab06c](https://github.com/angular/angular-cli/commit/339bab06cc25863571acb09cb3e877fed14ca2f9) | feat | generate new projects using TypeScript 4.5 |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [bc8563760](https://github.com/angular/angular-cli/commit/bc856376039287cf5fb6135ca5da65a9000f5664) | feat | add estimated transfer size to build output report                              |
| [bc17cf0cd](https://github.com/angular/angular-cli/commit/bc17cf0cdd02bf50758e510756a26e6e6ca32d14) | feat | colorize file raw sizes based on failing budgets                                |
| [3c681b68d](https://github.com/angular/angular-cli/commit/3c681b68d7a32f1cfaf3feee6b2e02cc6e0f0568) | feat | set `dir` attribute when using localization                                     |
| [6d0f99a2d](https://github.com/angular/angular-cli/commit/6d0f99a2deef957c15836c172b9f68f716f836a4) | feat | support JSON comments in dev-server proxy configuration file                    |
| [9300545e6](https://github.com/angular/angular-cli/commit/9300545e6148b4548cc02bb6a311a2f0e2bb79c5) | feat | watch i18n translation files with dev server                                    |
| [9bacba342](https://github.com/angular/angular-cli/commit/9bacba3420cda7897091522415a8d55cf1b75106) | fix  | differentiate components and global styles using file query instead of filename |
| [7408511da](https://github.com/angular/angular-cli/commit/7408511da555f37560ca7e3b536e15dfc8f6a1e5) | fix  | display cleaner errors                                                          |
| [d55fc62ef](https://github.com/angular/angular-cli/commit/d55fc62ef2f8bc7a6f1190f56f8e8b64c9195263) | fix  | fallback to use language ID to set the `dir` attribute                          |
| [4c288b8bd](https://github.com/angular/angular-cli/commit/4c288b8bd28e7215887aa52025c4fa41fcf7bc01) | fix  | lazy modules bundle budgets                                                     |
| [562dc6a89](https://github.com/angular/angular-cli/commit/562dc6a8924826509d9012b2c0fe61c089077399) | fix  | prefer ES2015 entrypoints when application targets ES2019 or lower              |
| [ac66e400c](https://github.com/angular/angular-cli/commit/ac66e400cddc81bde46949d1abe4560185dfbedb) | fix  | Sass compilation in StackBlitz webcontainers                                    |
| [e1bac5bbb](https://github.com/angular/angular-cli/commit/e1bac5bbb36f391b89445ba61abe561c75746f30) | fix  | update Angular peer dependencies to v13.1 prerelease                            |
| [789ddfaeb](https://github.com/angular/angular-cli/commit/789ddfaeb0fcbc9aab1581384b88c3618e606c4b) | perf | disable webpack backwards compatible APIs                                       |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [5402f99f8](https://github.com/angular/angular-cli/commit/5402f99f8ad20e0a57456a416a992415fc6332bd) | fix  | add `cjs` and `mjs` to passthrough files                 |
| [10d4ede2d](https://github.com/angular/angular-cli/commit/10d4ede2de42dfc302dcb4c5790274290170568d) | fix  | handle promise rejection during Angular program analyzes |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Ferdinand Malcher, Joey Perrott and Ruslan Lekhman

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.14"></a>

# 12.2.14 (2021-12-07)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [30295b33e](https://github.com/angular/angular-cli/commit/30295b33ed74667f31e9d3a4a0017910a85fd734) | fix  | error when updating Angular packages across multi-major migrations                        |
| [e07bd059e](https://github.com/angular/angular-cli/commit/e07bd059e3d6bc6b40191c036c467595ed119da7) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |
| [ce1ec0420](https://github.com/angular/angular-cli/commit/ce1ec0420770a8e28c1c1301df9e5eb4548d4c53) | fix  | update `ng update` output for Angular packages                                            |
| [dd9f8df52](https://github.com/angular/angular-cli/commit/dd9f8df5204d639272f183795ebd48d7994df427) | fix  | update `pacote` to `12.0.2`                                                               |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.4"></a>

# 13.0.4 (2021-12-01)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [ded7b5c06](https://github.com/angular/angular-cli/commit/ded7b5c069a145d1b3e264538d7c4302919ad030) | fix  | exit with a non-zero error code when migration fails during `ng update`                   |
| [250a58b48](https://github.com/angular/angular-cli/commit/250a58b4820a738aba7609627fa7fce0a24f10db) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [372e2e633](https://github.com/angular/angular-cli/commit/372e2e633f4bd9bf29c35d02890e1c6a70da3169) | fix  | address eslint linting failures in `test.ts` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| [b835389c8](https://github.com/angular/angular-cli/commit/b835389c8a60749151039ed0baf0be025ce0932b) | fix  | correctly extract messages when using cached build ([#22266](https://github.com/angular/angular-cli/pull/22266)) |
| [647a5f0b1](https://github.com/angular/angular-cli/commit/647a5f0b18e49b2ece3f43c0a06bfb75d7caef49) | fix  | don't watch nested `node_modules` when polling is enabled                                                        |
| [4d01d4f72](https://github.com/angular/angular-cli/commit/4d01d4f72344c42f650f5495b21e6bd94069969a) | fix  | transform remapped sourcemap into a plain object                                                                 |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [4d918ef99](https://github.com/angular/angular-cli/commit/4d918ef9912d53a09d73fb19fa41b121dceed37c) | fix  | JIT mode CommonJS accessing inexistent `default` property |

## Special Thanks

Alan Agius, Billy Lando, David-Emmanuel DIVERNOIS and Derek Cormier

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.3"></a>

# 13.0.3 (2021-11-17)

## Special Thanks

Alan Agius, Joey Perrott and Krzysztof Platis

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.2"></a>

# 13.0.2 (2021-11-10)

### @angular/cli

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [34047b1ad](https://github.com/angular/angular-cli/commit/34047b1adccd7eb852c1900c872e9ca71c8d4cd9) | fix  | avoid redirecting @angular/core in Angular migrations  |
| [ff4538e98](https://github.com/angular/angular-cli/commit/ff4538e981cfff49b6e8433ffcb5ac2d2ea5d07e) | fix  | favor ng-update `packageGroupName` in ng update output |

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [1bc00b6fe](https://github.com/angular/angular-cli/commit/1bc00b6feb9033fd611dec965c82f03e4135a9f4) | fix  | migrate ng-packagr configurations in package.json        |
| [9ea74a13d](https://github.com/angular/angular-cli/commit/9ea74a13d07208373490c7cdb3ff7c452c698322) | fix  | show warning when migrating ng-packagr JS configurations |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [35164bf92](https://github.com/angular/angular-cli/commit/35164bf92b986a67215580622aaddc4148a7c822) | fix  | don't restore `input` of type `file` during HMR                         |
| [facb5d8ff](https://github.com/angular/angular-cli/commit/facb5d8ffd4f6a81d3132515b8bae64278cf8316) | fix  | don't show `[NG HMR] Unknown input type` when restoring file type input |
| [ef8815d04](https://github.com/angular/angular-cli/commit/ef8815d0434836f2d8119e91a7bc09742ff77d37) | fix  | improve sourcemap fidelity during code-coverage                         |
| [966a1334a](https://github.com/angular/angular-cli/commit/966a1334a6502f5d4a18710ae22e739e62770101) | fix  | suppress "@charset" must be the first rule in the file warning          |
| [1cdc24da0](https://github.com/angular/angular-cli/commit/1cdc24da0105fad75221e3c145de12dafc601059) | fix  | update Angular peer dependencies to 13.0 stable                         |

## Special Thanks

Alan Agius, Charles Lyding, Joey Perrott and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.1"></a>

# 13.0.1 (2021-11-03)

### @schematics/angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [40f599241](https://github.com/angular/angular-cli/commit/40f599241e278478c694580c9dec4f5cc34db011) | fix  | updated Angular new project version to v13.0.0 |

## Special Thanks

Charles Lyding and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.13"></a>

# 12.2.13 (2021-11-03)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [a2bd940e4](https://github.com/angular/angular-cli/commit/a2bd940e4ab44db57b0fc69d5346d2862a19c879) | fix  | add verbose logging for differential loading and i18n |

## Special Thanks

Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.0"></a>

# 13.0.0 (2021-11-03)

## Breaking Changes

### @angular/cli

- We drop support for Node.js versions prior to `12.20`.

### @schematics/angular

- `classlist.js` and `web-animations-js` are removed from application polyfills and uninstalled from the package. These were only needed for compatibility with Internet Explorer, which is no longer needed now that Angular only supports evergreen browsers. See: https://angular.io/guide/browser-support.

Add the following to the polyfills file for an app to re-add these packages:

```typescript
import 'classlist.js';
import 'web-animations-js';
```

And then run:

```sh
npm install classlist.js web-animations-js --save
```

- We removed several deprecated `@schematics/angular` deprecated options.
- `lintFix` have been removed from all schematics. `ng lint --fix` should be used instead.
- `legacyBrowsers` have been removed from the `application` schematics since IE 11 is no longer supported.
- `configuration` has been removed from the `web-worker` as it was unused.
- `target` has been removed from the `service-worker` as it was unused.

### @angular-devkit/build-angular

- Support for `karma-coverage-instanbul-reporter` has been dropped in favor of the official karma coverage plugin `karma-coverage`.

- Support for `node-sass` has been removed. `sass` will be used by default to compile SASS and SCSS files.

- `NG_PERSISTENT_BUILD_CACHE` environment variable option no longer have effect. Configure `cli.cache` in the workspace configuration instead.

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "cache": {
      "enabled": true,
      "path": ".custom-cache-path",
      "environment": "all"
    }
  }
  ...
}
```

- Calling `BuilderContext.scheduleBuilder()` with a builder from `@angular-devkit/build-angular` now requires passing the `target` property in the 3rd argument, like in the following example:

  ```typescript
  context.scheduleBuilder('@angular-devkit/build-angular:ng-packagr', options, {
    target: context.target,
  });
  ```

- The automatic inclusion of Angular-required ES2015 polyfills to support ES5 browsers has been removed. Previously when targetting ES5 within the application's TypeScript configuration or listing an ES5 requiring browser in the browserslist file, Angular-required polyfills were included in the built application. However, with Angular no longer supporting IE11, there are now no browsers officially supported by Angular that would require these polyfills. As a result, the automatic inclusion of these ES2015 polyfills has been removed. Any polyfills manually added to an application's code are not affected by this change.

- With this change a number of deprecated dev-server builder options which proxied to the browser builder have been removed. These options should be configured in the browser builder instead.

The removed options are:

- `aot`
- `sourceMap`
- `deployUrl`
- `baseHref`
- `vendorChunk`
- `commonChunk`
- `optimization`
- `progress`

- With this change we removed several deprecated builder options
- `extractCss` has been removed from the browser builder. CSS is now always extracted.
- `servePathDefaultWarning` and `hmrWarning` have been removed from the dev-server builder. These options had no effect.

- Deprecated `@angular-devkit/build-angular:tslint` builder has been removed. Use https://github.com/angular-eslint/angular-eslint instead.

- Differential loading support has been removed. With Angular no longer supporting IE11, there are now no browsers officially supported by Angular that require ES5 code. As a result, differential loading's functionality for creating and conditionally loading ES5 and ES2015+ variants of an application is no longer required.

- TypeScript versions prior to 4.4 are no longer supported.

- The dev-server now uses WebSockets to communicate changes to the browser during HMR and live-reloaded. If during your development you are using a proxy you will need to enable proxying of WebSockets.

- We remove inlining of Google fonts in WOFF format since IE 11 is no longer supported. Other supported browsers use WOFF2.

### @angular-devkit/build-webpack

- Support for `webpack-dev-server` version 3 has been removed. For more information about the migration please see: https://github.com/webpack/webpack-dev-server/blob/master/migration-v4.md

Note: this change only affects users depending on `@angular-devkit/build-webpack` directly.

### @angular-devkit/core

- With this change we drop support for the deprecated behaviour to transform `id` in schemas. Use `$id` instead.

Note: this only effects schematics and builders authors.

- The deprecated JSON parser has been removed from public API. [jsonc-parser](https://www.npmjs.com/package/jsonc-parser) should be used instead.

### @angular-devkit/schematics

- `isAction` has been removed without replacement as it was unused.

- With this change we remove the following deprecated APIs
- `TslintFixTask`
- `TslintFixTaskOptions`

**Note:** this only effects schematics developers.

### @ngtools/webpack

- Deprecated `inlineStyleMimeType` option has been removed from `AngularWebpackPluginOptions`. Use `inlineStyleFileExtension` instead.

- Applications directly using the `webpack-cli` and not the Angular CLI to build must set the environment variable `DISABLE_V8_COMPILE_CACHE=1`. The `@ngtools/webpack` package now uses dynamic imports to provide support for the ESM `@angular/compiler-cli` package. The `v8-compile-cache` package used by the `webpack-cli` does not currently support dynamic import expressions and will cause builds to fail if the environment variable is not specified. Applications using the Angular CLI are not affected by this limitation.

## Deprecations

###

- `@angular-devkit/build-optimizer`

It's functionality has been included in `@angular-devkit/build-angular` so this package is no longer needed by the CLI and we will stop publishing the package soon. It has been an experimental (never hit `1.0.0`) and internal (only used by Angular itself) package and should be not be used directly by others.

### @angular-devkit/build-angular

- `NG_BUILD_CACHE` environment variable option will be removed in the next major version. Configure `cli.cache` in the workspace configuration instead.

### @angular/cli

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [9fe55752d](https://github.com/angular/angular-cli/commit/9fe55752db8bb50cad5a1ddfe670dce06528e23e) | feat | officially support Node.js v16                                      |
| [5ad145722](https://github.com/angular/angular-cli/commit/5ad145722f66af526a36983b259c6d625c93f307) | fix  | error when updating Angular packages across multi-major migrations  |
| [e4bc35e33](https://github.com/angular/angular-cli/commit/e4bc35e332e378f8d238f4069dc56f422fe205d6) | fix  | exclude packages from ng add that contain invalid peer dependencies |
| [e1b954d70](https://github.com/angular/angular-cli/commit/e1b954d707f90622d8a75fc45840cefeb224c286) | fix  | keep relative migration paths during update analysis                |
| [c3acf3cc2](https://github.com/angular/angular-cli/commit/c3acf3cc26b9e37a3b8f4c369f42731f46b522ee) | fix  | remove unused cli project options.                                  |
| [77fe6c4e6](https://github.com/angular/angular-cli/commit/77fe6c4e67147ff42fa6350edaf4ef7dc184a3a6) | fix  | update `engines` to require `node` `12.20.0`                        |
| [8795536a3](https://github.com/angular/angular-cli/commit/8795536a31efbed6373787188cb21c5d1e0accbd) | fix  | update `ng update` output for Angular packages                      |
| [d8c9f6eaf](https://github.com/angular/angular-cli/commit/d8c9f6eaf4513639741d20c6af97a751b33b968e) | fix  | update the update command to fully support Node.js v16              |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| [7ff8c5350](https://github.com/angular/angular-cli/commit/7ff8c5350ea2e49574dd659adae02215957d2685) | feat | add `/.angular/cache` to `.gitignore`                                                       |
| [3ba13f467](https://github.com/angular/angular-cli/commit/3ba13f467c12f4ad0c314cc92a2d94fb63f640ec) | feat | add `noImplicitOverride` and `noPropertyAccessFromIndexSignature` to workspace tsconfig     |
| [268a03b63](https://github.com/angular/angular-cli/commit/268a03b63094d9c680401bc0977edafb22826ce3) | feat | add migration to update the workspace config                                                |
| [7bdcd7da1](https://github.com/angular/angular-cli/commit/7bdcd7da1ff3a31f4958d90d856beb297e99b187) | feat | create new projects with rxjs 7                                                             |
| [eac18aed7](https://github.com/angular/angular-cli/commit/eac18aed78da55efb840a3ef6f5e90718946504c) | feat | drop polyfills required only for Internet Explorer now that support has been dropped for it |
| [4f91816b2](https://github.com/angular/angular-cli/commit/4f91816b2951c0e2b0109ad1938eb0ae632c0c76) | feat | migrate libraries to be published from ViewEngine to Ivy Partial compilation                |
| [5986befcd](https://github.com/angular/angular-cli/commit/5986befcdc953c0e8c90c756ac1c89b8c4b66614) | feat | remove deprecated options                                                                   |
| [9fbd16655](https://github.com/angular/angular-cli/commit/9fbd16655e86ec6fc598a47436e3e80a48beb649) | feat | remove IE 11 specific polyfills                                                             |
| [a7b2e6f51](https://github.com/angular/angular-cli/commit/a7b2e6f512d2a1124f0d2c68caacfe6552a10cd5) | feat | update ngsw-config resources extensions                                                     |
| [732ef7985](https://github.com/angular/angular-cli/commit/732ef798523f74994ed3d482a65b191058674d19) | fix  | add browserslist configuration in library projects                                          |
| [585adacd0](https://github.com/angular/angular-cli/commit/585adacd0624ddf32c5c69a755d8e542f3463861) | fix  | don't add `destroyAfterEach` in newly generated spec files                                  |
| [e58226ee9](https://github.com/angular/angular-cli/commit/e58226ee948ea88f27a81d50d71945b5c9c39ee3) | fix  | don't export `renderModuleFactory` from server file                                         |
| [0ec0ad8a4](https://github.com/angular/angular-cli/commit/0ec0ad8a4dba4a778b368c5cd76ef13fb370b310) | fix  | remove `target` and `lib` options for library tsconfig                                      |
| [f227e145d](https://github.com/angular/angular-cli/commit/f227e145dfbec2954cb96c92ab3c4cb97cbe0f32) | fix  | updated Angular new project version to v13.0 prerelease                                     |

###

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [5e435ff37](https://github.com/angular/angular-cli/commit/5e435ff37703f9ffea7fa92fbd5cd42d9a3db07e) | docs | mark `@angular-devkit/build-optimizer` as deprecated. |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [09e039500](https://github.com/angular/angular-cli/commit/09e039500f34b0d6a16e62128409ac5821e8b9c2) | feat | include workspace extensions in project metadata |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| [f53bf9dc2](https://github.com/angular/angular-cli/commit/f53bf9dc21ee9aa8a682b8a82ee8a9870fa859e1) | feat     | add `type=module` to all scripts tags                                         |
| [e95ecb8ab](https://github.com/angular/angular-cli/commit/e95ecb8ab0382eb803741619c446d6cc7b215ba0) | feat     | deprecate deployUrl                                                           |
| [7dcfffaff](https://github.com/angular/angular-cli/commit/7dcfffafff6f3d29bbe679a90cdf77b1292fec0b) | feat     | drop support for `karma-coverage-instanbul-reporter`                          |
| [ac3fc2752](https://github.com/angular/angular-cli/commit/ac3fc2752f28761e1cd42157b59dcf2364ae5567) | feat     | drop support for `node-sass`                                                  |
| [5904afd1d](https://github.com/angular/angular-cli/commit/5904afd1de3ffa0bb6cd1757795ba9abfce9e523) | feat     | enable disk cache by default and provide configurable options                 |
| [22cd9edfa](https://github.com/angular/angular-cli/commit/22cd9edfafd357bb9d62a93dd56f033b3f34bbe8) | feat     | favor es2020 main fields                                                      |
| [7576136b2](https://github.com/angular/angular-cli/commit/7576136b2fc8a9173b0a92e2ab14c9bc2559081e) | feat     | remove automatic inclusion of ES5 browser polyfills                           |
| [000b0e51c](https://github.com/angular/angular-cli/commit/000b0e51c166ecd26b6f24d6a133ea5076df9849) | feat     | remove deprecated dev-server options                                          |
| [20e48a33c](https://github.com/angular/angular-cli/commit/20e48a33c14a1b0b959ba0a45018df53a3e129c8) | feat     | remove deprecated options                                                     |
| [e78f6ab5d](https://github.com/angular/angular-cli/commit/e78f6ab5d8f00338d826c8407ce5c8fca40cf097) | feat     | remove deprecated tslint builder                                              |
| [701214d17](https://github.com/angular/angular-cli/commit/701214d174586fe7373b6155024c9b6e97b26377) | feat     | remove differential loading support                                           |
| [fb1ad7c5b](https://github.com/angular/angular-cli/commit/fb1ad7c5b3fa3df85f1d3dff3850e1ad0003ef9d) | feat     | support ESM proxy configuration files for the dev server                      |
| [505438cc4](https://github.com/angular/angular-cli/commit/505438cc4146b1950038531ce30e1f62f7c41d00) | feat     | support TypeScript 4.4                                                        |
| [32dbf659a](https://github.com/angular/angular-cli/commit/32dbf659acb632fac1d76d99d8191ea9c5e6350b) | feat     | update `webpack-dev-server` to version 4                                      |
| [c1efaa17f](https://github.com/angular/angular-cli/commit/c1efaa17feb1d2911dcdea12688d75086d410bf1) | fix      | calculate valid Angular versions from peerDependencies                        |
| [d7af4a7b5](https://github.com/angular/angular-cli/commit/d7af4a7b536a7c43704f808ea208bc9f230d2403) | fix      | enable custom `es2020` and `es2015` conditional exports                       |
| [f383f3201](https://github.com/angular/angular-cli/commit/f383f3201b69d28f8755c0bd63134619f9da408d) | fix      | ESM-interop loaded plugin creators of `@angular/localize/tools` not respected |
| [7934becb5](https://github.com/angular/angular-cli/commit/7934becb581d07c8e1f74898ddd4c20f050be659) | fix      | generate unique webpack runtimes                                              |
| [b14e0a547](https://github.com/angular/angular-cli/commit/b14e0a54727352a6939c7a0ff13dffe2deaa67d2) | fix      | improve sourcemaps fidelity when code coverage is enabled                     |
| [e19287453](https://github.com/angular/angular-cli/commit/e19287453c10740ea21b31a6c8a3cd5f3714955d) | fix      | move `@angular/localize` detection prior to webpack initialization            |
| [76d6d8826](https://github.com/angular/angular-cli/commit/76d6d8826f9968f84edf219f67b84673d70bbe95) | fix      | set browserslist defaults                                                     |
| [167eed465](https://github.com/angular/angular-cli/commit/167eed4654be4480c45d7fdfe7a0b9f160170289) | fix      | update Angular peer dependencies to v13.0 prerelease                          |
| [1d8cdf853](https://github.com/angular/angular-cli/commit/1d8cdf853dc8fdea78b067a715b3342ed9427caa) | fix      | update esbuild to 0.13.12                                                     |
| [884111ac0](https://github.com/angular/angular-cli/commit/884111ac0b8a73dca06d844b2ed795a3e3ed3289) | fix      | update IE unsupported and deprecation messages                                |
| [4be6537dd](https://github.com/angular/angular-cli/commit/4be6537ddf4b32e8d204dbaa75f1a53712fe9d44) | fix      | update TS/JS regexp checks to latest extensions                               |
| [427a9ee97](https://github.com/angular/angular-cli/commit/427a9ee9738c0911caeaba5fb4b59d183ffe6244) | fix      | update workspace tsconfig lib es2020                                          |
| [ea926db25](https://github.com/angular/angular-cli/commit/ea926db257ad3b042af86178e472b5763a695146) | fix      | use es2015 when generating server bundles                                     |
| [13cceab8e](https://github.com/angular/angular-cli/commit/13cceab8e737a12d0809f184f852ceb5620d81fb) | fix      | use URLs for absolute import paths with ESM                                   |
| [4e0743c8a](https://github.com/angular/angular-cli/commit/4e0743c8ad5879f212f2ea232ac9492848a8df2c) | perf     | change webpack hashing function to `xxhash64`                                 |
| [cb7d156c2](https://github.com/angular/angular-cli/commit/cb7d156c23a7ef2f1c2f338db1487b85f8b98690) | perf     | use esbuild as a CSS optimizer for global styles                              |
| [8e82263c5](https://github.com/angular/angular-cli/commit/8e82263c5e7da6ca25bdd4e2ce9ad2c775d623b7) | perf     | use esbuild/terser combination to optimize global scripts                     |
| [e82eef924](https://github.com/angular/angular-cli/commit/e82eef924eb172a98fa157a958bde2cfcaa52ce6) | refactor | remove WOFF handling from inline-fonts processor                              |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [a0b5897d5](https://github.com/angular/angular-cli/commit/a0b5897d50a00ee4668029c2cbc47cacd2ab925f) | feat | update `webpack-dev-server` to version 4 |
| [9efcb32e3](https://github.com/angular/angular-cli/commit/9efcb32e378442714eae4caec43281123c5e30f6) | fix  | better handle concurrent dev-servers     |

### @angular-devkit/core

| Commit                                                                                              | Type     | Description                                                                  |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| [0c92ea5ca](https://github.com/angular/angular-cli/commit/0c92ea5ca34d82849862d55c4210cf62c819d514) | feat     | remove deprecated schema id handling                                         |
| [9874aff71](https://github.com/angular/angular-cli/commit/9874aff71ecb5f3baf6c1dcc489581d1dcb58491) | fix      | add missing option peer dependency on `chokidar`                             |
| [a54e5e065](https://github.com/angular/angular-cli/commit/a54e5e06551c828eb5cf08695674e04fd8a78bf3) | fix      | support Node.js v16 with `NodeJsSyncHost`/`NodeJsAsyncHost` delete operation |
| [d722fdf1f](https://github.com/angular/angular-cli/commit/d722fdf1f67c394762906794605bc1ad657670d1) | refactor | remove deprecated JSON parser                                                |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [0565ed62e](https://github.com/angular/angular-cli/commit/0565ed62eb08c1e82cffb2533e6afde216c37eb7) | feat | add UpdateBuffer2 based on magic-string                  |
| [8954d1152](https://github.com/angular/angular-cli/commit/8954d1152b6c1a33dd7d4b63d2fa430d91e7b370) | feat | remove deprecated `isAction`                             |
| [053b7d66c](https://github.com/angular/angular-cli/commit/053b7d66c269423804891e4d43d61f8605838e24) | feat | remove deprecated tslint APIs                            |
| [bdd89ae84](https://github.com/angular/angular-cli/commit/bdd89ae84ad6919b670dde862de72f562c86d0c5) | fix  | handle zero or negative length removals in update buffer |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description                                           |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| [d2a97f919](https://github.com/angular/angular-cli/commit/d2a97f9193fcf7e454fe8eb48c0ed732d3b2f24f) | fix      | update Angular peer dependencies to v13.0 prerelease  |
| [7928b18ed](https://github.com/angular/angular-cli/commit/7928b18edf34243a404b5a4f40a5d6e40247d797) | perf     | reduce repeat path mapping analysis during resolution |
| [8ce8e4edc](https://github.com/angular/angular-cli/commit/8ce8e4edc5ca2984d6a36fe4c7d308fa7f089102) | refactor | remove deprecated `inlineStyleMimeType` option        |
| [7d98ab3df](https://github.com/angular/angular-cli/commit/7d98ab3df9f7c15612c69cedca5a01a535301508) | refactor | support an ESM-only `@angular/compiler-cli` package   |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Douglas Parker, Joey Perrott, Kristiyan Kostadinov, Lukas Spirig and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.9"></a>

# 12.2.9 (2021-10-06)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [9d45b7752](https://github.com/angular/angular-cli/commit/9d45b77522a9693c4876fdfd741e8869e89e0268) | fix  | add web-streams-polyfill to downlevel exclusion list |
| [ccedf53a8](https://github.com/angular/angular-cli/commit/ccedf53a820a748b56c84528294b36c7af30dbaf) | fix  | update `esbuild` to `0.13.4`                         |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.8"></a>

# 12.2.8 (2021-10-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [821a1b5a9](https://github.com/angular/angular-cli/commit/821a1b5a949d53f2e82f734062b711a166d42e24) | fix  | babel adjust enum plugin incorrectly transforming loose enums |

## Special Thanks

Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.7"></a>

# 12.2.7 (2021-09-22)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [d856b4d23](https://github.com/angular/angular-cli/commit/d856b4d2369bea76ce65fc5f6d1585145ad41618) | fix  | support WASM-based esbuild optimizer fallback |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.6"></a>

# 12.2.6 (2021-09-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [8b21effad](https://github.com/angular/angular-cli/commit/8b21effad673877cf1a82ef7d0601393a65517fb) | fix  | handle `FORCE_COLOR` when stdout is not instance of `WriteStream` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [ea60f0f52](https://github.com/angular/angular-cli/commit/ea60f0f527f2ab8fc5acc967138c4ae993946923) | fix  | handle `FORCE_COLOR` when stdout is not instance of `WriteStream` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.5"></a>

# 12.2.5 (2021-09-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [0498768c5](https://github.com/angular/angular-cli/commit/0498768c54de225a40c28fdf27bb1fc43959ba20) | fix  | disable dev-server response compression                  |
| [367fce2e9](https://github.com/angular/angular-cli/commit/367fce2e9f9389c41f2ed5361ef6749198c49785) | fix  | improve Safari browserslist to esbuild target conversion |

## Special Thanks:

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.4"></a>

# 12.2.4 (2021-09-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [aaadef026](https://github.com/angular/angular-cli/commit/aaadef02698ba729ca04ccd4159bda5b6582babb) | fix  | update `esbuild` to `0.12.24`               |
| [f8a9f4a01](https://github.com/angular/angular-cli/commit/f8a9f4a0100286b7cf656ffbe486c3424cad5172) | fix  | update `mini-css-extract-plugin` to `2.2.1` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.3"></a>

# 12.2.3 (2021-08-26)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [3e3321857](https://github.com/angular/angular-cli/commit/3e33218578007f93a131dc8be569e9985179098f) | fix  | RGBA converted to hex notation in component styles breaks IE11 |

## Special Thanks:

Alan Agius and Trevor Karjanis

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.2"></a>

# 12.2.2 (2021-08-18)

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [a55118a75](https://github.com/angular/angular-cli/commit/a55118a753555c0082cfd434379559df7e3eb7f9) | fix: provide supported browsers to esbuild                  |
| [81baa4f95](https://github.com/angular/angular-cli/commit/81baa4f956443fcc718f9021fd23ab7064d04607) | fix: update Angular peer dependencies to 12.2 stable        |
| [297410ae8](https://github.com/angular/angular-cli/commit/297410ae860860d71905639cf38b49ff05813845) | fix: handle undefined entrypoints when marking async chunks |

### @ngtools/webpack

| Commit                                                                                              | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [b7199f366](https://github.com/angular/angular-cli/commit/b7199f366841d976b502ad5f1923e24ea2f6b302) | fix: update Angular peer dependencies to 12.2 stable |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott and Simon Primetzhofer

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.1"></a>

# 12.2.1 (2021-08-11)

### @angular/cli

| Commit                                                                                              | Description                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [8dc3c895a](https://github.com/angular/angular-cli/commit/8dc3c895a6531316e672031c8d0815781f0c089a) | fix(@angular/cli): show error when using non-TTY terminal without passing `--skip-confirmation` during `ng add` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [eded01270](https://github.com/angular/angular-cli/commit/eded01270f9aa70f6ba4806a068de8d1c0a52454) | fix(@angular-devkit/schematics-cli): log when in debug and/or dry run modes |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                              |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [22e0208a9](https://github.com/angular/angular-cli/commit/22e0208a9ee6257213b3bf93ac61a2c3d4ac9504) | fix(@angular-devkit/build-angular): ensure native async is downlevelled in third-party libraries         |
| [9b4b86fb0](https://github.com/angular/angular-cli/commit/9b4b86fb0d9c88a3c714f5eabf925859bb7b71bb) | fix(@angular-devkit/build-angular): support both pure annotation forms for static properties             |
| [cea028090](https://github.com/angular/angular-cli/commit/cea0280908db39308ac5fa37374b138ceb79ecea) | fix(@angular-devkit/build-angular): do not consume inline sourcemaps when vendor sourcemaps is disabled. |
| [e7ec0346e](https://github.com/angular/angular-cli/commit/e7ec0346e69c090ded7d9ec6d3574deb79926db0) | fix(@angular-devkit/build-angular): avoid attempting to optimize copied JavaScript assets                |
| [4f757c2bc](https://github.com/angular/angular-cli/commit/4f757c2bcf1356d33eaa86bc3b715c0a6b7c2ed8) | fix(@angular-devkit/build-angular): handle null maps in JavaScript optimizer worker                      |

## Special Thanks:

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.0"></a>

# 12.2.0 (2021-08-04)

### @angular/cli

| Commit                                                                                              | Description                                                                                            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [259e26979](https://github.com/angular/angular-cli/commit/259e26979ebc712ee08fd36fb68a9576c1e02447) | fix(@angular/cli): merge npmrc files values                                                            |
| [c1eddbdc9](https://github.com/angular/angular-cli/commit/c1eddbdc98631fdfff287ce566d79ed43b601e0f) | fix(@angular/cli): handle `YARN_` environment variables during `ng update` and `ng add`                |
| [6b00d1270](https://github.com/angular/angular-cli/commit/6b00d1270acaf33f32ee68c4254ce06951ddcb8c) | fix(@angular/cli): handle NPM_CONFIG environment variables during ng update and ng add                 |
| [88ee85c41](https://github.com/angular/angular-cli/commit/88ee85c4178e37b72001e8946b70a46ba739a0b7) | fix(@angular/cli): disable update notifier when retrieving package manager version during `ng version` |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [d750c686f](https://github.com/angular/angular-cli/commit/d750c686fd26f3ccfccb039027bd816a91279497) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns                                               |
| [4bcd1dc9e](https://github.com/angular/angular-cli/commit/4bcd1dc9ee744343a465d73d51d4a062964a3714) | fix(@angular-devkit/build-angular): allow classes with pure annotated static properties to be optimized                        |
| [ceade0c27](https://github.com/angular/angular-cli/commit/ceade0c27e4b8b0e731e6ca5128fd86cf071d029) | fix(@angular-devkit/build-angular): dasherize disable-host-check suggestion                                                    |
| [8383c6b42](https://github.com/angular/angular-cli/commit/8383c6b421f7005a25a3bff0826048f3a24f3030) | fix(@angular-devkit/build-angular): silence Sass compiler warnings from 3rd party stylesheets                                  |
| [07763702f](https://github.com/angular/angular-cli/commit/07763702fd244ba44aebb714a295dbf5ba72b91d) | fix(@angular-devkit/build-angular): force linker `sourceMapping` option to false.                                              |
| [a5c69722f](https://github.com/angular/angular-cli/commit/a5c69722ffeceb72dcd46901c2bb983e5dc8bf32) | fix(@angular-devkit/build-angular): ensure `NG_PERSISTENT_BUILD_CACHE` always creates a cache in the specified cache directory |
| [c65b04999](https://github.com/angular/angular-cli/commit/c65b049996a8de9d9fcc66631872424cbe5f13f9) | fix(@angular-devkit/build-angular): fail browser build when index generation fails                                             |
| [3d71c63b3](https://github.com/angular/angular-cli/commit/3d71c63b3a11946ebfca3f0d97d4fbf8dca16255) | fix(@angular-devkit/build-angular): fix issue were `@media all` causing critical CSS inling to fail                            |
| [9a04975a2](https://github.com/angular/angular-cli/commit/9a04975a2170c3ecc2c09c32bd15a89c613e198f) | fix(@angular-devkit/build-angular): `extractLicenses` didn't have an effect when using server builder                          |
| [2ac8e9c0e](https://github.com/angular/angular-cli/commit/2ac8e9c0e131bf7fcb2c6e92500eeaa112efcefb) | fix(@angular-devkit/build-angular): display incompatibility errors                                                             |
| [2c2b49919](https://github.com/angular/angular-cli/commit/2c2b499193fb319e1c9cb92318610353b7720e2b) | fix(@angular-devkit/build-angular): limit advanced terser passes to two                                                        |
| [1be3b0783](https://github.com/angular/angular-cli/commit/1be3b07836659487e4aa9b8c71c673635e268a60) | fix(@angular-devkit/build-angular): exclude `outputPath` from persistent build cache key                                       |
| [fefd6d042](https://github.com/angular/angular-cli/commit/fefd6d04213e61d3f48c0484d8c6a8dcff1ecd34) | perf(@angular-devkit/build-angular): use `esbuild` as a CSS optimizer for component styles                                     |
| [18cfa0431](https://github.com/angular/angular-cli/commit/18cfa04317230f934ccba798c080543bb389725f) | feat(@angular-devkit/build-angular): add support to inline Adobe Fonts                                                         |
| [9a751f0f8](https://github.com/angular/angular-cli/commit/9a751f0f81919d67f5eeeaecbe807d5c216f6a7a) | fix(@angular-devkit/build-angular): handle `ENOENT` and `ENOTDIR` errors when deleting outputs                                 |
| [41e645792](https://github.com/angular/angular-cli/commit/41e64579213b9d4a7c976ea45daa6b32d980df10) | fix(@angular-devkit/build-angular): downlevel `for await...of` when targetting ES2018+                                         |
| [070a13364](https://github.com/angular/angular-cli/commit/070a1336478d721bbbb474622f50fab455cda26c) | fix(@angular-devkit/build-angular): configure webpack target in common configuration                                           |
| [da32daa75](https://github.com/angular/angular-cli/commit/da32daa75d08d4be177af5fa16088398d7fb427b) | perf(@angular-devkit/build-angular): use combination of `esbuild` and `terser` as a JavaScript optimizer                       |
| [6a2b11906](https://github.com/angular/angular-cli/commit/6a2b11906e4173562a82b3654ff662dd05513049) | perf(@angular-devkit/build-angular): cache JavaScriptOptimizerPlugin results                                                   |
| [ab17b1721](https://github.com/angular/angular-cli/commit/ab17b1721c05366e592cf805ad6d25e672b314bf) | fix(@angular-devkit/build-angular): handle ng-packagr errors more gracefully.                                                  |
| [d4c5f8518](https://github.com/angular/angular-cli/commit/d4c5f8518d4801b9fd76de289a015dcbb8d8f69b) | fix(@angular-devkit/build-angular): control linker template sourcemapping via builder sourcemap options                        |
| [06181c2fb](https://github.com/angular/angular-cli/commit/06181c2fbf5a20396b2d0e2b3925ceb1276947fb) | fix(@angular-devkit/build-angular): parse web-workers in tests when webWorkerTsConfig is defined                               |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [615353022](https://github.com/angular/angular-cli/commit/61535302204a2a767f85053b7efaa6ac5ac64098) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

### @ngtools/webpack

| Commit                                                                                              | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [dbbcf5c8c](https://github.com/angular/angular-cli/commit/dbbcf5c8c4ec4427609942f4ef7053c1b51773c9) | fix(@ngtools/webpack): only track file dependencies                                  |
| [7536338e0](https://github.com/angular/angular-cli/commit/7536338e0becc7f9cde62becbde58e18a270cb31) | fix(@ngtools/webpack): allow generated assets of Angular component resources         |
| [720feee34](https://github.com/angular/angular-cli/commit/720feee34f910fc11c40e2f68d919d61b7d6cbec) | fix(@ngtools/webpack): avoid non-actionable template type-checker syntax diagnostics |
| [6a7bcf330](https://github.com/angular/angular-cli/commit/6a7bcf3300b459aef80fcf98f2475c977f6244dc) | fix(@ngtools/webpack): encode component style data                                   |
| [12c14b565](https://github.com/angular/angular-cli/commit/12c14b56537d65d6986e245ab1ae4dd9aa8dd378) | fix(@ngtools/webpack): remove no longer needed component styles workaround           |

### @schematics/angular

| Commit                                                                                              | Description                                                                                         |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [20fd33f6d](https://github.com/angular/angular-cli/commit/20fd33f6d4ce6cef1feb508a0221222e83a85630) | feat(@schematics/angular): destroy test module after every test                                     |
| [5b10d4f54](https://github.com/angular/angular-cli/commit/5b10d4f549ebc12645ad08cba8ab7b91eaa87d28) | fix(@schematics/angular): remove unsafe any usage in application spec file                          |
| [1b5e18e7b](https://github.com/angular/angular-cli/commit/1b5e18e7b401efb7ec73d99c4d77d9b29e956724) | fix(@schematics/angular): replace interactive `div` with `button` in application component template |
| [0907b6941](https://github.com/angular/angular-cli/commit/0907b694174d6d684d965baf6cd37b87f49742e8) | fix(@schematics/angular): use stricter semver for `karma-jasmine-html-reporter`                     |
| [8ad1539c5](https://github.com/angular/angular-cli/commit/8ad1539c5e73bad30eb6eb340379d64db208098c) | fix(@schematics/angular): add 'none' value for the 'style' option of the component schematic        |
| [e5ba29c7d](https://github.com/angular/angular-cli/commit/e5ba29c7d54cbd83057cf23a21119ea5a3146993) | fix(@schematics/angular): display warning during migrations when using third-party builders         |
| [a44dc02fe](https://github.com/angular/angular-cli/commit/a44dc02feecaf8735f2dc6128a5b6cc5666b4434) | fix(@schematics/angular): add devtools to ng new                                                    |

## Special Thanks:

Alan Agius, Charles Lyding, David Scourfield, Doug Parker, hien-pham, Joey Perrott, LeonEck, Mike
Jancar, twerske, Vaibhav Singh and originalfrostig

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.0-rc.0"></a>

# 12.2.0-rc.0 (2021-07-28)

### @angular/cli

| Commit                                                                                              | Description                                 |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [259e26979](https://github.com/angular/angular-cli/commit/259e26979ebc712ee08fd36fb68a9576c1e02447) | fix(@angular/cli): merge npmrc files values |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [d750c686f](https://github.com/angular/angular-cli/commit/d750c686fd26f3ccfccb039027bd816a91279497) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [615353022](https://github.com/angular/angular-cli/commit/61535302204a2a767f85053b7efaa6ac5ac64098) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott and originalfrostig

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.1.4"></a>

# 12.1.4 (2021-07-28)

### @angular/cli

| Commit                                                                                              | Description                                 |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [e02c97dd0](https://github.com/angular/angular-cli/commit/e02c97dd09399443438b32cf1ad47fa0f7011df3) | fix(@angular/cli): merge npmrc files values |

### @schematics/angular

| Commit                                                                                              | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [cfc267426](https://github.com/angular/angular-cli/commit/cfc267426716e9ecf0c9833720cb35298284f699) | fix(@schematics/angular): ensure valid SemVer range for new project Angular packages |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [55c0bddc8](https://github.com/angular/angular-cli/commit/55c0bddc8b2425309f00733eca96c06f60f867d5) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [b3736a3c0](https://github.com/angular/angular-cli/commit/b3736a3c09f39f5ee5dc12d98535fe4b6803ea3b) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott and originalfrostig

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.0-next.3"></a>

# 12.2.0-next.3 (2021-07-21)

### @angular/cli

| Commit                                                                                              | Description                                                                             |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [c1eddbdc9](https://github.com/angular/angular-cli/commit/c1eddbdc98631fdfff287ce566d79ed43b601e0f) | fix(@angular/cli): handle `YARN_` environment variables during `ng update` and `ng add` |
| [6b00d1270](https://github.com/angular/angular-cli/commit/6b00d1270acaf33f32ee68c4254ce06951ddcb8c) | fix(@angular/cli): handle NPM_CONFIG environment variables during ng update and ng add  |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [4bcd1dc9e](https://github.com/angular/angular-cli/commit/4bcd1dc9ee744343a465d73d51d4a062964a3714) | fix(@angular-devkit/build-angular): allow classes with pure annotated static properties to be optimized |
| [ceade0c27](https://github.com/angular/angular-cli/commit/ceade0c27e4b8b0e731e6ca5128fd86cf071d029) | fix(@angular-devkit/build-angular): dasherize disable-host-check suggestion                             |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott, LeonEck and Mike Jancar

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.1.3"></a>

# 12.1.3 (2021-07-21)

### @angular/cli

| Commit                                                                                              | Description                                                                             |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [eaa2378b6](https://github.com/angular/angular-cli/commit/eaa2378b6bc69a2485cce742ef95b0b94ae994c6) | fix(@angular/cli): handle `YARN_` environment variables during `ng update` and `ng add` |
| [4b9a41bde](https://github.com/angular/angular-cli/commit/4b9a41bdedcdc4e115e8956d31126c5bf6f442ca) | fix(@angular/cli): handle NPM_CONFIG environment variables during ng update and ng add  |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [04e9ffe4f](https://github.com/angular/angular-cli/commit/04e9ffe4f6b262ce5ef630310bed318e1466d238) | fix(@angular-devkit/build-angular): allow classes with pure annotated static properties to be optimized |
| [6ae17e265](https://github.com/angular/angular-cli/commit/6ae17e26547a0174f7a8910c514016db60fe4c7a) | fix(@angular-devkit/build-angular): dasherize disable-host-check suggestion                             |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott, LeonEck and Mike Jancar

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.2.0-next.2"></a>

# v12.2.0-next.2 (2021-07-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.2.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8383c6b421f7005a25a3bff0826048f3a24f3030"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8383c6b-fix-green.svg" />
</a>
  </td>

  <td>silence Sass compiler warnings from 3rd party stylesheets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21235">
  [Closes #21235]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/07763702fd244ba44aebb714a295dbf5ba72b91d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0776370-fix-green.svg" />
</a>
  </td>

  <td>force linker `sourceMapping` option to false.</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21271">
  [Closes #21271]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a5c69722ffeceb72dcd46901c2bb983e5dc8bf32"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a5c6972-fix-green.svg" />
</a>
  </td>

  <td>ensure `NG_PERSISTENT_BUILD_CACHE` always creates a cache in the specified cache directory</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c65b049996a8de9d9fcc66631872424cbe5f13f9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c65b049-fix-green.svg" />
</a>
  </td>

  <td>fail browser build when index generation fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3d71c63b3a11946ebfca3f0d97d4fbf8dca16255"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3d71c63-fix-green.svg" />
</a>
  </td>

  <td>fix issue were `@media all` causing critical CSS inling to fail</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20804">
  [Closes #20804]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a04975a2170c3ecc2c09c32bd15a89c613e198f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9a04975-fix-green.svg" />
</a>
  </td>

  <td>`extractLicenses` didn't have an effect when using server builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2ac8e9c0e131bf7fcb2c6e92500eeaa112efcefb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2ac8e9c-fix-green.svg" />
</a>
  </td>

  <td>display incompatibility errors</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21322">
  [Closes #21322]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2c2b499193fb319e1c9cb92318610353b7720e2b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2c2b499-fix-green.svg" />
</a>
  </td>

  <td>limit advanced terser passes to two</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1be3b07836659487e4aa9b8c71c673635e268a60"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1be3b07-fix-green.svg" />
</a>
  </td>

  <td>exclude `outputPath` from persistent build cache key</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21275">
  [Closes #21275]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fefd6d04213e61d3f48c0484d8c6a8dcff1ecd34"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fefd6d0-perf-orange.svg" />
</a>
  </td>

  <td>use `esbuild` as a CSS optimizer for component styles</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.2.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dbbcf5c8c4ec4427609942f4ef7053c1b51773c9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dbbcf5c-fix-green.svg" />
</a>
  </td>

  <td>only track file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21228">
  [Closes #21228]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7536338e0becc7f9cde62becbde58e18a270cb31"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7536338-fix-green.svg" />
</a>
  </td>

  <td>allow generated assets of Angular component resources</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/720feee34f910fc11c40e2f68d919d61b7d6cbec"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/720feee-fix-green.svg" />
</a>
  </td>

  <td>avoid non-actionable template type-checker syntax diagnostics</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.2.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/20fd33f6d4ce6cef1feb508a0221222e83a85630"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/20fd33f-feat-blue.svg" />
</a>
  </td>

  <td>destroy test module after every test</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21280">
  [Closes #21280]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5b10d4f549ebc12645ad08cba8ab7b91eaa87d28"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5b10d4f-fix-green.svg" />
</a>
  </td>

  <td>remove unsafe any usage in application spec file</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1b5e18e7b401efb7ec73d99c4d77d9b29e956724"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1b5e18e-fix-green.svg" />
</a>
  </td>

  <td>replace interactive `div` with `button` in application component template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0907b694174d6d684d965baf6cd37b87f49742e8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0907b69-fix-green.svg" />
</a>
  </td>

  <td>use stricter semver for `karma-jasmine-html-reporter`</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.2"></a>

# v12.1.2 (2021-07-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9d48d69aa851eaca3d491495b8d33d155780fa0d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9d48d69-fix-green.svg" />
</a>
  </td>

  <td>silence Sass compiler warnings from 3rd party stylesheets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21235">
  [Closes #21235]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9abf44d354efc3c29f53bf167cd18939a310867b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9abf44d-fix-green.svg" />
</a>
  </td>

  <td>ensure `NG_PERSISTENT_BUILD_CACHE` always creates a cache in the specified cache directory</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/159dc5f9270f4e4a4942dd3eb53198c6b9cd9a6b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/159dc5f-fix-green.svg" />
</a>
  </td>

  <td>force linker `sourceMapping` option to false.</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21271">
  [Closes #21271]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7cad85dad15a60310d23dc216d8ebe3b7eea594f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7cad85d-fix-green.svg" />
</a>
  </td>

  <td>fail browser build when index generation fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/08c317d1630bd81aaafc3552f753324d7751e39d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/08c317d-fix-green.svg" />
</a>
  </td>

  <td>`extractLicenses` didn't have an effect when using server builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c21f6505e3026efaf277aabf5f6878ae3d185c1e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c21f650-fix-green.svg" />
</a>
  </td>

  <td>fix issue were `@media all` causing critical CSS inling to fail</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20804">
  [Closes #20804]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f3b2dc46e91e8cb97cc2f5aef32b701cd527c589"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f3b2dc4-fix-green.svg" />
</a>
  </td>

  <td>display incompatibility errors</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21322">
  [Closes #21322]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5219c050438aff0806b2da813ef74cd9fff2c2f5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5219c05-fix-green.svg" />
</a>
  </td>

  <td>exclude `outputPath` from persistent build cache key</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21275">
  [Closes #21275]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/736a5f89deaca85f487b78aec9ff66d4118ceb6a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/736a5f8-fix-green.svg" />
</a>
  </td>

  <td>only track file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21228">
  [Closes #21228]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e1074eb4a54f4140d0e3cffd6dd30e2efe7c18e2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e1074eb-fix-green.svg" />
</a>
  </td>

  <td>allow generated assets of Angular component resources</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/30638d4525b8dc260cb11488088aa7393083227a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/30638d4-fix-green.svg" />
</a>
  </td>

  <td>avoid non-actionable template type-checker syntax diagnostics</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/09ec1f48d67fa7772df8cd86345a01ed5cf6493c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/09ec1f4-fix-green.svg" />
</a>
  </td>

  <td>remove unsafe any usage in application spec file</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/191dc498521b43d944f5871f1fc8a3dcf80dfaa1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/191dc49-fix-green.svg" />
</a>
  </td>

  <td>replace interactive `div` with `button` in application component template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a729381c039771eb17ca8aefc010b4d13ec17285"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a729381-fix-green.svg" />
</a>
  </td>

  <td>use stricter semver for `karma-jasmine-html-reporter`</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Terence D. Honles

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.1"></a>

# v12.1.1 (2021-07-01)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e52c9c56ddbc9c627508fd41c5b3693b7515197"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8e52c9c-fix-green.svg" />
</a>
  </td>

  <td>handle `ENOENT` and `ENOTDIR` errors when deleting outputs</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21202">
  [Closes #21202]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dd60228974a75b3c6b2ae98521444f0354161240"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dd60228-fix-green.svg" />
</a>
  </td>

  <td>downlevel `for await...of` when targetting ES2018+</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21196">
  [Closes #21196]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2039d6201fa91136a0815f0622787dcccedf0e65"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2039d62-fix-green.svg" />
</a>
  </td>

  <td>configure webpack target in common configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21239">
  [Closes #21239]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/49f5755db27f5860c3c71aef2ae532a719f9aa3b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/49f5755-perf-orange.svg" />
</a>
  </td>

  <td>update `mini-css-extract-plugin` to `1.6.2`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2105677a468f95bf9097a37cadd8041865a85658"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/2105677-perf-orange.svg" />
</a>
  </td>

  <td>update `webpack` to `5.41.1`</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e2375c9de8845ba16d3ec22e83922d9138d6f265"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e2375c9-fix-green.svg" />
</a>
  </td>

  <td>disable update notifier when retrieving package manager version during `ng version`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21172">
  [Closes #21172]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81c7cf232d34e6664edfbe340e6d620d55b4965a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/81c7cf2-fix-green.svg" />
</a>
  </td>

  <td>encode component style data</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21236">
  [Closes #21236]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.2.0-next.1"></a>

# v12.2.0-next.1 (2021-07-01)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.2.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/18cfa04317230f934ccba798c080543bb389725f"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/18cfa04-feat-blue.svg" />
</a>
  </td>

  <td>add support to inline Adobe Fonts</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21186">
  [Closes #21186]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a751f0f81919d67f5eeeaecbe807d5c216f6a7a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9a751f0-fix-green.svg" />
</a>
  </td>

  <td>handle `ENOENT` and `ENOTDIR` errors when deleting outputs</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21202">
  [Closes #21202]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/41e64579213b9d4a7c976ea45daa6b32d980df10"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/41e6457-fix-green.svg" />
</a>
  </td>

  <td>downlevel `for await...of` when targetting ES2018+</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21196">
  [Closes #21196]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/070a1336478d721bbbb474622f50fab455cda26c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/070a133-fix-green.svg" />
</a>
  </td>

  <td>configure webpack target in common configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21239">
  [Closes #21239]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/da32daa75d08d4be177af5fa16088398d7fb427b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/da32daa-perf-orange.svg" />
</a>
  </td>

  <td>use combination of `esbuild` and `terser` as a JavaScript optimizer</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a2b11906e4173562a82b3654ff662dd05513049"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/6a2b119-perf-orange.svg" />
</a>
  </td>

  <td>cache JavaScriptOptimizerPlugin results</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.2.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88ee85c4178e37b72001e8946b70a46ba739a0b7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88ee85c-fix-green.svg" />
</a>
  </td>

  <td>disable update notifier when retrieving package manager version during `ng version`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21172">
  [Closes #21172]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.2.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a7bcf3300b459aef80fcf98f2475c977f6244dc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6a7bcf3-fix-green.svg" />
</a>
  </td>

  <td>encode component style data</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21236">
  [Closes #21236]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.2.0-next.0"></a>

# v12.2.0-next.0 (2021-06-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab17b1721c05366e592cf805ad6d25e672b314bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab17b17-fix-green.svg" />
</a>
  </td>

  <td>handle ng-packagr errors more gracefully.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d4c5f8518d4801b9fd76de289a015dcbb8d8f69b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d4c5f85-fix-green.svg" />
</a>
  </td>

  <td>control linker template sourcemapping via builder sourcemap options</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06181c2fbf5a20396b2d0e2b3925ceb1276947fb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06181c2-fix-green.svg" />
</a>
  </td>

  <td>parse web-workers in tests when webWorkerTsConfig is defined</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/12c14b56537d65d6986e245ab1ae4dd9aa8dd378"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/12c14b5-fix-green.svg" />
</a>
  </td>

  <td>remove no longer needed component styles workaround</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8ad1539c5e73bad30eb6eb340379d64db208098c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8ad1539-feat-blue.svg" />
</a>
  </td>

  <td>add 'none' value for the 'style' option of the component schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e5ba29c7d54cbd83057cf23a21119ea5a3146993"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e5ba29c-fix-green.svg" />
</a>
  </td>

  <td>display warning during migrations when using third-party builders</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a44dc02feecaf8735f2dc6128a5b6cc5666b4434"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a44dc02-fix-green.svg" />
</a>
  </td>

  <td>add devtools to ng new</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Vaibhav Singh, Joey Perrott, twerske, David Scourfield, hien-pham

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.0"></a>

# v12.1.0 (2021-06-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c146e9c086025e49dd207e039dc738a143e5672e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c146e9c-feat-blue.svg" />
</a>
  </td>

  <td>enable webpack Trusted Types support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb21c4a968c8b4d8a3d17237d0864b795fffba49"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fb21c4a-feat-blue.svg" />
</a>
  </td>

  <td>deprecate protractor builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b35ef57b0f6e3b437ae81d475fb932adc212f939"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b35ef57-feat-blue.svg" />
</a>
  </td>

  <td>suppport using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79c5284892f79de6dfb54b5433a5fa5f6e0cb044"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/79c5284-fix-green.svg" />
</a>
  </td>

  <td>revert open to 8.0.2</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20807">
  [Closes #20807]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/92c9be44fa4510ab6eccd0dfde82696d70412b39"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/92c9be4-fix-green.svg" />
</a>
  </td>

  <td>correctly ignore inline styles during i18n extraction</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0fe6cfef644211e21f71e7166dd017f9e07ab2e2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0fe6cfe-fix-green.svg" />
</a>
  </td>

  <td>use the name as chunk filename instead of id</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab17b1721c05366e592cf805ad6d25e672b314bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab17b17-fix-green.svg" />
</a>
  </td>

  <td>handle ng-packagr errors more gracefully.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d4c5f8518d4801b9fd76de289a015dcbb8d8f69b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d4c5f85-fix-green.svg" />
</a>
  </td>

  <td>control linker template sourcemapping via builder sourcemap options</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06181c2fbf5a20396b2d0e2b3925ceb1276947fb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06181c2-fix-green.svg" />
</a>
  </td>

  <td>parse web-workers in tests when webWorkerTsConfig is defined</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ebf7569f6506a673996dc2f8a7edcc4cbc61d81"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/0ebf756-perf-orange.svg" />
</a>
  </td>

  <td>use CSS optimization plugin that leverages workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f90a8324b46bd96e87a7b889a74aab432a391015"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/f90a832-perf-orange.svg" />
</a>
  </td>

  <td>enable opt-in usage of file system cache</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57640bebfd0de417456db6c5d3cead45d528c055"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/57640be-feat-blue.svg" />
</a>
  </td>

  <td>show Node.js version support status in version command</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20879">
  [Closes #20879]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/77c96f8b2ae219bf69dc9d5278cff39dc981c680"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/77c96f8-fix-green.svg" />
</a>
  </td>

  <td>handle unscoped authentication details in `.npmrc` files</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e9717e58120dc1c91ddb228a8f6d25b94e7401bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e9717e5-fix-green.svg" />
</a>
  </td>

  <td>don't resolve `.npmrc` from parent directories</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/76308fecaa510bebaa869d250ca2102175e1dfd1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/76308fe-feat-blue.svg" />
</a>
  </td>

  <td>support using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f9657bc919a223e449d2dd559347eed85b1f8919"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f9657bc-fix-green.svg" />
</a>
  </td>

  <td>remove redundant inline style cache</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0c2a862db00ccfe3d309c34b3788001c719aa21d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0c2a862-fix-green.svg" />
</a>
  </td>

  <td>ensure plugin provided Webpack instance is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f2f15c089361bb55a809563c55a327887a401d43"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f2f15c0-fix-green.svg" />
</a>
  </td>

  <td>disable caching for ngcc synchronous Webpack resolver</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/12c14b56537d65d6986e245ab1ae4dd9aa8dd378"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/12c14b5-fix-green.svg" />
</a>
  </td>

  <td>remove no longer needed component styles workaround</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4251343aee405275ab3e5d8e3be85cab79047f43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/4251343-feat-blue.svg" />
</a>
  </td>

  <td>create new projects with TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c9f531d70398babba1b1eb96a38dea1068c10f0a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c9f531d-feat-blue.svg" />
</a>
  </td>

  <td>add migration to replace deprecated `--prod`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21036">
  [Closes #21036]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8ad1539c5e73bad30eb6eb340379d64db208098c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8ad1539-feat-blue.svg" />
</a>
  </td>

  <td>add 'none' value for the 'style' option of the component schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e5ba29c7d54cbd83057cf23a21119ea5a3146993"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e5ba29c-fix-green.svg" />
</a>
  </td>

  <td>display warning during migrations when using third-party builders</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a44dc02feecaf8735f2dc6128a5b6cc5666b4434"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a44dc02-fix-green.svg" />
</a>
  </td>

  <td>add devtools to ng new</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Joey Perrott, Bjarki, Vaibhav Singh, twerske, David Scourfield, hien-pham, Alberto Calvo, Paul Gschwendtner, Keen Yee Liau

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.0-next.6"></a>

# v12.1.0-next.6 (2021-06-17)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/071c8d10ce347a8acb40833ef0b2480986625ab5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/071c8d1-fix-green.svg" />
</a>
  </td>

  <td>don't parse `new Worker` syntax when `webWorkerTsConfig` is not defined in karma builder</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21108">
  [Closes #21108]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/83602515faa1f50dbc250f4eb59886984310c490"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8360251-fix-green.svg" />
</a>
  </td>

  <td>explicitly set compilation target in test configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21111">
  [Closes #21111]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0fe6cfef644211e21f71e7166dd017f9e07ab2e2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0fe6cfe-fix-green.svg" />
</a>
  </td>

  <td>use the name as chunk filename instead of id</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f90a8324b46bd96e87a7b889a74aab432a391015"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/f90a832-perf-orange.svg" />
</a>
  </td>

  <td>enable opt-in usage of file system cache</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/77c96f8b2ae219bf69dc9d5278cff39dc981c680"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/77c96f8-fix-green.svg" />
</a>
  </td>

  <td>handle unscoped authentication details in `.npmrc` files</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e9717e58120dc1c91ddb228a8f6d25b94e7401bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e9717e5-fix-green.svg" />
</a>
  </td>

  <td>don't resolve `.npmrc` from parent directories</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c9f531d70398babba1b1eb96a38dea1068c10f0a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c9f531d-feat-blue.svg" />
</a>
  </td>

  <td>add migration to replace deprecated `--prod`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21036">
  [Closes #21036]<br />
</a>

  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Joey Perrott, Alberto Calvo, Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.5"></a>

# v12.0.5 (2021-06-17)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/427c4223488be5564de13c13d4daca85a83a9ad6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/427c422-fix-green.svg" />
</a>
  </td>

  <td>don't parse `new Worker` syntax when `webWorkerTsConfig` is not defined in karma builder</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21108">
  [Closes #21108]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f2ce053885a718f7a040e2ff66deef1fe9042cea"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f2ce053-fix-green.svg" />
</a>
  </td>

  <td>explicitly set compilation target in test configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21111">
  [Closes #21111]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/911b5e4d9cea185dcfb9afd3ce73bf1f258556bc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/911b5e4-fix-green.svg" />
</a>
  </td>

  <td>handle unscoped authentication details in .npmrc files</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.0-next.5"></a>

# v12.1.0-next.5 (2021-06-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b35ef57b0f6e3b437ae81d475fb932adc212f939"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b35ef57-feat-blue.svg" />
</a>
  </td>

  <td>suppport using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/11a414e4689fc33270ee0a99667c9019616a7edb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/11a414e-fix-green.svg" />
</a>
  </td>

  <td>ensure all Webpack Stats assets are present on rebuilds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21038">
  [Closes #21038]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1dd5c28f8d32e382d271a3da2bed25f16e88153a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1dd5c28-fix-green.svg" />
</a>
  </td>

  <td>dispose Sass worker resources on Webpack shutdown</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20985">
  [Closes #20985]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd829675235ad7f862b4ccdfc317ec87e3b34710"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bd82967-fix-green.svg" />
</a>
  </td>

  <td>show progress during re-builds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2d0d82ba5b00944fc201977befee4c70ffbef243"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2d0d82b-fix-green.svg" />
</a>
  </td>

  <td>correctly mark async chunks as non initial in dev-server</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c43ace73835fb2a21f3ff3eceec4e44e05937d72"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c43ace7-fix-green.svg" />
</a>
  </td>

  <td>add web-workers in lazy chunks in stats output</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21059">
  [Closes #21059]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dc5a58528a9612b709fbd0e7bab9122ce7d680e3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dc5a585-fix-green.svg" />
</a>
  </td>

  <td>styles CSS files not available in unit tests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21054">
  [Closes #21054]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/699802d48853cedbf9468b94d196fd8106d43485"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/699802d-perf-orange.svg" />
</a>
  </td>

  <td>reduce memory usage by cleaning output directory before emitting</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/schematics (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a30525b68bc54a75fc0b0cc432b739c1db5da7a1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a30525b-fix-green.svg" />
</a>
  </td>

  <td>handle updating renamed files</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/14255">
  [Closes #14255]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/21083">
  [Closes #21083]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0978ff5dc826b1a861e0492dada5f173b269c648"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0978ff5-fix-green.svg" />
</a>
  </td>

  <td>avoid shell exec when bootstrapping update command</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cf3b22de581104d276806d7083f199049dfc93f1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cf3b22d-fix-green.svg" />
</a>
  </td>

  <td>correctly redirect nested Angular schematic dependency requests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21075">
  [Closes #21075]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/76308fecaa510bebaa869d250ca2102175e1dfd1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/76308fe-feat-blue.svg" />
</a>
  </td>

  <td>support using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0c2a862db00ccfe3d309c34b3788001c719aa21d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0c2a862-fix-green.svg" />
</a>
  </td>

  <td>ensure plugin provided Webpack instance is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f2f15c089361bb55a809563c55a327887a401d43"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f2f15c0-fix-green.svg" />
</a>
  </td>

  <td>disable caching for ngcc synchronous Webpack resolver</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4251343aee405275ab3e5d8e3be85cab79047f43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/4251343-feat-blue.svg" />
</a>
  </td>

  <td>create new projects with TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/052b8fa4db63bf0c08aa95ca727bd18420f19f6e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/052b8fa-fix-green.svg" />
</a>
  </td>

  <td>added webWorkerTsConfig into test option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d13a8661046023419d74c2d626a6b2adc4027c90"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d13a866-fix-green.svg" />
</a>
  </td>

  <td>working with formatting</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Charles Lyding, Alan Agius, Doug Parker, Santosh Mahto, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.4"></a>

# v12.0.4 (2021-06-09)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/10a263a7af99fbdafea799ae6d41d893ad888fb6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/10a263a-fix-green.svg" />
</a>
  </td>

  <td>ensure all Webpack Stats assets are present on rebuilds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21038">
  [Closes #21038]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8575056949e1a8bc7d90d76e7647f7064d69201e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8575056-fix-green.svg" />
</a>
  </td>

  <td>dispose Sass worker resources on Webpack shutdown</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20985">
  [Closes #20985]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2b166566b615e100f17a74e96e65f69c5cb67097"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2b16656-fix-green.svg" />
</a>
  </td>

  <td>show progress during re-builds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/83a9c469282bcbda392d9ba6fd2991b96eeb7c5e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/83a9c46-fix-green.svg" />
</a>
  </td>

  <td>correctly mark async chunks as non initial in dev-server</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3fcf3181f46a6feaf2fa9283f1465bf46f2a0714"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3fcf318-fix-green.svg" />
</a>
  </td>

  <td>add web-workers in lazy chunks in stats output</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21059">
  [Closes #21059]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7604e62e2e8a3ce4f95f11f2804d220c45cb0a04"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7604e62-fix-green.svg" />
</a>
  </td>

  <td>styles CSS files not available in unit tests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21054">
  [Closes #21054]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4c2bd2f5a6de7eb3b1d75998fc80afc9ce8a1143"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/4c2bd2f-perf-orange.svg" />
</a>
  </td>

  <td>reduce memory usage by cleaning output directory before emitting</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/schematics (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4b98448d965080dabaacc8a9cd4f9f1387d2ec65"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4b98448-fix-green.svg" />
</a>
  </td>

  <td>handle updating renamed files</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/14255">
  [Closes #14255]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/21083">
  [Closes #21083]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c00a045d852126bb5dc862b0e5e98ec5915ef045"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c00a045-fix-green.svg" />
</a>
  </td>

  <td>avoid shell exec when bootstrapping update command</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/814f0bb669423baf0f04e15ae739a9d4070a8dc0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/814f0bb-fix-green.svg" />
</a>
  </td>

  <td>correctly redirect nested Angular schematic dependency requests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21075">
  [Closes #21075]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e09dc5c2ae56573e56f64f62421e604f86c91b29"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e09dc5c-fix-green.svg" />
</a>
  </td>

  <td>ensure plugin provided Webpack instance is used</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b867066396e11254c135822fadb12362496af67b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b867066-fix-green.svg" />
</a>
  </td>

  <td>added webWorkerTsConfig into test option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b57580e50b0988ed4b99afbbd0d43170e41fcdce"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b57580e-fix-green.svg" />
</a>
  </td>

  <td>working with formatting</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Santosh Mahto, Joey Perrott, Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.3"></a>

# v12.0.3 (2021-06-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/19ef42a37e705cc81ec18a04fc69d01e14937136"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/19ef42a-fix-green.svg" />
</a>
  </td>

  <td>do not resolve web-workers in server builds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20877">
  [Closes #20877]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/662a2b8409d778fa89761e5ab81afa4c5baaec38"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/662a2b8-fix-green.svg" />
</a>
  </td>

  <td>provided earlier build feedback in console</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20957">
  [Closes #20957]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/83fbaca6428f6581a2a52dee22eb3afdf6287062"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/83fbaca-fix-green.svg" />
</a>
  </td>

  <td>correctly ignore inline styles during i18n extraction</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20968">
  [Closes #20968]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd88af5154e379a2f587edaf594b05f93af38080"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/bd88af5-perf-orange.svg" />
</a>
  </td>

  <td>update `license-webpack-plugin` to `2.3.19`</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c68572f4eab8f129d6948fbe5f238d3d1324f1ed"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/c68572f-perf-orange.svg" />
</a>
  </td>

  <td>include only required stats in webpackStats</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bf1122bd2fc4c50e6e72739f7197b7d1e547ea4f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bf1122b-fix-green.svg" />
</a>
  </td>

  <td>show allowed enum values when validation on enum fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/86161a1ec3fd1bf6d93b50e5dd8ece46fe0fe9a4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/86161a1-fix-green.svg" />
</a>
  </td>

  <td>handle complex smart defaults in schemas</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f457f0e42bc573c72c3a3bbf99d6dda3d996a326"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f457f0e-fix-green.svg" />
</a>
  </td>

  <td>handle async schema validations</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7bba44662b3d7809b45a11d7eca09493e777a762"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7bba446-fix-green.svg" />
</a>
  </td>

  <td>transform path using getSystemPath for NodeJsAsyncHost's `exists` method</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6c2642189ceed3d247cc9df97a9a4ef53dbf99d7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6c26421-fix-green.svg" />
</a>
  </td>

  <td>update supported range of node versions to be less restrictive</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20796">
  [Closes #20796]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff87570b22a57b0ccd0382d3244dfb53d1c4e772"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ff87570-fix-green.svg" />
</a>
  </td>

  <td>normalize paths when adding file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20891">
  [Closes #20891]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a9c3a35fc2777926689928b68d730cbbcddfe200"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a9c3a35-fix-green.svg" />
</a>
  </td>

  <td>remove redundant inline style cache</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06e0a724f67f4c4bdc3d1efe5c8d4c21b7669738"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06e0a72-fix-green.svg" />
</a>
  </td>

  <td>make version 12 workspace config migration idempotent</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20979">
  [Closes #20979]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b36c0c96ec55aa93764ae5b46e932267495d9a8b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b36c0c9-fix-green.svg" />
</a>
  </td>

  <td>show better error when non existing project is passed to the component schematic</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Doug Parker, Charles Lyding, why520crazy

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.0-next.4"></a>

# v12.1.0-next.4 (2021-06-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/77f81dc7f72c218e3b26c92c15b927b505f91240"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/77f81dc-fix-green.svg" />
</a>
  </td>

  <td>do not resolve web-workers in server builds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20877">
  [Closes #20877]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f9acdc75caa52366174649042e2e987b6e5c2a83"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f9acdc7-fix-green.svg" />
</a>
  </td>

  <td>provided earlier build feedback in console</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20957">
  [Closes #20957]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/92c9be44fa4510ab6eccd0dfde82696d70412b39"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/92c9be4-fix-green.svg" />
</a>
  </td>

  <td>correctly ignore inline styles during i18n extraction</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1201.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/023d0937c44f94e297aa0980cb05e9c52d3d0045"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/023d093-perf-orange.svg" />
</a>
  </td>

  <td>include only required stats in webpackStats</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/600d266ca4ea478f8f23664140cdb4c2db26d74c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/600d266-fix-green.svg" />
</a>
  </td>

  <td>show allowed enum values when validation on enum fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9f85bc5625845fd244a123477ed475b28356cf68"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9f85bc5-fix-green.svg" />
</a>
  </td>

  <td>handle complex smart defaults in schemas</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06af7d7e7b6b3f5b854555771db3b60b9484d4b3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06af7d7-fix-green.svg" />
</a>
  </td>

  <td>handle async schema validations</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/966c0aebbc8c80d68c859a0d0ea083c9a1ccbd23"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/966c0ae-fix-green.svg" />
</a>
  </td>

  <td>transform path using getSystemPath for NodeJsAsyncHost's `exists` method</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6467717e0286713c5d9a78b7b70faf0078865dc4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6467717-fix-green.svg" />
</a>
  </td>

  <td>update supported range of node versions to be less restrictive</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20796">
  [Closes #20796]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3afa5567cb6c5ebfb43c2aa447f4c7d6a0e60c75"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3afa556-fix-green.svg" />
</a>
  </td>

  <td>normalize paths when adding file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20891">
  [Closes #20891]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f9657bc919a223e449d2dd559347eed85b1f8919"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f9657bc-fix-green.svg" />
</a>
  </td>

  <td>remove redundant inline style cache</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/afc9d10688ab9308a1a8b51a80e0aedf24b66bfc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/afc9d10-fix-green.svg" />
</a>
  </td>

  <td>make version 12 workspace config migration idempotent</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20979">
  [Closes #20979]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7cd801eb066543fe751ac6b7840c279e37b6e74a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7cd801e-fix-green.svg" />
</a>
  </td>

  <td>show better error when non existing project is passed to the component schematic</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Doug Parker, Charles Lyding, why520crazy

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.0-next.3"></a>

# v12.1.0-next.3 (2021-05-26)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c146e9c086025e49dd207e039dc738a143e5672e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c146e9c-feat-blue.svg" />
</a>
  </td>

  <td>enable webpack Trusted Types support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb21c4a968c8b4d8a3d17237d0864b795fffba49"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fb21c4a-feat-blue.svg" />
</a>
  </td>

  <td>deprecate protractor builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4dc7cf952961183abcd201db6a5747a7b22e5953"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4dc7cf9-fix-green.svg" />
</a>
  </td>

  <td>ensure Sass worker implementation supports Node.js 12.14</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bea90a6130836c79bab5d64f94eb30ddfd5a12ff"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bea90a6-fix-green.svg" />
</a>
  </td>

  <td>don't add `.hot-update.js` script tags</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20855">
  [Closes #20855]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d1953bf1aab39743058cdf73debc8493af503fc0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d1953bf-fix-green.svg" />
</a>
  </td>

  <td>correctly generate ServiceWorker config on Windows</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20894">
  [Closes #20894]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9433bb61799d0078a6b0481acf2fb9f7a659d892"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9433bb6-fix-green.svg" />
</a>
  </td>

  <td>ensure latest inline stylesheet data is used during rebuilds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6e07cb19c0d25a32d51ecc323bbd17eba4ed693f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6e07cb1-fix-green.svg" />
</a>
  </td>

  <td>allow  i18n extraction on application that uses web-workers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20930">
  [Closes #20930]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/02bea8cc18ab3d514eae85fc26f970e962fe689b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/02bea8c-fix-green.svg" />
</a>
  </td>

  <td>hide stacktraces from dart-sass errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/861a69567c48bdb5f985c88262e5e0e70ebf2999"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/861a695-fix-green.svg" />
</a>
  </td>

  <td>resolve absolute outputPath properly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20935">
  [Closes #20935]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7ff41e4e5a61c1e9a165aa629ae04cce2da968b5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7ff41e4-fix-green.svg" />
</a>
  </td>

  <td>show `--disable-host-check` warning only when not using `disableHostCheck`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20951">
  [Closes #20951]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1ab2ef9a3f3d416241db9f34e285da265d9cc27f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/1ab2ef9-perf-orange.svg" />
</a>
  </td>

  <td>disable CSS optimization parallelism for components styles</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20883">
  [Closes #20883]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/640a749515726eb9ee961a7f07a15a8e3b456d92"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/640a749-perf-orange.svg" />
</a>
  </td>

  <td>load postcss-preset-env configuration once</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57640bebfd0de417456db6c5d3cead45d528c055"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/57640be-feat-blue.svg" />
</a>
  </td>

  <td>show Node.js version support status in version command</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20879">
  [Closes #20879]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/15e5bfa55b7a78286026a5097276b141f11d2074"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/15e5bfa-fix-green.svg" />
</a>
  </td>

  <td>ng update on windows to allow path</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5855374eb540d4d23855c6e00018c64be71e8b45"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5855374-fix-green.svg" />
</a>
  </td>

  <td>re-emit component stylesheet assets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20882">
  [Closes #20882]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Bjarki, Hassan Sani, JoostK, George Kalpakas, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.2"></a>

# v12.0.2 (2021-05-26)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6482a64b91ac5ce51e7396836f0089e3d6003d35"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6482a64-fix-green.svg" />
</a>
  </td>

  <td>ensure Sass worker implementation supports Node.js 12.14</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3764a3155b80d22ebc6a08cac8d52e5df59ccd89"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3764a31-fix-green.svg" />
</a>
  </td>

  <td>don't add `.hot-update.js` script tags</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20855">
  [Closes #20855]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/467172ce086196c56eb73c37dd02c21efdbe0e14"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/467172c-fix-green.svg" />
</a>
  </td>

  <td>correctly generate ServiceWorker config on Windows</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20894">
  [Closes #20894]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e741e187a2885c52e97ef084b5cbbf20d9c89fe"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8e741e1-fix-green.svg" />
</a>
  </td>

  <td>ensure latest inline stylesheet data is used during rebuilds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/224dbbc06e77a1044b988909997c6084c828bfe8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/224dbbc-fix-green.svg" />
</a>
  </td>

  <td>allow  i18n extraction on application that uses web-workers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20930">
  [Closes #20930]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb8bd56ceb854ca23946e88925a982b2e2747532"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fb8bd56-fix-green.svg" />
</a>
  </td>

  <td>hide stacktraces from dart-sass errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b0dd4e1ad0235849013e4be049df5e0c75ee8c57"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b0dd4e1-fix-green.svg" />
</a>
  </td>

  <td>resolve absolute outputPath properly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20935">
  [Closes #20935]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/923f56e3ffc0ceb476cd3a5aecfbb17bff105fd6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/923f56e-fix-green.svg" />
</a>
  </td>

  <td>show `--disable-host-check` warning only when not using `disableHostCheck`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20951">
  [Closes #20951]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/394a0012abb7de3712fa8ccceac6ffe9c886d46d"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/394a001-perf-orange.svg" />
</a>
  </td>

  <td>update PostCSS to 8.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/72a7bc0d225d75560c30f295e0a2a0b5ff5802d9"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/72a7bc0-perf-orange.svg" />
</a>
  </td>

  <td>disable CSS optimization parallelism for components styles</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20883">
  [Closes #20883]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/22985624d5d7a867386c94121964e2ded91584c4"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/2298562-perf-orange.svg" />
</a>
  </td>

  <td>load postcss-preset-env configuration once</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f4e1c6712140fbbd71fb6709ae63ccc502ed1fb7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f4e1c67-fix-green.svg" />
</a>
  </td>

  <td>ng update on windows to allow path</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/99cb11712ffa060e20b0d94719288f61285b98c9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/99cb117-fix-green.svg" />
</a>
  </td>

  <td>re-emit component stylesheet assets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20882">
  [Closes #20882]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Hassan Sani, JoostK, George Kalpakas, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.1"></a>

# v12.0.1 (2021-05-19)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6b26f661e6db0f1ac1f7de50f5ab92dbeb554bd3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6b26f66-fix-green.svg" />
</a>
  </td>

  <td>add experimental web-assembly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20762">
  [Closes #20762]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3943f5c1f1e9a9092c337cf8b79007733f664c3b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3943f5c-fix-green.svg" />
</a>
  </td>

  <td>fix error with inline styles when running extract-i18n</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/69da7553235a49caa3f552bc9c9a657b1d4fca5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/69da755-fix-green.svg" />
</a>
  </td>

  <td>add `NG_BUILD_MAX_WORKERS` settimgs to control maximum number of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4ac556ba636952c96685803bf33a442b3982a13d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4ac556b-fix-green.svg" />
</a>
  </td>

  <td>non injected styles should not count as initial</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20781">
  [Closes #20781]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a125e6745afefaa77989e99e4adcfa83e999af71"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a125e67-fix-green.svg" />
</a>
  </td>

  <td>revert open to 8.0.2</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20807">
  [Closes #20807]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1e34e9874057d72261438f33a82c96e1e0b937ed"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1e34e98-fix-green.svg" />
</a>
  </td>

  <td>correctly resolve babel runtime helpers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20800">
  [Closes #20800]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/894feaf8eeb8b22afb7740763750ddd8abaff7d4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/894feaf-fix-green.svg" />
</a>
  </td>

  <td>compile schema in synchronously</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20847">
  [Closes #20847]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b89fdc36123e401a2df11b59b477d842fc8cec15"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/b89fdc3-perf-orange.svg" />
</a>
  </td>

  <td>execute dart-sass in a worker</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d5a46a1ba58a4f116056da205715840066f3a76b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/d5a46a1-perf-orange.svg" />
</a>
  </td>

  <td>reduce JSON stats</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5e72056d6bcbf6b80afe65e0e6374893384e417e"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/5e72056-perf-orange.svg" />
</a>
  </td>

  <td>use CSS optimization plugin that leverages workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7718efe98ad892ffd08d253935f9be7443a4ad9f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/7718efe-perf-orange.svg" />
</a>
  </td>

  <td>render Sass using a pool of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b36a35d6aabac94dc604bac71f3e8619cfdf6b5d"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/b36a35d-perf-orange.svg" />
</a>
  </td>

  <td>clean no-longer used assets during builds</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a8175921880271568066f15e8d3204c411967e88"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a817592-fix-green.svg" />
</a>
  </td>

  <td>cannot locate bin for temporary package</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0694cad3c0ad84847eaa89a2143a0d81458b12b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0694ca-fix-green.svg" />
</a>
  </td>

  <td>clean node modules directory prior to updating</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/effc96196a917162c3d6d52057f2c5658ae15215"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/effc961-fix-green.svg" />
</a>
  </td>

  <td>improve `--prod` deprecation warning</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20806">
  [Closes #20806]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fd9ad77ab854ea5291bd172dc2a004066e46c0df"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fd9ad77-perf-orange.svg" />
</a>
  </td>

  <td>reduce non-watch mode TypeScript diagnostic analysis overhead</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/da99ff904749ed6e9f5b3fe2055af95dff5d8f90"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/da99ff9-fix-green.svg" />
</a>
  </td>

  <td>remove --prod option from README template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0b6a5d38913736a820badf6154760fb23ce47df"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0b6a5d-fix-green.svg" />
</a>
  </td>

  <td>don't add `skipTest` option to module schematic options</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20811">
  [Closes #20811]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f47e45641a2f494b7afdf5db4455ab98e73cc9f2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f47e456-fix-green.svg" />
</a>
  </td>

  <td>add migration to remove `skipTests` from `@schematics/angular:module`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20848">
  [Closes #20848]<br />
</a>

  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Keen Yee Liau, Luca Vazzano, Pankaj Patil, Ryan Lester, Terence D. Honles, Alan Cohen

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.1.0-next.2"></a>

# v12.1.0-next.2 (2021-05-19)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7df9d19297d1160e6b8614f1763e11b307aeef8b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7df9d19-fix-green.svg" />
</a>
  </td>

  <td>add experimental web-assembly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20762">
  [Closes #20762]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4367c3a5626aa92b1301746519602d52bc7cd1b0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4367c3a-fix-green.svg" />
</a>
  </td>

  <td>add `NG_BUILD_MAX_WORKERS` settimgs to control maximum number of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2643fb11a96befa5800683433a65b37c6bbeb6d7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2643fb1-fix-green.svg" />
</a>
  </td>

  <td>non injected styles should not count as initial</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20781">
  [Closes #20781]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79c5284892f79de6dfb54b5433a5fa5f6e0cb044"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/79c5284-fix-green.svg" />
</a>
  </td>

  <td>revert open to 8.0.2</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20807">
  [Closes #20807]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d34dc8853d24195f3e8cf49777664f1a353216a2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d34dc88-fix-green.svg" />
</a>
  </td>

  <td>correctly resolve babel runtime helpers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20800">
  [Closes #20800]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/43926a21ba1b689804d35f282f80842e8c63286a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/43926a2-fix-green.svg" />
</a>
  </td>

  <td>compile schema in synchronously</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20847">
  [Closes #20847]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cc7f75f25b5c38c73912023cd26fd0c82192344c"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/cc7f75f-perf-orange.svg" />
</a>
  </td>

  <td>execute dart-sass in a worker</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d9566bfac84a913b6d6f6dcfb8ae94279d71708b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/d9566bf-perf-orange.svg" />
</a>
  </td>

  <td>reduce JSON stats</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ebf7569f6506a673996dc2f8a7edcc4cbc61d81"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/0ebf756-perf-orange.svg" />
</a>
  </td>

  <td>use CSS optimization plugin that leverages workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/438c6d932e169dbfdf2877daae40f646b7e17667"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/438c6d9-perf-orange.svg" />
</a>
  </td>

  <td>render Sass using a pool of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f5f41ea929444102cede1a6aef8bd75937c45a6e"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/f5f41ea-perf-orange.svg" />
</a>
  </td>

  <td>clean no-longer used assets during builds</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6e34d1bf897dcbf76d8edd40a3d70e4d3f190312"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6e34d1b-fix-green.svg" />
</a>
  </td>

  <td>cannot locate bin for temporary package</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6926b37c0c8093dd5427e80cb8da9e41a15c6cc0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6926b37-fix-green.svg" />
</a>
  </td>

  <td>clean node modules directory prior to updating</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ddb92d815e4030abbce0cb58b460b4d8af8543ae"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ddb92d8-fix-green.svg" />
</a>
  </td>

  <td>improve `--prod` deprecation warning</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20806">
  [Closes #20806]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4f2df00511cdd0d358c040090eca68733539ac0e"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/4f2df00-perf-orange.svg" />
</a>
  </td>

  <td>reduce non-watch mode TypeScript diagnostic analysis overhead</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff752951b0280a029eb77e2ac5bf7cd0eabdbc48"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ff75295-fix-green.svg" />
</a>
  </td>

  <td>remove --prod option from README template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/36b5040cc470cdb2c0554785a9a368ce3c226ad1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/36b5040-fix-green.svg" />
</a>
  </td>

  <td>don't add `skipTest` option to module schematic options</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20811">
  [Closes #20811]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1080a52c963207c731fbad2641dda357e0af539d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1080a52-fix-green.svg" />
</a>
  </td>

  <td>add migration to remove `skipTests` from `@schematics/angular:module`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20848">
  [Closes #20848]<br />
</a>

  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Keen Yee Liau, Luca Vazzano, Pankaj Patil, Ryan Lester, Alan Cohen, Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0"></a>

# v12.0.0 (2021-05-12)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/architect (0.1200.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1da359ac08d1a5503ab152db72ee6cee927391b8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1da359a-feat-blue.svg" />
</a>
  </td>

  <td>add implementation for defaultConfiguration</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/93376177235108ed15a2fbba8ea079bc565802ce"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/9337617-feat-blue.svg" />
</a>
  </td>

  <td>add `postcss-preset-env` with stage 3 features</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fa5cf53-feat-blue.svg" />
</a>
  </td>

  <td>drop support for karma version 5.2</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/44e75be-feat-blue.svg" />
</a>
  </td>

  <td>drop support for ng-packagr version 11</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/aa3ea88-feat-blue.svg" />
</a>
  </td>

  <td>enable inlineCritical by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/71eab3ddb603cb70a98120012a174cb159d9b28d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/71eab3d-feat-blue.svg" />
</a>
  </td>

  <td>show warning during build when project requires IE 11 support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1525e7ab2c3c6cd95ee91cf01243af78174246ca"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1525e7a-feat-blue.svg" />
</a>
  </td>

  <td>expose legacy-migrate message format</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2616ef0d3fdf6821a60f5ae9dcb54d65be0506e1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/2616ef0-feat-blue.svg" />
</a>
  </td>

  <td>integrate JIT mode linker</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20281">
  [Closes #20281]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d883ce5-feat-blue.svg" />
</a>
  </td>

  <td>upgrade to Webpack 5 throughout the build system</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d47b4417d46f85f9f5bb460576d32aa0104e6d43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d47b441-feat-blue.svg" />
</a>
  </td>

  <td>support processing component inline CSS styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac563e5ee1efcda4bfb1334ecc0906796584cbd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bac563e-feat-blue.svg" />
</a>
  </td>

  <td>support specifying stylesheet language for inline component styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a7d1e0be4c59b27e78d1b03c083bdb2982c3845"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6a7d1e0-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `experimentalRollupPass` option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d5645675fd555e7f1afd523d4f2d42095034fc46"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d564567-fix-green.svg" />
</a>
  </td>

  <td>support writing large Webpack stat outputs</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ac4c109bebac3ea3d562f000c46a98d61b1bd148"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ac4c109-fix-green.svg" />
</a>
  </td>

  <td>ensure output directory is present before writing stats JSON</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/012700a-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated View Engine support for i18n extraction</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/677913f-fix-green.svg" />
</a>
  </td>

  <td>remove usage of deprecated View Engine compiler</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/eca5a01-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated i18nLocale and i18nFormat options from i18n-extract</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f1453126666af62a4ac4b4adca7d4282ecac0038"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f145312-fix-green.svg" />
</a>
  </td>

  <td>update karma builder to use non-deprecated API</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd0aba7c80cee63f6fbcb94247fdf3506e9b4afa"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bd0aba7-fix-green.svg" />
</a>
  </td>

  <td>disable webpack cache when using `NG_BUILD_CACHE`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cc52e5453cbf40810f56b6ea443c5f089c635a5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cc52e54-fix-green.svg" />
</a>
  </td>

  <td>remove duplicate application bundle generation complete message</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/27e63e2b33be48b26a44da69c09198ef9a8dce21"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/27e63e2-fix-green.svg" />
</a>
  </td>

  <td>mark programmatic builder execution functions as experimental</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88bea1ad72e5b5df8c7e4870fa49f517c263ba05"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88bea1a-fix-green.svg" />
</a>
  </td>

  <td>avoid double build optimizer processing</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a6e5103b9d3b3c20a5593542823d784e1e68896f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a6e5103-fix-green.svg" />
</a>
  </td>

  <td>replace Webpack 4 `hashForChunk` hook usage</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c53a17886a263e686151c440938233e5f245218d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c53a178-fix-green.svg" />
</a>
  </td>

  <td>use new Webpack watch API in karma webpack plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac34e5268b1aa9348edcf079240668bb6583b5f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bac34e5-fix-green.svg" />
</a>
  </td>

  <td>recover from CSS optimization errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88467b3b659f2ae6a34f2214705d2dec4c046c76"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88467b3-fix-green.svg" />
</a>
  </td>

  <td>disable Webpack 5 automatic public path support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/898a486315a9e2762208c6b95b439751928e1ec7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/898a486-fix-green.svg" />
</a>
  </td>

  <td>always inject live reload client when using live reload</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/656f8d7-fix-green.svg" />
</a>
  </td>

  <td>change several builder options defaults</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7a8686abe9d490f22ff25f6b02709c9e18d3c410"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7a8686a-fix-green.svg" />
</a>
  </td>

  <td>show warning when using stylus</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/33ca65aaa80c22c708c64a19f0374f5493244995"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/33ca65a-fix-green.svg" />
</a>
  </td>

  <td>avoid triggering file change after file build</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57ac7f306b23063f50c5f63edacb9f64685ba00b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/57ac7f3-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `forkTypeChecker` option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c8d2d687108701f6aec0956970683a1c3f03d0e3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c8d2d68-fix-green.svg" />
</a>
  </td>

  <td>disable CSS declaration sorting optimizations</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20693">
  [Closes #20693]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/00ff390feaeb457812d67c367f65ba799d3ac66a"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/00ff390-perf-orange.svg" />
</a>
  </td>

  <td>disable `showCircularDependencies` by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa0fc45b8782910e09689bd40a6f8d2743c5b0ce"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fa0fc45-perf-orange.svg" />
</a>
  </td>

  <td>use Webpack's GC memory caching in watch mode</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a32ed9800eb4494e72537bacae4104692a54d70"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/9a32ed9-perf-orange.svg" />
</a>
  </td>

  <td>improve incremental time during Karma tests</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/54696e788a04c0bfad3514e2e36d420d7dee5aee"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/54696e7-perf-orange.svg" />
</a>
  </td>

  <td>avoid async downlevel for known ES2015 code</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-optimizer (0.1200.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1f83f305db88aeb5164f6d13869f7cc10e44527e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1f83f30-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff32ada86b486d96922c693f703e25e01848d020"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/ff32ada-feat-blue.svg" />
</a>
  </td>

  <td>provide output path in builder results</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/18c954129279d68b5c02c9f486a7db34be5492d1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/18c9541-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e981d08809a7f1084b5cae7a539217d6fe7f757"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8e981d0-feat-blue.svg" />
</a>
  </td>

  <td>add handling for `defaultConfiguration` target definition property</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0875313-feat-blue.svg" />
</a>
  </td>

  <td>update schema validator</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bb3c6cd51d24fe5636cdcf63670ea164f57aa63"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bb3c6c-fix-green.svg" />
</a>
  </td>

  <td>ensure job input values are processed in order</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4a68ad7c4b787c8daff75a80f2a36b6301a509b3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4a68ad7-fix-green.svg" />
</a>
  </td>

  <td>improve handling of set schema values</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20594">
  [Closes #20594]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f7e3e2335dfd6f54f435c95baa024c60a94b791c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f7e3e23-feat-blue.svg" />
</a>
  </td>

  <td>add `defaultConfiguration` property to architect schema</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a5877bf91765af71c1368fd2fb61d29079931205"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/a5877bf-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `--prod` command line argument</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/985dc1a-feat-blue.svg" />
</a>
  </td>

  <td>confirm ng add action before installation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79856644b4d476d50013eafee949d1a508b86104"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7985664-feat-blue.svg" />
</a>
  </td>

  <td>support TypeScript 4.2</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b179a704829fef72191045a443b4b7eb7d20141c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b179a70-fix-green.svg" />
</a>
  </td>

  <td>ensure odd number Node.js version message is a warning</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/065ac4546fbb4928245609d52c1f6d81fdd48cb9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/065ac45-fix-green.svg" />
</a>
  </td>

  <td>remove npm 7 incompatibility notification</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06335515eb05c84d8dfdbfa10f8e3201b714d5da"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0633551-fix-green.svg" />
</a>
  </td>

  <td>avoid exceptions for expected errors in architect commands</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e84fa72751b377ec4cf2419357190a79b0513377"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e84fa72-fix-green.svg" />
</a>
  </td>

  <td>ensure update migrations are fully executed</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8a805fe0b9a0db3329aa51d95a41f3baacd45feb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8a805fe-fix-green.svg" />
</a>
  </td>

  <td>exclude deprecated packages with removal migrations from update</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d68cb92dc2113753e7eefb91e54b70a60c1acd94"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d68cb92-fix-green.svg" />
</a>
  </td>

  <td>add message update updating from non LTS versions of the CLI</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5cc1a4e382b0fb43339bddbf9f2fcbddbda7744a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5cc1a4e-fix-green.svg" />
</a>
  </td>

  <td>ignore `tsickle` during updates</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cd198d5f2f04558bb7f518c6db19a6236f83b620"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cd198d5-fix-green.svg" />
</a>
  </td>

  <td>run all migrations when updating from or between prereleases</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7c288c81a0caa9dba098c49e29f38d9dbd38c55b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7c288c8-fix-green.svg" />
</a>
  </td>

  <td>add package manager name and version in `ng version` output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/07e8bf99903daa72914d192ba6d7a43b7f8652b8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/07e8bf9-fix-green.svg" />
</a>
  </td>

  <td>Support XDG Base Directory Specfication</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3a231300ba046ce1e2a11ab98bb16f1be7ba25a8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3a23130-fix-green.svg" />
</a>
  </td>

  <td>don't display options multiple times in schematics help output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95cb13e6e3377a52cc67f89196ae8322743d3b08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/95cb13e-fix-green.svg" />
</a>
  </td>

  <td>change package installation to async</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc015937b2117f47c0caa5cad265b938d5b1afe6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc01593-fix-green.svg" />
</a>
  </td>

  <td>infer schematic defaults correctly when using `--project`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20666">
  [Closes #20666]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8b0cefbed2e9253313067b5b715844ddac3fd808"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8b0cefb-fix-green.svg" />
</a>
  </td>

  <td>propagate update's force option to package managers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/853fdffcb8752bc2217bdad2d8bb23a26457c63e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/853fdff-fix-green.svg" />
</a>
  </td>

  <td>allow unsetting config when value is `undefined`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0efbe7c67a3edb2dd053fbce2f9debb1bdd180b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0efbe7-fix-green.svg" />
</a>
  </td>

  <td>allow config object to be of JSON.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8524d20fd7484449971df894a977aa5be83cb3ec"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8524d20-fix-green.svg" />
</a>
  </td>

  <td>disallow additional properties in builders sections</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/789e05d800c1093881d24a066fb7881c26332349"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/789e05d-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0dc7327-feat-blue.svg" />
</a>
  </td>

  <td>drop support for string based lazy loading</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/46e9d0e8a646805ba9e48aac1bc95761f2668571"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/46e9d0e-feat-blue.svg" />
</a>
  </td>

  <td>support multiple plugin instances per compilation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5e5b2d9b1a15dc0f4f1690bab109bdd8e5613be3"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/5e5b2d9-feat-blue.svg" />
</a>
  </td>

  <td>support generating data URIs for inline component styles in JIT</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8c7d56e03adb9c3303760fc2e38e2d6d96452bac"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8c7d56e-feat-blue.svg" />
</a>
  </td>

  <td>support processing inline component styles in AOT</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3504c43e48d8e265ca0943005f3cea2d25290cbd"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3504c43-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack 5 deprecation warning in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/430ee441bd2e5729a8a24f72a1df8fd782c9f9f6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/430ee44-fix-green.svg" />
</a>
  </td>

  <td>use correct Webpack asset stage in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/160102a-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack plugin for deprecated ViewEngine compiler</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ca5ceaa10780bf5d05262bd2bc2e5909d51d3aa9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ca5ceaa-fix-green.svg" />
</a>
  </td>

  <td>only track actual resource file dependencies</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95aa2b8f925ee295b8edf659b5d8e706d122ffec"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/95aa2b8-perf-orange.svg" />
</a>
  </td>

  <td>avoid adding transitive dependencies to Webpack's dependency graph</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dfefd6ba4fcda6baa3dc172978ca84acaa48ec54"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/dfefd6b-perf-orange.svg" />
</a>
  </td>

  <td>use precalculated dependencies in unused file check</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aeebd14f04b8e520b0144a77e765da807a08dda0"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/aeebd14-perf-orange.svg" />
</a>
  </td>

  <td>only check affected files for Angular semantic diagnostics</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/22ac3b387c2a4231556e188bb7e6d9eda6989a39"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/22ac3b3-perf-orange.svg" />
</a>
  </td>

  <td>cache results of processed inline resources</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/057ba0cfefe9ae22bc90ffa4d7ab2aebd4848c93"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/057ba0c-perf-orange.svg" />
</a>
  </td>

  <td>rebuild Angular required files asynchronously</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1ec630fa88bfc818eea9d0810b2c7a6bf8268eb5"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/1ec630f-perf-orange.svg" />
</a>
  </td>

  <td>reduce source file and Webpack module iteration</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f424529d9ccaeb16643a8383ad3647af82062b16"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f424529-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove deprecated options from 'angular.json'</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b105ed63c7610dd1397a3d24d4a7439564a019aa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b105ed6-feat-blue.svg" />
</a>
  </td>

  <td>strict mode by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bb38f85202f749040b241c8277280fab21c3379c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bb38f85-feat-blue.svg" />
</a>
  </td>

  <td>use new zone.js entry-points</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7d57dd2f3e7d36cc4ed2c356f79139486790cbfa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7d57dd2-feat-blue.svg" />
</a>
  </td>

  <td>add migration to use new zone.js entry-points</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/96a4467ce90fb6b88f5be39f73c8fd64ce057a4a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/96a4467-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove emitDecoratorMetadata</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1199205bc2844e2c83d8f8e5092e89f8bd24eec1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1199205-feat-blue.svg" />
</a>
  </td>

  <td>augment `universal` schematics to import `platform-server` shims</td>

  <td>
<a href="https://github.com/angular/angular/issues/40559">
  [Closes #40559]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d19d2ccae55f96d4d8260da6572f34a47616a89b"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d19d2cc-feat-blue.svg" />
</a>
  </td>

  <td>update new project dependencies version</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20106">
  [Closes #20106]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1de6d71edd899465a01c65790f6fb04159acc821"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1de6d71-feat-blue.svg" />
</a>
  </td>

  <td>production builds by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3b7470d4836bcfff31ee4bf90ec4396f2905c633"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3b7470d-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `legacyBrowsers` application and ng-new option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f4875b967ae9ca5640cb27bfb37166528cab88d8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f4875b9-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove `lazyModules` configuration option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3ee12af89be58ccea8996e2e86a18a23d193abbe"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3ee12af-feat-blue.svg" />
</a>
  </td>

  <td>add migration to update lazy loading string syntax to use dynamic imports</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81129e12d0ae4cbaeb5ab537facb7990be9b8b45"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/81129e1-feat-blue.svg" />
</a>
  </td>

  <td>update several TypeScript compilation target (Syntax)</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/226a8d274d27d191651926bc7970af11cfee2597"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/226a8d2-feat-blue.svg" />
</a>
  </td>

  <td>remove tslint and codelyzer from new projects</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20105">
  [Closes #20105]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/18465">
  [Closes #18465]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c7e126609f4a0d86bd47a226717ab6430fd85cfd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c7e1266-feat-blue.svg" />
</a>
  </td>

  <td>add production by default optional migration</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f22f7e7371c0daa2dc59110cd21e3ff3fb4620d5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f22f7e7-feat-blue.svg" />
</a>
  </td>

  <td>update new workspaces to use Karma 6.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8582ddc-feat-blue.svg" />
</a>
  </td>

  <td>remove `entryComponent` from `component` schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/695a01ba02b8c6e9656ed5ed5b0c5e17760ba21d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/695a01b-feat-blue.svg" />
</a>
  </td>

  <td>configure new libraries to be published in Ivy partial mode</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/84e023120864c014a2d1a275265c0941a0a16df2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/84e0231-feat-blue.svg" />
</a>
  </td>

  <td>update `jasmine-spec-reporter` to version 7</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e33a3061f02828303e3c6ef508b5b23cbc73eef2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/e33a306-feat-blue.svg" />
</a>
  </td>

  <td>migrate web workers to support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/575b1a75b17f0b03748c137c07976e00be4c8b51"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/575b1a7-fix-green.svg" />
</a>
  </td>

  <td>only update removed v12 options in migration</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ba6f546a026a3dba613c1c54ce0c767fe0940d0f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ba6f546-fix-green.svg" />
</a>
  </td>

  <td>add `additionalProperties` to all schemas</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/663c4bc9c10aa3df3defa188a1ba8f90c63b2722"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/663c4bc-fix-green.svg" />
</a>
  </td>

  <td>remove references to the prod flag</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bf831fac6166f6943a78b34bfd5f3c167f8911d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bf831f-fix-green.svg" />
</a>
  </td>

  <td>only show legacy browsers deprecation warning when option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/09daf7a7e0886738f25f071aa5e072e1dc06bf7e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/09daf7a-fix-green.svg" />
</a>
  </td>

  <td>remove leftover workspace tslint config</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb14945c02a3f150d6965e77324416b1ec7cc575"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fb14945-fix-green.svg" />
</a>
  </td>

  <td>correctly handle adding multi-line strings to `@NgModule` metadata</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/645353db26e9d6e8f893322a52b320ccd5ca1d5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/645353d-fix-green.svg" />
</a>
  </td>

  <td>run update-i18n migration for server builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/df988c249363682aa6f9d3d95ae3b8636e24ebf9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/df988c2-fix-green.svg" />
</a>
  </td>

  <td>update web-worker to support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1bf976f663e938164eb3ff55540ea0b3934d3a00"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1bf976f-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` when application `style` option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab44cb2df79da301dc5cde167bc8a51cfe15e1d6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab44cb2-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` for universal if present in build options</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/21b601b5a77a70c6239249833e8639d7dd9cee98"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/21b601b-fix-green.svg" />
</a>
  </td>

  <td>remove jasmine-spec-reporter and ts-node from default workspace</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81471c06cf8583ec81a409c2c8037edf784c945e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/81471c0-fix-green.svg" />
</a>
  </td>

  <td>remove Protractor from home page</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc3f8dc34265f9a31dffd92598a03c0d8fe88aa5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc3f8dc-fix-green.svg" />
</a>
  </td>

  <td>remove lint command from package.json</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20618">
  [Closes #20618]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ca35b1d47fa5003e4ed5d821b5573d6352a4dcc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0ca35b1-fix-green.svg" />
</a>
  </td>

  <td>fix migration for namedChunks and option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/82158881a49b3104783c971e8a8155480fe13042"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8215888-fix-green.svg" />
</a>
  </td>

  <td>add "type" option in enum schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/89360ab4876db6fcf92f5508971da49228543e08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/89360ab-fix-green.svg" />
</a>
  </td>

  <td>only run `emitDecoratorMetadata` removal migration in safe workspaces</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ec7f3ad19c21e7a7106ff6a44edf676168b46054"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ec7f3ad-fix-green.svg" />
</a>
  </td>

  <td>replace `clientProject` with `project`</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

<a href="#breaking-changes">&nbsp;</a>

# Breaking Changes

<h3>
    @schematics/angular: remove `stylus` from `style` options (<a href="https://github.com/angular/angular-cli/commit/fd729aca0e74c242797d4697786fbede06bc844b">fd729ac</a>)
</h3>
`styl` (Stylus) is no longer a supported value as `style` in `application`, `component`, `ng-new` schematics. Stylus is not actively maintained and only 0.3% of the Angular CLI users use it.

(cherry picked from commit 0272fc55b67d1a3f986b996c8eb21aea31eedf51)

<h3>
    @angular-devkit/build-angular: change several builder options defaults (<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007">656f8d7</a>)
</h3>
A number of browser and server builder options have had their default values changed. The aim of these changes is to reduce the configuration complexity and support the new "production builds by default" initiative.

**Browser builder**
| Option | Previous default value | New default value |
|----------------------------------------|---------------------------|-------------------|
| optimization | false | true |
| aot | false | true |
| buildOptimizer | false | true |
| sourceMap | true | false |
| extractLicenses | false | true |
| namedChunks | true | false |
| vendorChunk | true | false |

**Server builder**
| Option | Previous default value | New default value |
|---------------|------------------------|-------------------|
| optimization | false | true |
| sourceMap | true | false |

(cherry picked from commit 0a74d0d28daf68510459ed73ef048c91bfcabbbc)

<h3>
    @angular-devkit/core: update schema validator (<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69">0875313</a>)
</h3>
support for JSON Schema draft-04 and draft-06 is removed. If you have schemas using the `id` keyword replace them with `$id`. For an interim period we will auto rename any top level `id` keyword to `$id`.

**NB**: This change only effects schematics and builders authors.

<h3>
    @angular-devkit/build-angular: upgrade to Webpack 5 throughout the build system (<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8">d883ce5</a>)
</h3>
Webpack 5 lazy loaded file name changes
Webpack 5 generates similar but differently named files for lazy loaded JavaScript files in development configurations (when the `namedChunks` option is enabled).
For the majority of users this change should have no effect on the application and/or build process. Production builds should also not be affected as the `namedChunks` option is disabled by default in production configurations.
However, if a project's post-build process makes assumptions as to the file names then adjustments may need to be made to account for the new naming paradigm.
Such post-build processes could include custom file transformations after the build, integration into service-side frameworks, or deployment procedures.
Example development file name change: `lazy-lazy-module.js` --> `src_app_lazy_lazy_module_ts.js`

Webpack 5 now includes web worker support. However, the structure of the URL within the `Worker` constructor must be in a specific format that differs from the current requirement.
Web worker usage should be updated as shown below (where `./app.worker` should be replaced with the actual worker name):
Before: `new Worker('./app.worker', ...)`
After: `new Worker(new URL('./app.worker', import.meta.url), ...)`

<h3>
    @ngtools/webpack: remove Webpack plugin for deprecated ViewEngine compiler (<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d">160102a</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the View Engine Webpack plugin has been removed.
The Ivy-based Webpack plugin is the default used within the Angular CLI.
If using a custom standalone Webpack configuration, the removed `AngularCompilerPlugin` should be replaced with the Ivy-based `AngularWebpackPlugin`.

<h3>
    @angular-devkit/build-angular: remove deprecated i18n options from server and browser builder (<a href="https://github.com/angular/angular-cli/commit/5cf9a08dc7a1c84568d00df8f957d55b10ce0193">5cf9a08</a>)
</h3>
Removal of deprecated browser and server command options.
- `i18nFile`,  use `locales` object in the project metadata instead.
- `i18nFormat`, No longer needed as the format will be determined automatically.
- `i18nLocale`, use `localize` option instead.

<h3>
    @angular-devkit/build-angular: remove deprecated i18nLocale and i18nFormat options from i18n-extract (<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031">eca5a01</a>)
</h3>
Removal of deprecated `extract-i18n` command options
The deprecated `i18nLocale` option has been removed and the `i18n.sourceLocale` within a project's configuration should be used instead.
The deprecated `i18nFormat` option has been removed and the `format` option should be used instead.

<h3>
    @angular-devkit/build-angular: remove usage of deprecated View Engine compiler (<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35">677913f</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, Ivy-based compilation will always be used when building an application.
The default behavior for applications is to use the Ivy compiler when building and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and an Ivy-based build will be attempted. If the build fails,
the application may need to be updated to become Ivy compatible.

<h3>
    @schematics/angular: remove `entryComponent` from `component` schematic (<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455">8582ddc</a>)
</h3>
`entryComponent` option has been removed from the `component` schematic as this was intended to be used with the the now no longer supported ViewEngine rendering engine.

<h3>
    @angular-devkit/build-angular: remove view engine app-shell generation (<a href="https://github.com/angular/angular-cli/commit/1c2aeeb46a23fd511c89f9c8800ac2a5ab0c2734">1c2aeeb</a>)
</h3>
App-shell builder now only supports generation using Ivy

<h3>
    @angular-devkit/build-angular: remove deprecated View Engine support for i18n extraction (<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e">012700a</a>)
</h3>
Removal of View Engine support from i18n extraction
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the `ng extract-i18n` command will now always use the Ivy compiler.
The `--ivy` option has also been removed as Ivy-based extraction is always enabled.
The default behavior for applications is to use the Ivy compiler for building/extraction and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and Ivy-based extraction will be attempted. If the extraction fails,
the application may need to be updated to become Ivy compatible.

<h3>
    @angular/cli: confirm ng add action before installation (<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e">985dc1a</a>)
</h3>
The `ng add` command will now ask the user to confirm the package and version prior to installing and executing an uninstalled package.
This new behavior allows a user to abort the action if the version selected is not appropriate or if a typo occurred on the command line and an incorrect package would be installed.
A `--skip-confirmation` option has been added to skip the prompt and directly install and execute the package. This option is useful in CI and non-TTY scenarios such as automated scripts.

<h3>
    @angular-devkit/build-angular: remove deprecated `lazyModules` option (<a href="https://github.com/angular/angular-cli/commit/8d669123236c49e7f6bee1a7171c002abe03df1a">8d66912</a>)
</h3>
Server and Browser builder `lazyModules` option has been removed without replacement.

<h3>
    @ngtools/webpack: drop support for string based lazy loading (<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5">0dc7327</a>)
</h3>
With this change we drop support for string based lazy loading `./lazy.module#LazyModule`  use dynamic imports instead.

The following options which were used to support the above syntax were removed without replacement.

- discoverLazyRoutes
- additionalLazyModules
- additionalLazyModuleResources
- contextElementDependencyConstructor

<h3>
    @angular-devkit/build-angular: enable inlineCritical by default (<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908">aa3ea88</a>)
</h3>
Critical CSS inlining is now enabled by default. If you wish to turn this off set `inlineCritical` to `false`.

See: https://angular.io/guide/workspace-config#optimization-configuration

<h3>
    @angular-devkit/build-angular: drop support for zone.js 0.10 (<a href="https://github.com/angular/angular-cli/commit/f309516bcdcee711fc5693b5f14d6fef1cfa5dba">f309516</a>)
</h3>
Minimum supported `zone.js` version is `0.11.4`

<h3>
    @angular-devkit/build-angular: drop support for ng-packagr version 11 (<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1">44e75be</a>)
</h3>
Minimum supported `ng-packagr` version is `12.0.0-next`

<h3>
    @angular-devkit/build-angular: drop support for karma version 5.2 (<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053">fa5cf53</a>)
</h3>
Minimum supported `karma` version is `6.0.0`

<h3>
    set minimum Node.js version to 12.13 (<a href="https://github.com/angular/angular-cli/commit/d1f616930de4a8312e3441410098d9f248855d9d">d1f6169</a>)
</h3>
Node.js version 10 will become EOL on 2021-04-30.
Angular CLI 12 will require Node.js 12.13+ or 14.15+. Node.js 12.13 and 14.15 are the first LTS releases for their respective majors.

<h3>
    @angular-devkit/build-angular: remove file-loader dependency (<a href="https://github.com/angular/angular-cli/commit/6732294ff34ca35698cec5a9ca91b664dd684289">6732294</a>)
</h3>
The unsupported/undocumented, Webpack specific functionality to `import`/`require()` a non-module file has been removed.

Before

```js
import img from './images/asset.png';
```

After

```html
<img src="images/asset.png" />
```

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Joey Perrott, Doug Parker, Cédric Exbrayat, Douglas Parker, George Kalpakas, Sam Bulatov, Joshua Chapman, Santosh Yadav, David Shevitz, Kristiyan Kostadinov

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.3"></a>

# v12.0.0-rc.3 (2021-05-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8b0cefbed2e9253313067b5b715844ddac3fd808"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8b0cefb-fix-green.svg" />
</a>
  </td>

  <td>propagate update's force option to package managers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/853fdffcb8752bc2217bdad2d8bb23a26457c63e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/853fdff-fix-green.svg" />
</a>
  </td>

  <td>allow unsetting config when value is `undefined`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0efbe7c67a3edb2dd053fbce2f9debb1bdd180b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0efbe7-fix-green.svg" />
</a>
  </td>

  <td>allow config object to be of JSON.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8524d20fd7484449971df894a977aa5be83cb3ec"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8524d20-fix-green.svg" />
</a>
  </td>

  <td>disallow additional properties in builders sections</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.2"></a>

# v12.0.0-rc.2 (2021-05-05)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c8d2d687108701f6aec0956970683a1c3f03d0e3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c8d2d68-fix-green.svg" />
</a>
  </td>

  <td>disable CSS declaration sorting optimizations</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20693">
  [Closes #20693]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3a231300ba046ce1e2a11ab98bb16f1be7ba25a8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3a23130-fix-green.svg" />
</a>
  </td>

  <td>don't display options multiple times in schematics help output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95cb13e6e3377a52cc67f89196ae8322743d3b08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/95cb13e-fix-green.svg" />
</a>
  </td>

  <td>change package installation to async</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc015937b2117f47c0caa5cad265b938d5b1afe6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc01593-fix-green.svg" />
</a>
  </td>

  <td>infer schematic defaults correctly when using `--project`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20666">
  [Closes #20666]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/057ba0cfefe9ae22bc90ffa4d7ab2aebd4848c93"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/057ba0c-perf-orange.svg" />
</a>
  </td>

  <td>rebuild Angular required files asynchronously</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1ec630fa88bfc818eea9d0810b2c7a6bf8268eb5"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/1ec630f-perf-orange.svg" />
</a>
  </td>

  <td>reduce source file and Webpack module iteration</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/82158881a49b3104783c971e8a8155480fe13042"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8215888-fix-green.svg" />
</a>
  </td>

  <td>add "type" option in enum schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/89360ab4876db6fcf92f5508971da49228543e08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/89360ab-fix-green.svg" />
</a>
  </td>

  <td>only run `emitDecoratorMetadata` removal migration in safe workspaces</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ec7f3ad19c21e7a7106ff6a44edf676168b46054"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ec7f3ad-fix-green.svg" />
</a>
  </td>

  <td>replace `clientProject` with `project`</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Sam Bulatov, Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.1"></a>

# v12.0.0-rc.1 (2021-04-28)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57ac7f306b23063f50c5f63edacb9f64685ba00b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/57ac7f3-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `forkTypeChecker` option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/46a5261cd0e857501d616ee9dbae41415498c54b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/46a5261-fix-green.svg" />
</a>
  </td>

  <td>output webpack-dev-server and webpack-dev-middleware errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a32ed9800eb4494e72537bacae4104692a54d70"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/9a32ed9-perf-orange.svg" />
</a>
  </td>

  <td>improve incremental time during Karma tests</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/54696e788a04c0bfad3514e2e36d420d7dee5aee"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/54696e7-perf-orange.svg" />
</a>
  </td>

  <td>avoid async downlevel for known ES2015 code</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4a68ad7c4b787c8daff75a80f2a36b6301a509b3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4a68ad7-fix-green.svg" />
</a>
  </td>

  <td>improve handling of set schema values</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20594">
  [Closes #20594]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7c288c81a0caa9dba098c49e29f38d9dbd38c55b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7c288c8-fix-green.svg" />
</a>
  </td>

  <td>add package manager name and version in `ng version` output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/07e8bf99903daa72914d192ba6d7a43b7f8652b8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/07e8bf9-fix-green.svg" />
</a>
  </td>

  <td>Support XDG Base Directory Specfication</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/21b601b5a77a70c6239249833e8639d7dd9cee98"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/21b601b-fix-green.svg" />
</a>
  </td>

  <td>remove jasmine-spec-reporter and ts-node from default workspace</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81471c06cf8583ec81a409c2c8037edf784c945e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/81471c0-fix-green.svg" />
</a>
  </td>

  <td>remove Protractor from home page</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc3f8dc34265f9a31dffd92598a03c0d8fe88aa5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc3f8dc-fix-green.svg" />
</a>
  </td>

  <td>remove lint command from package.json</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20618">
  [Closes #20618]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dd1d4efd592e5ed5338e17e80042e10dbf29eb8d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dd1d4ef-fix-green.svg" />
</a>
  </td>

  <td>avoid unuse imports for canLoad guard generation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ca35b1d47fa5003e4ed5d821b5573d6352a4dcc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0ca35b1-fix-green.svg" />
</a>
  </td>

  <td>fix migration for namedChunks and option</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/schematics-cli (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/94957d18bc80110614116996d83f68d8433c9ab8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/94957d1-fix-green.svg" />
</a>
  </td>

  <td>accept windows like paths for schematics</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Cédric Exbrayat, Doug Parker, Joshua Chapman, Billy Lando, Santosh Yadav, mzocateli

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.0"></a>

# v12.0.0-rc.0 (2021-04-21)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88bea1ad72e5b5df8c7e4870fa49f517c263ba05"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88bea1a-fix-green.svg" />
</a>
  </td>

  <td>avoid double build optimizer processing</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a6e5103b9d3b3c20a5593542823d784e1e68896f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a6e5103-fix-green.svg" />
</a>
  </td>

  <td>replace Webpack 4 `hashForChunk` hook usage</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c53a17886a263e686151c440938233e5f245218d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c53a178-fix-green.svg" />
</a>
  </td>

  <td>use new Webpack watch API in karma webpack plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac34e5268b1aa9348edcf079240668bb6583b5f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bac34e5-fix-green.svg" />
</a>
  </td>

  <td>recover from CSS optimization errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88467b3b659f2ae6a34f2214705d2dec4c046c76"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88467b3-fix-green.svg" />
</a>
  </td>

  <td>disable Webpack 5 automatic public path support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/898a486315a9e2762208c6b95b439751928e1ec7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/898a486-fix-green.svg" />
</a>
  </td>

  <td>always inject live reload client when using live reload</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/656f8d7-fix-green.svg" />
</a>
  </td>

  <td>change several builder options defaults</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7a8686abe9d490f22ff25f6b02709c9e18d3c410"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7a8686a-fix-green.svg" />
</a>
  </td>

  <td>show warning when using stylus</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a11f4644861616f7d0929e62ae9833e795dd8649"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a11f464-fix-green.svg" />
</a>
  </td>

  <td>set Tailwind CSS mode when using Tailwind</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/33ca65aaa80c22c708c64a19f0374f5493244995"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/33ca65a-fix-green.svg" />
</a>
  </td>

  <td>avoid triggering file change after file build</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa0fc45b8782910e09689bd40a6f8d2743c5b0ce"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fa0fc45-perf-orange.svg" />
</a>
  </td>

  <td>use Webpack's GC memory caching in watch mode</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5cc1a4e382b0fb43339bddbf9f2fcbddbda7744a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5cc1a4e-fix-green.svg" />
</a>
  </td>

  <td>ignore `tsickle` during updates</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cd198d5f2f04558bb7f518c6db19a6236f83b620"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cd198d5-fix-green.svg" />
</a>
  </td>

  <td>run all migrations when updating from or between prereleases</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ca5ceaa10780bf5d05262bd2bc2e5909d51d3aa9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ca5ceaa-fix-green.svg" />
</a>
  </td>

  <td>only track actual resource file dependencies</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/22ac3b387c2a4231556e188bb7e6d9eda6989a39"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/22ac3b3-perf-orange.svg" />
</a>
  </td>

  <td>cache results of processed inline resources</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1bf976f663e938164eb3ff55540ea0b3934d3a00"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1bf976f-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` when application `style` option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab44cb2df79da301dc5cde167bc8a51cfe15e1d6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab44cb2-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` for universal if present in build options</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @schematics/angular: remove `stylus` from `style` options (<a href="https://github.com/angular/angular-cli/commit/fd729aca0e74c242797d4697786fbede06bc844b">fd729ac</a>)
</h3>
`styl` (Stylus) is no longer a supported value as `style` in `application`, `component`, `ng-new` schematics. Stylus is not actively maintained and only 0.3% of the Angular CLI users use it.

(cherry picked from commit 0272fc55b67d1a3f986b996c8eb21aea31eedf51)

<h3>
    @angular-devkit/build-angular: change several builder options defaults (<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007">656f8d7</a>)
</h3>
A number of browser and server builder options have had their default values changed. The aim of these changes is to reduce the configuration complexity and support the new "production builds by default" initiative.

**Browser builder**
| Option | Previous default value | New default value |
|----------------------------------------|---------------------------|-------------------|
| optimization | false | true |
| aot | false | true |
| buildOptimizer | false | true |
| sourceMap | true | false |
| extractLicenses | false | true |
| namedChunks | true | false |
| vendorChunk | true | false |

**Server builder**
| Option | Previous default value | New default value |
|---------------|------------------------|-------------------|
| optimization | false | true |
| sourceMap | true | false |

(cherry picked from commit 0a74d0d28daf68510459ed73ef048c91bfcabbbc)

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Joey Perrott, David Shevitz

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.9"></a>

# v12.0.0-next.9 (2021-04-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d883ce5-feat-blue.svg" />
</a>
  </td>

  <td>upgrade to Webpack 5 throughout the build system</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d47b4417d46f85f9f5bb460576d32aa0104e6d43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d47b441-feat-blue.svg" />
</a>
  </td>

  <td>support processing component inline CSS styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac563e5ee1efcda4bfb1334ecc0906796584cbd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bac563e-feat-blue.svg" />
</a>
  </td>

  <td>support specifying stylesheet language for inline component styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f1453126666af62a4ac4b4adca7d4282ecac0038"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f145312-fix-green.svg" />
</a>
  </td>

  <td>update karma builder to use non-deprecated API</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd0aba7c80cee63f6fbcb94247fdf3506e9b4afa"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bd0aba7-fix-green.svg" />
</a>
  </td>

  <td>disable webpack cache when using `NG_BUILD_CACHE`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cc52e5453cbf40810f56b6ea443c5f089c635a5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cc52e54-fix-green.svg" />
</a>
  </td>

  <td>remove duplicate application bundle generation complete message</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/27e63e2b33be48b26a44da69c09198ef9a8dce21"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/27e63e2-fix-green.svg" />
</a>
  </td>

  <td>mark programmatic builder execution functions as experimental</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/18c954129279d68b5c02c9f486a7db34be5492d1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/18c9541-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0875313-feat-blue.svg" />
</a>
  </td>

  <td>update schema validator</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d68cb92dc2113753e7eefb91e54b70a60c1acd94"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d68cb92-fix-green.svg" />
</a>
  </td>

  <td>add message update updating from non LTS versions of the CLI</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/46e9d0e8a646805ba9e48aac1bc95761f2668571"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/46e9d0e-feat-blue.svg" />
</a>
  </td>

  <td>support multiple plugin instances per compilation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5e5b2d9b1a15dc0f4f1690bab109bdd8e5613be3"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/5e5b2d9-feat-blue.svg" />
</a>
  </td>

  <td>support generating data URIs for inline component styles in JIT</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8c7d56e03adb9c3303760fc2e38e2d6d96452bac"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8c7d56e-feat-blue.svg" />
</a>
  </td>

  <td>support processing inline component styles in AOT</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/695a01ba02b8c6e9656ed5ed5b0c5e17760ba21d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/695a01b-feat-blue.svg" />
</a>
  </td>

  <td>configure new libraries to be published in Ivy partial mode</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/84e023120864c014a2d1a275265c0941a0a16df2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/84e0231-feat-blue.svg" />
</a>
  </td>

  <td>update `jasmine-spec-reporter` to version 7</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e33a3061f02828303e3c6ef508b5b23cbc73eef2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/e33a306-feat-blue.svg" />
</a>
  </td>

  <td>migrate web workers to support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/df988c249363682aa6f9d3d95ae3b8636e24ebf9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/df988c2-fix-green.svg" />
</a>
  </td>

  <td>update web-worker to support Webpack 5</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/core: update schema validator (<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69">0875313</a>)
</h3>
support for JSON Schema draft-04 and draft-06 is removed. If you have schemas using the `id` keyword replace them with `$id`. For an interim period we will auto rename any top level `id` keyword to `$id`.

**NB**: This change only effects schematics and builders authors.

<h3>
    @angular-devkit/build-angular: upgrade to Webpack 5 throughout the build system (<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8">d883ce5</a>)
</h3>
Webpack 5 generates similar but differently named files for lazy loaded JavaScript files in development configurations (when the `namedChunks` option is enabled).
For the majority of users this change should have no effect on the application and/or build process. Production builds should also not be affected as the `namedChunks` option is disabled by default in production configurations.
However, if a project's post-build process makes assumptions as to the file names then adjustments may need to be made to account for the new naming paradigm.
Such post-build processes could include custom file transformations after the build, integration into service-side frameworks, or deployment procedures.
Example development file name change: `lazy-lazy-module.js` --> `src_app_lazy_lazy_module_ts.js`

<h3>
    @angular-devkit/build-angular: upgrade to Webpack 5 throughout the build system (<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8">d883ce5</a>)
</h3>
Webpack 5 now includes web worker support. However, the structure of the URL within the `Worker` constructor must be in a specific format that differs from the current requirement.
Web worker usage should be updated as shown below (where `./app.worker` should be replaced with the actual worker name):

Before:

```
new Worker('./app.worker', ...)
```

After:

```
new Worker(new URL('./app.worker', import.meta.url), ...)
```

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Doug Parker, Douglas Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.8"></a>

# v12.0.0-next.8 (2021-04-07)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.8)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/eca5a01-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated i18nLocale and i18nFormat options from i18n-extract</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.8)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/160102a-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack plugin for deprecated ViewEngine compiler</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.8)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/645353db26e9d6e8f893322a52b320ccd5ca1d5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/645353d-fix-green.svg" />
</a>
  </td>

  <td>run update-i18n migration for server builder</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @ngtools/webpack: remove Webpack plugin for deprecated ViewEngine compiler (<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d">160102a</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the View Engine Webpack plugin has been removed.
The Ivy-based Webpack plugin is the default used within the Angular CLI.
If using a custom standalone Webpack configuration, the removed `AngularCompilerPlugin` should be replaced with the Ivy-based `AngularWebpackPlugin`.

<h3>
    @angular-devkit/build-angular: remove deprecated i18n options from server and browser builder (<a href="https://github.com/angular/angular-cli/commit/5cf9a08dc7a1c84568d00df8f957d55b10ce0193">5cf9a08</a>)
</h3>
Removal of deprecated browser and server command options.
- `i18nFile`,  use `locales` object in the project metadata instead.
- `i18nFormat`, No longer needed as the format will be determined automatically.
- `i18nLocale`, use `localize` option instead.

<h3>
    @angular-devkit/build-angular: remove deprecated i18nLocale and i18nFormat options from i18n-extract (<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031">eca5a01</a>)
</h3>
Removal of deprecated `extract-i18n` command options
The deprecated `i18nLocale` option has been removed and the `i18n.sourceLocale` within a project's configuration should be used instead.
The deprecated `i18nFormat` option has been removed and the `format` option should be used instead.

---

# Special Thanks

Charles Lyding, Renovate Bot, Alan Agius, Doug Parker, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.7"></a>

# v12.0.0-next.7 (2021-04-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/51cb3181ea947b851bab42e816a87bb181dad15e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/51cb318-fix-green.svg" />
</a>
  </td>

  <td>validate scripts and styles bundleName</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20360">
  [Closes #20360]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/012700a-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated View Engine support for i18n extraction</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/677913f-fix-green.svg" />
</a>
  </td>

  <td>remove usage of deprecated View Engine compiler</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e84fa72751b377ec4cf2419357190a79b0513377"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e84fa72-fix-green.svg" />
</a>
  </td>

  <td>ensure update migrations are fully executed</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8a805fe0b9a0db3329aa51d95a41f3baacd45feb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8a805fe-fix-green.svg" />
</a>
  </td>

  <td>exclude deprecated packages with removal migrations from update</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/430ee441bd2e5729a8a24f72a1df8fd782c9f9f6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/430ee44-fix-green.svg" />
</a>
  </td>

  <td>use correct Webpack asset stage in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aeebd14f04b8e520b0144a77e765da807a08dda0"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/aeebd14-perf-orange.svg" />
</a>
  </td>

  <td>only check affected files for Angular semantic diagnostics</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8582ddc-feat-blue.svg" />
</a>
  </td>

  <td>remove `entryComponent` from `component` schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb14945c02a3f150d6965e77324416b1ec7cc575"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fb14945-fix-green.svg" />
</a>
  </td>

  <td>correctly handle adding multi-line strings to `@NgModule` metadata</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6fa88567211ededc657f5cbeb71afb8592191058"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6fa8856-fix-green.svg" />
</a>
  </td>

  <td>explicitly specify ServiceWorker registration strategy</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: remove usage of deprecated View Engine compiler (<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35">677913f</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, Ivy-based compilation will always be used when building an application.
The default behavior for applications is to use the Ivy compiler when building and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and an Ivy-based build will be attempted. If the build fails,
the application may need to be updated to become Ivy compatible.

<h3>
    @schematics/angular: remove `entryComponent` from `component` schematic (<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455">8582ddc</a>)
</h3>
`entryComponent` option has been removed from the `component` schematic as this was intended to be used with the the now no longer supported ViewEngine rendering engine.

<h3>
    @angular-devkit/build-angular: remove view engine app-shell generation (<a href="https://github.com/angular/angular-cli/commit/1c2aeeb46a23fd511c89f9c8800ac2a5ab0c2734">1c2aeeb</a>)
</h3>
App-shell builder now only supports generation using Ivy

<h3>
    @angular-devkit/build-angular: remove deprecated View Engine support for i18n extraction (<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e">012700a</a>)
</h3>
Removal of View Engine support from i18n extraction
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the `ng extract-i18n` command will now always use the Ivy compiler.
The `--ivy` option has also been removed as Ivy-based extraction is always enabled.
The default behavior for applications is to use the Ivy compiler for building/extraction and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and Ivy-based extraction will be attempted. If the extraction fails,
the application may need to be updated to become Ivy compatible.

---

# Special Thanks

Charles Lyding, Alan Agius, Renovate Bot, George Kalpakas, Joey Perrott, Keen Yee Liau

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.6"></a>

# v12.0.0-next.6 (2021-03-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ac4c109bebac3ea3d562f000c46a98d61b1bd148"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ac4c109-fix-green.svg" />
</a>
  </td>

  <td>ensure output directory is present before writing stats JSON</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c7e126609f4a0d86bd47a226717ab6430fd85cfd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c7e1266-feat-blue.svg" />
</a>
  </td>

  <td>add production by default optional migration</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f22f7e7371c0daa2dc59110cd21e3ff3fb4620d5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f22f7e7-feat-blue.svg" />
</a>
  </td>

  <td>update new workspaces to use Karma 6.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/09daf7a7e0886738f25f071aa5e072e1dc06bf7e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/09daf7a-fix-green.svg" />
</a>
  </td>

  <td>remove leftover workspace tslint config</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Renovate Bot, Alan Agius, Charles Lyding, Keen Yee Liau

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.5"></a>

# v12.0.0-next.5 (2021-03-18)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1525e7ab2c3c6cd95ee91cf01243af78174246ca"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1525e7a-feat-blue.svg" />
</a>
  </td>

  <td>expose legacy-migrate message format</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2616ef0d3fdf6821a60f5ae9dcb54d65be0506e1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/2616ef0-feat-blue.svg" />
</a>
  </td>

  <td>integrate JIT mode linker</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20281">
  [Closes #20281]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/075c988dd14711755516261e3e6150c316d866cb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/075c988-fix-green.svg" />
</a>
  </td>

  <td>display correct filename for bundles that are ES2016+</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9714aa92bfb7babb1a6720515b543614acd47cac"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9714aa9-fix-green.svg" />
</a>
  </td>

  <td>don't load an input sourcemap from file when using Babel</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d5645675fd555e7f1afd523d4f2d42095034fc46"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d564567-fix-green.svg" />
</a>
  </td>

  <td>support writing large Webpack stat outputs</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/63a2dbb8b42c6c62e37b27c42238860f7e57b87f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/63a2dbb-perf-orange.svg" />
</a>
  </td>

  <td>skip FESM2015 from `async` transformation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3affd28f5ebdaa9fb8f3239292e3d0060f655d07"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/3affd28-perf-orange.svg" />
</a>
  </td>

  <td>remove Webpack Stats.toJson usage in analytics plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/699b641b85632f9581f3638ccd8aa359dd8aa57f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/699b641-perf-orange.svg" />
</a>
  </td>

  <td>remove Webpack Stats.toJson usage in karma plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2d6e82fa106e9dfd1bb4909d56e5730195c6b2e6"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/2d6e82f-perf-orange.svg" />
</a>
  </td>

  <td>enforce Babel not to load sourcemaps from file</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/00ff390feaeb457812d67c367f65ba799d3ac66a"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/00ff390-perf-orange.svg" />
</a>
  </td>

  <td>disable `showCircularDependencies` by default</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff32ada86b486d96922c693f703e25e01848d020"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/ff32ada-feat-blue.svg" />
</a>
  </td>

  <td>provide output path in builder results</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/985dc1a-feat-blue.svg" />
</a>
  </td>

  <td>confirm ng add action before installation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79856644b4d476d50013eafee949d1a508b86104"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7985664-feat-blue.svg" />
</a>
  </td>

  <td>support TypeScript 4.2</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d254d058f9be6b6a696bd39a37c2457776b46806"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d254d05-fix-green.svg" />
</a>
  </td>

  <td>remove `project` from required properties in ng-packagr schema</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3504c43e48d8e265ca0943005f3cea2d25290cbd"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3504c43-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack 5 deprecation warning in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95aa2b8f925ee295b8edf659b5d8e706d122ffec"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/95aa2b8-perf-orange.svg" />
</a>
  </td>

  <td>avoid adding transitive dependencies to Webpack's dependency graph</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dfefd6ba4fcda6baa3dc172978ca84acaa48ec54"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/dfefd6b-perf-orange.svg" />
</a>
  </td>

  <td>use precalculated dependencies in unused file check</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81129e12d0ae4cbaeb5ab537facb7990be9b8b45"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/81129e1-feat-blue.svg" />
</a>
  </td>

  <td>update several TypeScript compilation target (Syntax)</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/226a8d274d27d191651926bc7970af11cfee2597"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/226a8d2-feat-blue.svg" />
</a>
  </td>

  <td>remove tslint and codelyzer from new projects</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20105">
  [Closes #20105]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/18465">
  [Closes #18465]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/663c4bc9c10aa3df3defa188a1ba8f90c63b2722"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/663c4bc-fix-green.svg" />
</a>
  </td>

  <td>remove references to the prod flag</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9ea34ba202b2cccfdda820b4975de54cd56acf43"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9ea34ba-fix-green.svg" />
</a>
  </td>

  <td>fix youtube icon margin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bf831fac6166f6943a78b34bfd5f3c167f8911d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bf831f-fix-green.svg" />
</a>
  </td>

  <td>only show legacy browsers deprecation warning when option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ee4918db40b0b30d58e1119a0291954234d4f797"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ee4918d-fix-green.svg" />
</a>
  </td>

  <td>remove Native value from viewEncapsulation option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/870173633a54f7dbd06a420adb3dc3593d6010c4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8701736-fix-green.svg" />
</a>
  </td>

  <td>use title for svg on home page</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular/cli: confirm ng add action before installation (<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e">985dc1a</a>)
</h3>
The `ng add` command will now ask the user to confirm the package and version prior to installing and executing an uninstalled package.
This new behavior allows a user to abort the action if the version selected is not appropriate or if a typo occurred on the command line and an incorrect package would be installed.
A `--skip-confirmation` option has been added to skip the prompt and directly install and execute the package. This option is useful in CI and non-TTY scenarios such as automated scripts.

---

# Special Thanks

Alan Agius, Charles Lyding, Renovate Bot, Doug Parker, Cédric Exbrayat, Kristiyan Kostadinov, Mouad Ennaciri, Omar Hasan

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.4"></a>

# v12.0.0-next.4 (2021-03-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/architect (0.1200.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1da359ac08d1a5503ab152db72ee6cee927391b8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1da359a-feat-blue.svg" />
</a>
  </td>

  <td>add implementation for defaultConfiguration</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/71eab3ddb603cb70a98120012a174cb159d9b28d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/71eab3d-feat-blue.svg" />
</a>
  </td>

  <td>show warning during build when project requires IE 11 support</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/84f39778cc37c997d0b2b5295f766e08d4c94c78"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/84f3977-fix-green.svg" />
</a>
  </td>

  <td>only remove nomodule and defer attributes empty values</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/20207">
  [Closes #20207]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e981d08809a7f1084b5cae7a539217d6fe7f757"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8e981d0-feat-blue.svg" />
</a>
  </td>

  <td>add handling for `defaultConfiguration` target definition property</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a5877bf91765af71c1368fd2fb61d29079931205"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/a5877bf-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `--prod` command line argument</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f7e3e2335dfd6f54f435c95baa024c60a94b791c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f7e3e23-feat-blue.svg" />
</a>
  </td>

  <td>add `defaultConfiguration` property to architect schema</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06335515eb05c84d8dfdbfa10f8e3201b714d5da"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0633551-fix-green.svg" />
</a>
  </td>

  <td>avoid exceptions for expected errors in architect commands</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5f8155dc33b1f95f81562cf40a56fdbd0f4140e4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5f8155d-fix-green.svg" />
</a>
  </td>

  <td>add ng-packagr builder schema in IDE schema</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0dc7327-feat-blue.svg" />
</a>
  </td>

  <td>drop support for string based lazy loading</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3ee12af89be58ccea8996e2e86a18a23d193abbe"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3ee12af-feat-blue.svg" />
</a>
  </td>

  <td>add migration to update lazy loading string syntax to use dynamic imports</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f4875b967ae9ca5640cb27bfb37166528cab88d8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f4875b9-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove `lazyModules` configuration option</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3b7470d4836bcfff31ee4bf90ec4396f2905c633"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3b7470d-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `legacyBrowsers` application and ng-new option</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1de6d71edd899465a01c65790f6fb04159acc821"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1de6d71-feat-blue.svg" />
</a>
  </td>

  <td>production builds by default</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ba6f546a026a3dba613c1c54ce0c767fe0940d0f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ba6f546-fix-green.svg" />
</a>
  </td>

  <td>add `additionalProperties` to all schemas</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: remove deprecated `lazyModules` option (<a href="https://github.com/angular/angular-cli/commit/8d669123236c49e7f6bee1a7171c002abe03df1a">8d66912</a>)
</h3>
Server and Browser builder `lazyModules` option has been removed without replacement.

<h3>
    @ngtools/webpack: drop support for string based lazy loading (<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5">0dc7327</a>)
</h3>
With this change we drop support for string based lazy loading `./lazy.module#LazyModule`  use dynamic imports instead.

The following options which were used to support the above syntax were removed without replacement.

- discoverLazyRoutes
- additionalLazyModules
- additionalLazyModuleResources
- contextElementDependencyConstructor

---

# Special Thanks

Alan Agius, Charles Lyding, Renovate Bot, Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.3"></a>

# v12.0.0-next.3 (2021-03-03)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/aa3ea88-feat-blue.svg" />
</a>
  </td>

  <td>enable inlineCritical by default</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a7d1e0be4c59b27e78d1b03c083bdb2982c3845"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6a7d1e0-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `experimentalRollupPass` option</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/11b1d9c2d1fb75df968fa31b5fcdeeb072f87b52"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/11b1d9c-fix-green.svg" />
</a>
  </td>

  <td>inline critical font-face rules when using crittical css inlining</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f127136033f604b443568e7ade1ff26f50ec1dbe"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f127136-fix-green.svg" />
</a>
  </td>

  <td>update ng new links</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: enable inlineCritical by default (<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908">aa3ea88</a>)
</h3>
Critical CSS inlining is now enabled by default. If you wish to turn this off set `inlineCritical` to `false`.

See: https://angular.io/guide/workspace-config#optimization-configuration

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Keen Yee Liau, Douglas Parker, twerske

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.2"></a>

# v12.0.0-next.2 (2021-02-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7ef73c8524b864244da027284d8bb3402f7ed8d3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7ef73c8-fix-green.svg" />
</a>
  </td>

  <td>only show index and service worker status once</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2ef39498b03da036b3214c20a9b160b3efef4d5e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2ef3949-fix-green.svg" />
</a>
  </td>

  <td>disable declaration and declarationMap</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/20103">
  [Closes #20103]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/065ac4546fbb4928245609d52c1f6d81fdd48cb9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/065ac45-fix-green.svg" />
</a>
  </td>

  <td>remove npm 7 incompatibility notification</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d19d2ccae55f96d4d8260da6572f34a47616a89b"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d19d2cc-feat-blue.svg" />
</a>
  </td>

  <td>update new project dependencies version</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20106">
  [Closes #20106]<br />
</a>

  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1199205bc2844e2c83d8f8e5092e89f8bd24eec1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1199205-feat-blue.svg" />
</a>
  </td>

  <td>augment `universal` schematics to import `platform-server` shims</td>

  <td>
<a href="https://github.com/angular/angular/issues/40559">
  [Closes #40559]<br />
</a>

  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/96a4467ce90fb6b88f5be39f73c8fd64ce057a4a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/96a4467-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove emitDecoratorMetadata</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Doug Parker, Joey Perrott, Jefiozie, George Kalpakas, Keen Yee Liau

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.1"></a>

# v12.0.0-next.1 (2021-02-17)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/44e75be-feat-blue.svg" />
</a>
  </td>

  <td>drop support for ng-packagr version 11</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fa5cf53-feat-blue.svg" />
</a>
  </td>

  <td>drop support for karma version 5.2</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/build-optimizer (0.1200.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1f83f305db88aeb5164f6d13869f7cc10e44527e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1f83f30-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3d99468b455825fd97146e6496e7d712100e235a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3d99468-fix-green.svg" />
</a>
  </td>

  <td>support update migration packages with no entry points</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/20032">
  [Closes #20032]<br />
</a>

  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b179a704829fef72191045a443b4b7eb7d20141c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b179a70-fix-green.svg" />
</a>
  </td>

  <td>ensure odd number Node.js version message is a warning</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a44bf4aaf6c800043e44c8b238453fd4d295fb5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9a44bf4-fix-green.svg" />
</a>
  </td>

  <td>improve error logging when resolving update migrations</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/789e05d800c1093881d24a066fb7881c26332349"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/789e05d-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c6e65e434614b8076e66c636c1c9c6c241ce750f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c6e65e4-fix-green.svg" />
</a>
  </td>

  <td>normalize paths when pruning AOT rebuild requests</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7d57dd2f3e7d36cc4ed2c356f79139486790cbfa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7d57dd2-feat-blue.svg" />
</a>
  </td>

  <td>add migration to use new zone.js entry-points</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bb38f85202f749040b241c8277280fab21c3379c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bb38f85-feat-blue.svg" />
</a>
  </td>

  <td>use new zone.js entry-points</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: drop support for zone.js 0.10 (<a href="https://github.com/angular/angular-cli/commit/f309516bcdcee711fc5693b5f14d6fef1cfa5dba">f309516</a>)
</h3>
Minimum supported `zone.js` version is `0.11.4`

<h3>
    @angular-devkit/build-angular: drop support for ng-packagr version 11 (<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1">44e75be</a>)
</h3>
Minimum supported `ng-packagr` version is `12.0.0-next`

<h3>
    @angular-devkit/build-angular: drop support for karma version 5.2 (<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053">fa5cf53</a>)
</h3>
Minimum supported `karma` version is `6.0.0`

---

# Special Thanks

Renovate Bot, Alan Agius, Charles Lyding, Keen Yee Liau, Aravind V Nair

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.0"></a>

# v12.0.0-next.0 (2021-02-11)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/93376177235108ed15a2fbba8ea079bc565802ce"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/9337617-feat-blue.svg" />
</a>
  </td>

  <td>add `postcss-preset-env` with stage 3 features</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fe90b766df2eee2c1289c0f43fb7504377152a51"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fe90b76-fix-green.svg" />
</a>
  </td>

  <td>ensure i18n extraction sourcemaps are fully configured</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1b5971a0bc0560067f5fdb993d52485dd1226b6c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1b5971a-fix-green.svg" />
</a>
  </td>

  <td>the root Tailwind configuration file is always picked</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a7ffce10ee18d069aab3ef6cc010cfb08e77813e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a7ffce1-fix-green.svg" />
</a>
  </td>

  <td>fixed ignoring of karma plugins config</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/19993">
  [Closes #19993]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bb3c6cd51d24fe5636cdcf63670ea164f57aa63"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bb3c6c-fix-green.svg" />
</a>
  </td>

  <td>ensure job input values are processed in order</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/52aaa8c167dee989b782b5561cb16c5a75e4c2af"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/52aaa8c-fix-green.svg" />
</a>
  </td>

  <td>update NPM 7 guidance</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9eb7fb53bb1e85e551b7b05f4442c0a9e3e9ef8a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9eb7fb5-fix-green.svg" />
</a>
  </td>

  <td>reduce overhead of Angular compiler rebuild requests</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b105ed63c7610dd1397a3d24d4a7439564a019aa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b105ed6-feat-blue.svg" />
</a>
  </td>

  <td>strict mode by default</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f424529d9ccaeb16643a8383ad3647af82062b16"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f424529-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove deprecated options from 'angular.json'</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/575b1a75b17f0b03748c137c07976e00be4c8b51"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/575b1a7-fix-green.svg" />
</a>
  </td>

  <td>only update removed v12 options in migration</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    set minimum Node.js version to 12.13 (<a href="https://github.com/angular/angular-cli/commit/d1f616930de4a8312e3441410098d9f248855d9d">d1f6169</a>)
</h3>
Node.js version 10 will become EOL on 2021-04-30.
Angular CLI 12 will require Node.js 12.13+ or 14.15+. Node.js 12.13 and 14.15 are the first LTS releases for their respective majors.

<h3>
    @angular-devkit/build-angular: remove file-loader dependency (<a href="https://github.com/angular/angular-cli/commit/6732294ff34ca35698cec5a9ca91b664dd684289">6732294</a>)
</h3>
The unsupported/undocumented, Webpack specific functionality to `import`/`require()` a non-module file has been removed.

Before

```js
import img from './images/asset.png';
```

After

```html
<img src="images/asset.png" />
```

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Doug Parker, Bruno Baia, Amadou Sall, S. Iftekhar Hossain

---

**Note: For release notes prior to this CHANGELOG see [release notes](https://github.com/angular/angular-cli/releases).**
