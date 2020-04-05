const Collector = require('./Collector')

var r = new Collector({ 
    mountRoot:'http://<IP>/admin/listclients?mount=/', 
    mounts:['silver128.mp3','silver48.mp3','silver64.aac'],
    logPath:'./log/',
    interval:2*1000,
    autorizeData:{username:"admin", password:"XXXXXXXX"}});
   

 r.test(100);
