const denodeify = require('denodeify');
const glob = denodeify(require('glob'));
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const readFile = denodeify(fs.readFile);
const writeFile = denodeify(fs.writeFile);

const root = path.join(__dirname, '../');
const packagesRoot = path.join(root, 'packages');

function readJson(file) {
  return readFile(file)
    .then((content) => {
      let obj
      try {
        obj = JSON.parse(content.toString('utf8'))
      } catch (err) {
        throw err
      }
      return obj
    })
}

function sortObjectKeys(obj) {
  const sortedKeys = Object.keys(obj).sort()
  return sortedKeys.reduce(function (newObj, key) {
    newObj[key] = obj[key]
    return newObj
  }, {})
}

Promise.resolve()
  .then(() => glob(path.join(packagesRoot, '*/package.json')))
  .then((files) => {
    return glob(path.join(packagesRoot, '*/*/package.json'))
      .then((extras) => {
        Array.prototype.push.apply(files, extras);
        return files;
      })
  })
  .then((files) => {
    return files.reduce((prev, filename) =>
      prev.then((sum) =>
        readJson(filename)
          .then((obj) => {
            sum.push(obj);
            return Promise.resolve(sum);
          })
      ), Promise.resolve([]))
  })
  .then((jsonArr) => {
    const dependencies = _.merge(..._.map(jsonArr, 'dependencies'));

    const output = path.join(root, 'package.json');

    const ignoredDeps = ['@angular-cli/base-href-webpack', '@ngtools/webpack'];

    ignoredDeps.forEach(key => delete dependencies[key])

    return readJson(output)
      .then((json) => {
        json.dependencies = sortObjectKeys(dependencies);

        Object.keys(dependencies).forEach(key => delete json.devDependencies[key]);

        return writeFile(output/*.replace('package', 'test')*/, JSON.stringify(json, null, 2) + '\n');
      })
  })
