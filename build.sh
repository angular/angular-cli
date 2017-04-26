rm -rf dist

npm run build:ng-express-engine

cp modules/ng-express-engine/package.json dist/ng-express-engine/package.json
cp modules/ng-express-engine/README.md dist/ng-express-engine/README.md

npm run build:ng-aspnetcore-engine

cp modules/ng-aspnetcore-engine/package.json dist/ng-aspnetcore-engine/package.json
cp modules/ng-aspnetcore-engine/README.md dist/ng-aspnetcore-engine/README.md