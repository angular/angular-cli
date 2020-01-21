const { watchFile } = require('fs');

console.log('Complete');
watchFile(require.resolve('./watch-test-file.txt'), () => console.log('Complete'));
