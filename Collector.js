'use strict'

const fetch = require('node-fetch');
const fs = require("fs");
const parser = require('./brute-get-listeners');
class Collector {

  constructor(config) {
    this.config = config;

    let {logPath} = this.config;
    
    let {username,password} = this.config.autorizeData;
    this.authorizationString = Buffer.from(username + ":" + password).toString('base64');

    this.actualState = new Map();
    this.HourData = [];
   
  }

  run() {
    this.ActualHour = this.GetStoreKey();
    this.addChanges(); //init
    this.sheduler = setInterval(()=>this.addChanges(),this.config.interval);
  }

  async test(cnt) {

    var x=cnt || 1;
    this.GetStoreKey = ()=>x;

    this.GetXml = function(mount) {
      return   fs.readFileSync('./test_data/listclients-'+mount+'.xml', 'utf8'); 
    }

    let getRandomInt = (max) =>  Math.floor(Math.random() * Math.floor(max));

    var testId = 100000;
    var XmlToJson = this.XmlToJson;
    this.XmlToJson = function(xml) {
       var JsonData = XmlToJson(xml);


       let i=0;
       JsonData.forEach(item=>item.Id=++i); 
     
       if (JsonData.length>100 && true)
        for (let i=0;i<10+getRandomInt(10);i++) {
         var n = getRandomInt(JsonData.length);
         JsonData[n].Id=++testId;
        }
       
       return JsonData;

    }
  
    this.ActualHour = this.GetStoreKey();

        console.log("test iteration");
        for (let index = 0; index < 60*60/2; index++) {
           
            await this.addChanges()
        }
  
    x++;
    await this.addChanges()

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

            try { 
             let storeData =  JSON.stringify(this.HourData);
             let {logPath} = this.config;
             let fileName = logPath + date.toLocaleDateString()+'-'+this.ActualHour+".json"; 
             if (!fs.existsSync(logPath))  fs.mkdirSync(logPath, { recursive: true });
             fs.writeFileSync(fileName, storeData); 
            }
            catch (error)
            {
                console.log(error);
            }

            if (this.config.breakOnSave) {
              clearInterval(this.sheduler);
              process.exit();
            }

            global.gc && global.gc();                      
            this.ActualHour = Hour;  
            this.HourData = [];
            this.actualState = new Map();
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
    
        let total= (used.rss + used.heapTotal + used.external) / 1024 / 1024 * 100;

        console.log('IP:'+this.config.IP+' - '+changes.timestamp + ' total='+ this.actualState.size + ' Stages:'+this.HourData.length+ ' +'+changes.connected.length+' -'+changes.disconnectedId.length+`\ttotal: ${Math.round(total) / 100} MB`);

        
    }


    XmlToJson(XMLtext) {
      let listeners = parser(XMLtext)
      return listeners.map(l =>({UserAgent: l["UserAgent"],IP: l.IP,Id: l.ID,Connected: l.Connected}));
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
            var JsonData = this.XmlToJson(XMLtext);
            JsonData.forEach(({Connected, ...data}) => newState.set(data.Id , { ...data , StatTime: new Date(stateTime-(Connected*1000)), mount } )); 
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
        for (let [key,value] of newState.entries())
        if (!this.actualState.has(key))  connected.push(value);

        return {timestamp:new Date() , initState, disconnectedId,connected}; 
    }

}

 
module.exports = Collector;


