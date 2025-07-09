# Engine versions to stamp in a release package.json
RELEASE_ENGINES_NODE = "^20.19.0 || ^22.12.0 || >=24.0.0"
RELEASE_ENGINES_NPM = "^6.11.0 || ^7.5.6 || >=8.0.0"
RELEASE_ENGINES_YARN = ">= 1.13.0"

NG_PACKAGR_VERSION = "^20.1.0"
ANGULAR_FW_VERSION = "^20.1.0"
ANGULAR_FW_PEER_DEP = "^20.0.0"
NG_PACKAGR_PEER_DEP = "^20.0.0"

# Baseline widely-available date in `YYYY-MM-DD` format which defines Angular's
# browser support. This date serves as the source of truth for the Angular CLI's
# default browser set used to determine what downleveling is necessary.
#
# See: https://web.dev/baseline
BASELINE_DATE = "2025-04-30"

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
