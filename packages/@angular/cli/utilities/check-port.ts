import * as denodeify from 'denodeify';

const SilentError = require('silent-error');
const PortFinder = require('portfinder');
const getPort = <any>denodeify(PortFinder.getPort);

PortFinder.basePort = 49152;


export function checkPort(port: number, host: string) {
  return getPort({ port, host })
    .then((foundPort: number) => {

      // If the port isn't available and we weren't looking for any port, throw error.
      if (port !== foundPort && port !== 0) {
        throw new SilentError(
          `Port ${port} is already in use. Use '--port' to specify a different port.`
        );
      }

      // Otherwise, our found port is good.
      return foundPort;
    });
}
