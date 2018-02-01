import * as denodeify from 'denodeify';

const SilentError = require('silent-error');
const PortFinder = require('portfinder');
const getPort = denodeify<{host: string, port: number}, number>(PortFinder.getPort);

export function checkPort(port: number, host: string, basePort = 49152): Promise<number> {
  PortFinder.basePort = basePort;
  return getPort({ port, host })
    .then(foundPort => {

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
