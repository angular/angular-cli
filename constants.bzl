# Engine versions to stamp in a release package.json
RELEASE_ENGINES_NODE = "^18.19.1 || ^20.11.1 || >=22.0.0"
RELEASE_ENGINES_NPM = "^6.11.0 || ^7.5.6 || >=8.0.0"
RELEASE_ENGINES_YARN = ">= 1.13.0"

NG_PACKAGR_VERSION = "^19.1.0-next.0"
ANGULAR_FW_VERSION = "^19.1.0-next.0"
ANGULAR_FW_PEER_DEP = "^19.0.0 || ^19.1.0-next.0"
NG_PACKAGR_PEER_DEP = "^19.0.0 || ^19.1.0-next.0"

SNAPSHOT_REPOS = {
    "@angular/cli": "angular/cli-builds",
    "@angular/pwa": "angular/angular-pwa-builds",
    "@angular/build": "angular/angular-build-builds",
    "@angular/ssr": "angular/angular-ssr-builds",
    "@angular-devkit/architect": "angular/angular-devkit-architect-builds",
    "@angular-devkit/architect-cli": "angular/angular-devkit-architect-cli-builds",
    "@angular-devkit/build-angular": "angular/angular-devkit-build-angular-builds",
    "@angular-devkit/build-webpack": "angular/angular-devkit-build-webpack-builds",
    "@angular-devkit/core": "angular/angular-devkit-core-builds",
    "@angular-devkit/schematics": "angular/angular-devkit-schematics-builds",
    "@angular-devkit/schematics-cli": "angular/angular-devkit-schematics-cli-builds",
    "@ngtools/webpack": "angular/ngtools-webpack-builds",
    "@schematics/angular": "angular/schematics-angular-builds",
}
