## Always follow the [upgrade guide](https://github.com/angular/angular-cli/blob/master/CHANGELOG.md#updating-angular-cli) when upgrading to a new version. The changelog does not list breaking changes that are fixed via the update procedure.

<a name="1.0.0-beta.6"></a>
# 1.0.0-beta.6 (2016-06-13)

### Features
- Admin elevation no longer required on Windows (https://github.com/angular/angular-cli/pull/905).
- Automatically add SASS/Stylus if project is initialized with `--style={sass|scss|styl}` (https://github.com/angular/angular-cli/pull/998).
- Allow any number of env files (https://github.com/angular/angular-cli/pull/913).

### Bug Fixes
- Fix adding 3rd party libs without package format (https://github.com/angular/angular-cli/pull/1028/commits/065e98f40384f8b28dcaf84028c411043697ff11).
- Fix github deploy deep links (https://github.com/angular/angular-cli/pull/1020). 
- Fix `ng e2e` exit code (https://github.com/angular/angular-cli/pull/1025).
- Fix missing vendor file (https://github.com/angular/angular-cli/pull/972).
- Fix github user pages base href (https://github.com/angular/angular-cli/pull/965).

### BREAKING CHANGES
- `<PROJECT-NAME>AppComponent` is now simply `AppComponent`, and it's selector is now `app-root` (https://github.com/angular/angular-cli/pull/1042).

- Route generation is temporarily disabled while we move to the [recently announce router](http://angularjs.blogspot.ie/2016/06/improvements-coming-for-routing-in.html)(https://github.com/angular/angular-cli/pull/992). It is recommended that users manually move to this router in all new projects.

<a name="1.0.0-beta.5"></a>
# 1.0.0-beta.5 (2016-05-19)

### Known Issues

- `ng new -mobile` fails npm install (https://github.com/angular/angular-cli/issues/958).
- Adding 3rd party libs without SystemJS package format breaks prod mode (https://github.com/angular/angular-cli/issues/951).
- Deep links do not work on Github pages deploys (https://github.com/angular/angular-cli/issues/995).
- `ng e2e` doesn't return error exit code on test failures (https://github.com/angular/angular-cli/issues/1017).
- `ng build -prod` fails on mobile projects due to missing vendor file (https://github.com/angular/angular-cli/issues/847).
- Github deploy to user pages doesn't use correct base href (https://github.com/angular/angular-cli/pull/965).
- `ng test` on windows hits the file discriptor limit (https://github.com/angular/angular-cli/issues/977).
- `ng serve/build/test` need admin elevation on Windows (https://github.com/angular/angular-cli/issues/641).