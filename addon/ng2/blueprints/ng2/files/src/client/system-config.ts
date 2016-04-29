declare var System: { config: (any) => void };


const barrels: string[] = [
  // Angular specific barrels.
  '@angular/core',
  '@angular/common',
  '@angular/compiler',
  '@angular/http',
  '@angular/router',
  '@angular/testing',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',

  // App specific barrels.
  'app',
  'app/shared',
  /** @cli-barrel */
];


// Angular CLI SystemJS configuration.
System.config({
  map: {
    '@angular': 'vendor/@angular'
  },
  packages: barrels.reduce((barrelConfig: any, barrelName: string) => {
    barrelConfig[barrelName] = {
      defaultExtension: 'js',
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
