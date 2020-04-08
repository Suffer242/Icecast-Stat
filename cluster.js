const cluster = require('cluster');



//** Главный процесс */
if (cluster.isMaster) {
    
 cluster.fork(); 

 cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });


}
else {
    console.log("start process for");
    console.log(cluster.isMaster);

    setTimeout(()=>console.log("dd"),1000);
    process.disconnect();
}