

// https://stackoverflow.com/questions/3700326/decode-amp-back-to-in-javascript
function unescapeHtml(str) {
  var map = {amp: '&', lt: '<', le: '≤', gt: '>', ge: '≥', quot: '"', '#039': "'", apos:"'"}
  return str.replace(/&([^;]+);/g, (m, c) => map[c] || '')
}

// https://stackoverflow.com/questions/30332959/memory-leak-in-node-regex-parser
function memoryLeakFix(str) {
  return   (str+' ').slice(0,-1)
}

module.exports = function(src) {

    let listeners = src.matchAll(/<listener.*?>([\s\S]*?)<\/listener>/g);
    
    var result = [];

    for (let [,listener] of listeners) {
        var fields = memoryLeakFix(listener).matchAll(/<(.*?)>(.*?)<\/.*?>/g);
        
        var obj={};    
        for (let [,key,value] of fields) obj[key]= isNaN(value) ? memoryLeakFix(unescapeHtml(value)) : +value;
      
        result.push(obj)
    }
    return result;
}