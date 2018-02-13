export function createTransferScript(transferData: Object): string {
  return `<script>window['TRANSFER_CACHE'] = ${JSON.stringify(transferData)};</script>`;
}
