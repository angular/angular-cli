import * as denodeify from 'denodeify';

const PortFinder = require('portfinder');
const getPort = denodeify<{host: string, port: number}, number>(PortFinder.getPort);

export function checkPort(port: number, host: string, basePort = 49152): Promise<number> {
  PortFinder.basePort = basePort;

  return getPort({ port, host })
    .then(foundPort => {

      // If the port isn't available we will simply warn the user about it
      if (port !== foundPort && port !== 0) {
        console.log( `Port ${port} is already in use. Using port ${foundPort} instead` );
      }

      return foundPort;
    });
}
