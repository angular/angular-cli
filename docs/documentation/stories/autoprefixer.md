# Change target browsers for Autoprefixer

Currently, the CLI uses [Autoprefixer](https://github.com/postcss/autoprefixer) to ensure compatibility
with different browser and browser versions. You may find it necessary to target specific browsers
or exclude certain browser versions from your build.

Internally, Autoprefixer relies on a library called [Browserslist](https://github.com/browserslist/browserslist)
to figure out which browsers to support with prefixing.

There are a few ways to tell Autoprefixer what browsers to target:

### Add a browserslist property to the `package.json` file
```
"browserslist": [
  "> 1%",
  "last 2 versions"
]
```

### Add a new file to the project directory called `.browserslistrc`
```
### Supported Browsers

> 1%
last 2 versions
```

Autoprefixer will look for the configuration file/property to use when it prefixes your css.
Check out the [browserslist repo](https://github.com/browserslist/browserslist) for more examples of how to target
specific browsers and versions.

_Side note:_
Those who are seeking to produce a [progressive web app](https://developers.google.com/web/progressive-web-apps/) and are using [Lighthouse](https://developers.google.com/web/tools/lighthouse/) to grade the project will
need to add the following browserslist config to their package.json file to eliminate the [old flexbox](https://developers.google.com/web/tools/lighthouse/audits/old-flexbox) prefixes:

`package.json` config:
```
"browserslist": [
  "last 2 versions",
  "not ie <= 10",
  "not ie_mob <= 10"
]
```
