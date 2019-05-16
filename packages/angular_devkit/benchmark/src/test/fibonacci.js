const fib = (n) => n > 1 ? fib(n - 1) + fib(n - 2) : n;
console.log(fib(parseInt(process.argv[2])));