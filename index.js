const Collector = require('./Collector')

/*
var r = new Collector({ 
    mountRoot:'http://<IP>/admin/listclients?mount=/', 
    mounts:['silver128.mp3','silver48.mp3','silver64.aac'],
    logPath:'g:\\log2\\',
    interval:2*1000,
    autorizeData:{username:"admin", password:"XXXXXXXX"}});
    */

    // r.test(100).then(()=>console.log("end"))

    var r = new Collector({ 
        mountRoot:'http://213.59.4.27/admin/listclients?mount=/', 
        mounts:['ekb.aac'],
        logPath:'g:\\log2\\',
        interval:2*1000,
        autorizeData:{username:"timur", password:"XXXXXXXX"}});  
        
        r.run();


    


