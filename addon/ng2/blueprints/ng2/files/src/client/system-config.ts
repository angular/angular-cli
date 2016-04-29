const barrels: string[] = [
  'app',
  'app/shared',
  /** @cli-barrel */
];

function createPackageConfig(barrelList: string[]): any {
  return barrelList.reduce((barrelConfig: any, barrelName: string) => {
    barrelConfig[barrelName] = {
      main: 'index'
    };
    return barrelConfig;
  }, {});
}


// Add your custom SystemJS configuration here.
export const config: any = {
  map: {
    main: 'main.js',
    angular2: 'vendor/angular2',
    rxjs: 'vendor/rxjs'
  },
  packages: Object.assign({
    // Add your custom SystemJS packages here.
    angular2: {},
    rxjs: {},
  }, createPackageConfig(barrels))
};
