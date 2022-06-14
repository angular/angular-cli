import { AddressInfo, createServer } from 'net';

export function findFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const srv = createServer();
    srv.once('listening', () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close((e) => (e ? reject(e) : resolve(port)));
    });
    srv.once('error', (e) => srv.close(() => reject(e)));
    srv.listen();
  });
}
