const cluster = require('cluster');
const Collector = require('./Collector')

function readConfig(fileName) {
    let rawdata = require('fs').readFileSync('servers.json');
    return JSON.parse(rawdata);
}


//** Главный процесс */
if (cluster.isMaster) {
    console.log("Master");

      

    //Список актуальных Серверов
    let actualServers = new Map();

    cluster.on('exit', (deadWorker, code, signal) => {
        console.log('worker is dead:', deadWorker.isDead());
        for (let [key,value] of actualServers.entries())
         if (value==deadWorker) {
            let worker = cluster.fork({IP:key}); 
            actualServers.set(key,worker);
            break;
         }
      });


    //Обновить список актуальных серверов
    function UpdateServers() {

      
        let servers = readConfig('servers.json');

        let newServers = servers.filter(server=>!actualServers.has(server));
        if (newServers.length) {
            console.log("news servers",newServers);
            for (server of newServers) {    
                //Стартуем рабочий процесс. Передаём в него IP серевера   
                let worker = cluster.fork({IP:server});


                actualServers.set(server,worker);
            }       
        }
    
        let diedServers = [...actualServers.keys()].filter(server=>servers.indexOf(server)==-1);
        if (diedServers.length) {
            console.log("died servers",diedServers);
            for (let diedServer of diedServers) {
                process.kill(actualServers.get(diedServer).process.pid)
                actualServers.delete(diedServer);
            }
        }
    }

    UpdateServers();

    setInterval(UpdateServers,10000);
 

}
else {
    //Рабочий процесс. Получает IP нужного сервера через  process.env.IP
    let IP = process.env.IP;
    console.log("start process for "+IP );

    var collector = new Collector({ 
        mountRoot:`http://${IP}/admin/listclients?mount=/`, 
        mounts:['silver128.mp3','silver48.mp3','silver64.aac'],
        logPath:`./log/${IP}/`,
        interval:2*1000,
        IP,
        breakOnSave:true,
        autorizeData:{username:"admin", password:"XXXXXXXX"}});

      collector.test(1).then(()=>process.exit(),1000);
       
 
   

    //process.kill(process.pid);
    //Вот вместо этого надо просто скопировать старый код
   // setInterval(()=> console.log("worker for ", IP) ,2000 );     
}