const cluster = require('cluster');
const Collector = require('./Collector')
const fs = require('fs');

function readConfig(fileName) {
    let rawdata = fs.readFileSync(fileName);
    return JSON.parse(rawdata);
}


//** Главный процесс */
if (cluster.isMaster) {
    console.log("Master");

    //Список актуальных Серверов
    let actualServers = {};

    cluster.on('exit', (deadWorker, code, signal) => {

        console.log('worker is dead with code:',code);

        let deadIP = Object.keys(actualServers).find(IP=>actualServers[IP]==deadWorker);
        
        if (deadIP) actualServers[deadIP] = cluster.fork({IP:deadIP}); 
      });

      const serverConfigFileName  = 'servers.json';
      
      (()=>{
        let fsWait = false;
       fs.watch(serverConfigFileName, event => {

        if (fsWait) return;
        fsWait = setTimeout(() => {fsWait = false;}, 100);
   
        UpdateServers();

       });
      })();


    //Обновить список актуальных серверов
    function UpdateServers() {
     
        console.log("Config file Changed");

        let servers = readConfig(serverConfigFileName);

        let newServers = servers.filter(server=>!actualServers[server]);
        if (newServers.length) {
            console.log("news servers",newServers);
            for (server of newServers)  actualServers[server]=cluster.fork({IP:server});
        }
    
        let diedServers = Object.keys(actualServers).filter(server=>servers.indexOf(server)==-1);
        if (diedServers.length) {
            console.log("died servers",diedServers);
            for (let diedServer of diedServers) {
                process.kill(actualServers[diedServer].process.pid)
                delete actualServers[diedServer];
            }
        }
    }

    UpdateServers();


}
else {
    //Рабочий процесс. Получает IP нужного сервера через  process.env.IP
    let IP = process.env.IP;
    console.log("start process for "+IP );

    let config = readConfig("config.json");

    config.mountRoot =  config.mountRoot.replace(/<IP>/g,IP);
    config.logPath =  config.logPath.replace(/<IP>/g,IP);
   
    var collector = new Collector({...config,IP}); 

   if (process.argv[2] && process.argv[2]=="test")  collector.test();
    else 
   collector.run();
}