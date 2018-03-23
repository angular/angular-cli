import {BuildPackage} from './build-package';

const commonPackage = new BuildPackage('common', []);
const aspnetcoreEnginePackage = new BuildPackage('aspnetcore-engine', [commonPackage]);
const expressEnginePackage = new BuildPackage('express-engine', [commonPackage]);
const hapiEnginePackage = new BuildPackage('hapi-engine', [commonPackage]);
const moduleMapNgfactoryLoaderPackage = new BuildPackage('module-map-ngfactory-loader', []);

export const packages = [
  commonPackage,
  aspnetcoreEnginePackage,
  expressEnginePackage,
  hapiEnginePackage,
  moduleMapNgfactoryLoaderPackage,
];
