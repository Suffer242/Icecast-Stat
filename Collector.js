'use strict'

const fetch = require('node-fetch');
const util = require('util');
const fs = require("fs");
const parseXML = util.promisify( require('xml2js').parseString );
const writeFile = util.promisify(fs.writeFile);


class Collector {

  constructor(config) {
    this.config = config;

    let {username,password} = this.config.autorizeData;
    this.authorizationString = Buffer.from(username + ":" + password).toString('base64');

    this.actualState = new Map();
    this.HourData = [];
   
  }

  run() {
    this.ActualHour = this.GetStoreKey();
    //Собираем данные каждые 2 секунды
    this.sheduler = setInterval(()=>this.addChanges(),this.config.interval);
  }

  async test(cnt) {

    var x=0;
    this.GetStoreKey = ()=>x;

    var testdata = {};

    this.GetXml = function(mount) {
        if (!testdata[mount]) testdata[mount] =  fs.readFileSync('./test_data/listclients-'+mount+'.xml', 'utf8');
        return testdata[mount];
    }

    var testId = 0;
    var XmlToJson = this.XmlToJson;
    this.XmlToJson = async function(xml) {
       var JsonData = await XmlToJson(xml);
       JsonData.forEach(item=>item.Id=++testId); 
       return JsonData;
    }
  
    this.ActualHour = this.GetStoreKey();

    for (var x = 0; x<100; x++) {
        console.log("iteration "+x);
        for (let index = 0; index < cnt; index++) {
           
            await this.addChanges()
        }

        await new Promise((resolve)=>{ setTimeout(resolve,1000) })   
    }


 
  }


  GetStoreKey() {
    return new Date().getHours();
  }

    /**
     * Дабавить изменения
     * @param {Object} DataObject
     */
    async addChanges()
    {
        let date = new Date();
        let Hour =  this.GetStoreKey();

        if (Hour!=this.ActualHour) {
            let storeData =  JSON.stringify(this.HourData);
            this.HourData = [];
            this.actualState = new Map();
            var fileName = this.config.logPath + date.toLocaleDateString()+'-'+this.ActualHour+".json"; 
             writeFile(fileName, storeData).then(()=>{
              if (global.gc) {
                console.log("Call garbage collector");
                global.gc();
              }gur
             } )          
            this.ActualHour = Hour;
        }

        try {
            var newState = await this.getNewState();
            var changes = this.getChanges(newState);
            this.actualState = newState;
            this.HourData.push(changes);
        }
        catch (error)
        {
            console.log(error);
        }

        const used = process.memoryUsage();      
        let total = 0;
        for (let key in used) total+=used[key] / 1024 / 1024 * 100;
        console.log(changes.timestamp+' +'+changes.connected.length+' -'+changes.disconnectedId.length+`\ttotal: ${Math.round(total) / 100} MB`);

        
    }


    async XmlToJson(XMLtext) {
        var XMLdata = await parseXML(XMLtext);

        if (!XMLdata.icestats) return [];

        let source = XMLdata.icestats.source[0];

    
                   ///
        //if (source.listeners[0] == 0) return [];

        if (!source.listener) return [];
        
       
        return  source.listener.map(l =>({
            UserAgent: l.UserAgent && l.UserAgent[0],
            IP: l.IP[0],
            Id: +l.ID[0],
            Connected: l.Connected[0]
          }))
    
    }
    

    async GetXml(mount) {
        return await fetch(this.config.mountRoot+mount,{headers: {'Authorization': 'Basic '+this.authorizationString}})
        .then(response=> { if (response.status==200) return response.text(); else throw('fetch xml error: '+response.status) })
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
            var XMLtext = await this.GetXml(mount)
            var JsonData = await this.XmlToJson(XMLtext);
            JsonData.forEach(l => newState.set(l.Id , { ...l , StatTime: new Date(stateTime-(l.Connected*1000)), mount} )); 
          }
        }
        
        catch (error)
        {
            console.log(error);
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
        if (!this.actualState.has(listener[0]))  connected.push(listener[1]);

        return {timestamp:new Date() , initState, disconnectedId,connected}; 
    }

}

 
module.exports = Collector;


