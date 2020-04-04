'use strict'

const fetch = require('node-fetch');
const util = require('util');
const parseXML = util.promisify( require('xml2js').parseString );
const fs = require("fs");



class Collector {

  constructor(config) {
      //** Config */
     
    this.config = config;

    let {username,password} = this.config.autorizeData;
    this.authorizationString = Buffer.from(username + ":" + password).toString('base64');

    this.actualState = new Map();
    this.HourData = [];
    
  }

  run() {
    this.ActualHour = this.keyActor();
    //Собираем данные каждые 2 секунды
    this.sheduler = setInterval(()=>this.addChanges(),this.config.interval);
  }

  async test(cnt) {

 
    var x=0;
    this.keyActor = ()=>x;

       //--expose-gc 
   // global.gc()

    this.ActualHour = this.keyActor();

    for (var x = 0; x<100; x++) {



        console.log("iteration "+x);
        for (let index = 0; index < cnt; index++) {
           
            await this.addChanges()
        }

        await new Promise((resolve)=>{ setTimeout(resolve,1000) })   
    }


    for (let i=0;i<12;i++){

        const used = process.memoryUsage(); let total = 0;
        for (let key in used) total+=used[key] / 1024 / 1024 * 100;
        console.log(new Date().toTimeString()+ `\ttotal: ${Math.round(total) / 100} MB`);
    
        await new Promise((resolve)=>{ setTimeout(resolve,10000) })  
    }
  }


  keyActor() {
   // return new Date().getHours();
    return new Date().getMinutes();
  }




/**
 * Дабавить изменения
 * @param {Object} DataObject
 */
async addChanges()
{
    let date = new Date();
    let Hour =  this.keyActor();

    if (Hour!=this.ActualHour) {
	    let storeData =  JSON.stringify(this.HourData);
        this.HourData = [];
        this.actualState = new Map();

        var fileName = this.config.logPath+ date.toLocaleDateString()+'-'+this.ActualHour+".json"; 

       fs.writeFile( fileName, storeData, () => {
        fs.unlink(fileName, () => {})
     });
        
        this.ActualHour = Hour;
    }

    try {
        var newState = await this.getNewState_Test();
        var changes = this.getChanges(newState);

        if (newState.keys().length!=this.actualState.keys().length) throw new Error("diggg")

        for (let newKeys of newState.keys())
         if (!this.actualState.has(newKeys)) throw new Error("diggg")

         for (let actualKeys of this.actualState.keys())
         if (!newState.has(actualKeys)) throw new Error("diggg")

        this.HourData.push(changes);
    }
    catch (error)
    {
        console.log(error);
    }

    const used = process.memoryUsage(); let total = 0;
    for (let key in used) total+=used[key] / 1024 / 1024 * 100;
    console.log(changes.timestamp+' +'+changes.connected.length+' -'+changes.disconnectedId.length+`\ttotal: ${Math.round(total) / 100} MB`);

    
}


/**
 * Получить список подключений
 * @returns {Map} список подключений
 */
async getNewState()  
{
    var stateTime = new Date().getTime();
    var newState = new Map();

    try
    {
    for (let mount of this.config.mounts) {
     var XMLdata = await fetch(this.config.mountRoot+mount,{headers: {'Authorization': 'Basic '+this.authorizationString}})
     .then(response=> { if (response.status==200) return response.text(); else throw('fetch xml error: '+response.status) })
     .then(XMLtext => parseXML(XMLtext));

	if (XMLdata.icestats.source[0].listeners[0] > 0) {
    	    XMLdata.icestats.source[0].listener.forEach(l => newState.set(+l.ID[0], 
		{ UserAgent:l.UserAgent && l.UserAgent[0],IP:l.IP[0],Id:+l.ID[0],StatTime: new Date(stateTime-(l.Connected[0]*1000)), mount    })); 
	}
    }
    }
    catch (error)
    {
        console.log(error);
    }

    return newState;
}

 async getNewState_Test(){

    this.testFile = this.testFile || 0;

    this.testId = this.testId || 0;

   //

    if (!this.testData) {
        var files = ["2020-1-27-9 23.105.253.148.json","2020-4-3-12 23.105.253.148.json"];
        var text = fs.readFileSync("c:\\_temp\\"+files[this.testFile], 'utf8');
        this.testFile = (this.testFile+1)%2       
        var obj = JSON.parse(text);
        this.testData = obj[0].connected
    }

    var newState = new Map();
    for (let conn of this.testData) {

        let newObj = Object.assign({}, conn)
        newObj.Id=++this.testId;

        newState.set(newObj.Id, newObj); 
    }
        
  


     return newState;

}

/**
 * Получить изменения
 * @param {Map} newState - Новый список подключений
 * @returns {Object} списки
 */
getChanges(newState)
{
    let initState = this.actualState.size==0;

    var disconnectedId = [];
    for (let key of this.actualState.keys()) {
     if (!newState.has(key)) disconnectedId.push(key);     
    }
   
    var connected = [];
    for (let listener of newState.entries())
     if ( !this.actualState.has(listener[0]) ) {
        this.actualState.set(listener[0], listener[1]);
         connected.push(listener[1]);
     }

    for (let d of disconnectedId) this.actualState.delete(d);

    return {timestamp:new Date() , initState, disconnectedId,connected}; 
}

}

 



var r = new Collector({ 
    mountRoot:'http://<IP>/admin/listclients?mount=/', 
    mounts:['silver128.mp3','silver48.mp3','silver64.aac'],
    logPath:'g:\\log2\\',
    interval:2*1000,
    autorizeData:{username:"admin", password:"XXXXXXXX"}});

    r.test(100).then(()=>console.log("end"))