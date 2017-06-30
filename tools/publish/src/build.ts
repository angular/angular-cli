import {Logger} from '@ngtools/logger';
import * as fs from 'fs-extra';
import * as path from 'path';
import {buildSchema} from './build-schema';

const denodeify = require('denodeify');
const glob = denodeify(require('glob'));
const tar = require('tar');
const npmRun = require('npm-run');


const root = path.join(__dirname, '../../..');
const dist = path.join(root, 'dist');
const packagesRoot = path.join(root, 'packages');
const toolsRoot = path.join(root, 'tools');


function copy(from: string, to: string): Promise<void> {
  from = path.relative(process.cwd(), from);
  to = path.relative(process.cwd(), to);
  return new Promise<void>((resolve, reject) => {
    const rs = fs.createReadStream(from);
    const ws = fs.createWriteStream(to);

    rs.on('error', reject);
    ws.on('error', reject);
    ws.on('close', resolve);

    rs.pipe(ws);
  });
}


function rm(p: string): Promise<void> {
  p = path.relative(process.cwd(), p);
  return new Promise<void>((resolve, reject) => {
    fs.unlink(p, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


function tarFiles(out: string, dir: string): Promise<void> {
  // const files = fs.readdirSync(dir);
  return tar.create({ gzip: true, strict: true, portable: true, cwd: dir, file: out }, ['.']);
}


function getDeps(pkg: any): any {
  const packageJson = require(pkg.packageJson);
  return Object.assign({}, packageJson['dependencies'], packageJson['devDependencies']);
}


export default function build(packagesToBuild: string[], _opts: any,
                              logger: Logger): Promise<void> {
  const { packages, tools } = require('../../../lib/packages');

  const willBuildEverything = packagesToBuild.length == 0;
  if (packagesToBuild.length == 0) {
    packagesToBuild = Object.keys(packages).concat(Object.keys(tools));
  }

  // First delete the dist folder.
  return Promise.resolve()
    .then(() => logger.info('Deleting dist folder...'))
    .then(() => {
      if (willBuildEverything) {
        return fs.remove(dist);
      }
    })
    .then(() => logger.info('Creating schema.d.ts...'))
    .then(() => {
      const input = path.join(root, 'packages/@angular/cli/lib/config/schema.json');
      const output = path.join(root, 'packages/@angular/cli/lib/config/schema.d.ts');
      fs.writeFileSync(output, buildSchema(input, logger), 'utf-8');
    })
    .then(() => logger.info('Compiling packages...'))
    .then(() => {
      const packagesLogger = new Logger('packages', logger);
      // Order packages in order of dependency.
      // We use bubble sort because we need a full topological sort but adding another dependency
      // or implementing a full topo sort would be too much work and I'm lazy. We don't anticipate
      // any large number of
      const sortedPackages = Object.keys(packages);
      let swapped = false;
      do {
        swapped = false;
        for (let i = 0; i < sortedPackages.length - 1; i++) {
          for (let j = i + 1; j < sortedPackages.length; j++) {
            const a = sortedPackages[i];
            const b = sortedPackages[j];

            if (Object.keys(getDeps(packages[a])).indexOf(b) != -1) {
              // Swap them.
              [sortedPackages[i], sortedPackages[i + 1]]
                  = [sortedPackages[i + 1], sortedPackages[i]];
              swapped = true;
            }
          }
        }
      } while (swapped);

      return sortedPackages
        .filter(pkgName => packagesToBuild.indexOf(pkgName) != -1)
        .reduce((promise, packageName) => {
          const pkg = packages[packageName];
          const name = path.relative(packagesRoot, pkg.root);

          return promise.then(() => {
            packagesLogger.info(name);
            try {
              return npmRun.execSync(`tsc -p ${path.relative(process.cwd(), pkg.root)}`);
            } catch (err) {
              packagesLogger.fatal(`Compilation error.\n${err.stdout}`);
            }
          });
        }, Promise.resolve());
    })
    .then(() => logger.info('Compiling tools...'))
    .then(() => {
      const toolsLogger = new Logger('packages', logger);

      return Object.keys(tools)
        .filter(toolName => packagesToBuild.indexOf(toolName) != -1)
        .reduce((promise, packageName) => {
          const pkg = tools[packageName];
          const name = path.relative(toolsRoot, pkg.root);

          return promise.then(() => {
            toolsLogger.info(name);
            try {
              return npmRun.execSync(`tsc -p ${path.relative(process.cwd(), pkg.root)}`);
            } catch (err) {
              toolsLogger.fatal(`Compilation error.\n${err.stdout}`);
            }
          });
        }, Promise.resolve());
    })
    .then(() => logger.info('Copying uncompiled resources...'))
    .then(() => glob(path.join(packagesRoot, '**/*'), { dot: true }))
    .then((files: string[]) => {
      logger.info(`Found ${files.length} files...`);

      return files
        .map((fileName) => path.relative(packagesRoot, fileName))
        .filter((fileName) => {
          if (/^@angular[\\\/]cli[\\\/]blueprints/.test(fileName)) {
            return true;
          }
          if (/\.d\.ts$/.test(fileName)) {
            // The last thing we want is d.ts files...
            return false;
          }
          if (/\.spec\.ts$/.test(fileName)) {
            // Also spec.ts files...
            return false;
          }
          if (/spec-utils.ts/.test(fileName)) {
            // TODO: get rid of this by splitting spec utils in its own package.
            return false;
          }
          if (/\.ts$/.test(fileName)) {
            // Verify that it was actually built.
            if (!fs.existsSync(path.join(dist, fileName).replace(/ts$/, 'js'))) {
              throw new Error(`Source found but compiled file not found: "${fileName}".`);
            }

            // Skip all source files, since we have their JS files now.
            return false;
          }

          // The only remaining file we want to ignore is tsconfig and spec files.
          return !(/tsconfig\.json$/.test(fileName))
            && !(/\.spec\./.test(fileName))
            && !(/[\/\\]tests[\/\\]/.test(fileName));
        })
        .map((fileName) => {
          const source = path.join(packagesRoot, fileName);
          const dest = path.join(dist, fileName);

          if (fs.statSync(source).isDirectory()) {
            try {
              fs.mkdirSync(dest);
            } catch (err) {
              if (err.code != 'EEXIST') {
                throw err;
              }
            }
          } else {
            return copy(source, dest);
          }
        })
        .reduce((promise, current) => {
          return promise.then(() => current);
        }, Promise.resolve());
    })
    .then(() => glob(path.join(dist, '**/*.spec.*')))
    .then((specFiles: string[]) => specFiles.filter(fileName => {
      return !/[\\\/]@angular[\\\/]cli[\\\/]blueprints/.test(fileName);
    }))
    .then(specFiles => {
      logger.info(`Found ${specFiles.length} spec files...`);
      return Promise.all(specFiles.map(rm));
    })
    .then(() => {
      // Copy all resources that might have been missed.
      const extraFiles = ['CONTRIBUTING.md', 'README.md'];
      return Promise.all(extraFiles.map(fileName => {
        logger.info(`Copying ${fileName}...`);
        return copy(fileName, path.join('dist/@angular/cli', fileName));
      }));
    })
    .then(() => {
      // Copy LICENSE into all the packages
      logger.info('Copying LICENSE...');

      const licenseLogger = new Logger('license', logger);
      return Promise.all(Object.keys(packages).map(pkgName => {
        const pkg = packages[pkgName];
        licenseLogger.info(pkgName);
        return copy('LICENSE', path.join(pkg.dist, 'LICENSE'));
      }));
    })
    .then(() => {
      logger.info('Tarring all packages...');

      const tarLogger = new Logger('license', logger);
      return Promise.all(Object.keys(packages).map(pkgName => {
        const pkg = packages[pkgName];
        tarLogger.info(`${pkgName} => ${pkg.tar}`);
        return tarFiles(pkg.tar, pkg.dist);
      }));
    })
    .then(() => process.exit(0), (err) => {
      logger.fatal(err);
    });
}
