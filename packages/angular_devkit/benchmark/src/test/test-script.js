console.log("stdout start");
console.error("stderr start");

setTimeout(() => {
  console.log("stdout end");
  console.error("stderr end");
}, 1000);
