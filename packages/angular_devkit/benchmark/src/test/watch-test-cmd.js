const { watch } = require('fs');

console.log('Complete');
watch(require.resolve('./watch-test-file.txt'), () => console.log('Complete'));
