import { createServer } from 'node:net';

/**
 * Finds an available network port on the loopback interface (127.0.0.1).
 * This is useful for tests that need to bind to a free port to avoid conflicts.
 * Explicitly binds to IPv4 localhost to avoid firewall prompts, IPv6 binding issues, and ensure consistency.
 *
 * @returns A promise that resolves with an available port number.
 */
export function findFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const srv = createServer();
    srv.once('listening', () => {
      const address = srv.address();
      if (!address || typeof address === 'string') {
        // Should not happen with TCP, but good for type safety
        srv.close(() => reject(new Error('Failed to get server address')));
        return;
      }
      const port = address.port;
      srv.close((e) => (e ? reject(e) : resolve(port)));
    });

    // If an error happens (e.g. during bind), the server is not listening,
    // so we should not call close().
    srv.once('error', (e) => reject(e));
    // Explicitly listen on IPv4 localhost to avoid firewall prompts, IPv6 binding issues, and ensure consistency.
    srv.listen(0, '127.0.0.1');
  });
}
