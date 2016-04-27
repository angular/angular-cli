/** Only use System here. */
declare var System: any;

const barrels: string[] = [
  // Angular specific barrels.
  '@angular/core',
  '@angular/common',
  '@angular/compiler',
  '@angular/http',
  '@angular/router',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',

  'rxjs',

  // App specific barrels.
  'app',
  'app/shared',
  /** @cli-barrel */
];


// Angular CLI SystemJS configuration.
System.config({
  map: {
    '@angular': 'vendor/@angular',
    'rxjs': 'vendor/rxjs',
    'main': 'main.js'
  },
  packages: barrels.reduce((barrelConfig: any, barrelName: string) => {
    barrelConfig[barrelName] = {
      main: 'index'
    };
    return barrelConfig;
  }, {})
});


// Add your custom SystemJS configuration here.
System.config({
  packages: {
    // Add your custom SystemJS packages here.
  }
});
