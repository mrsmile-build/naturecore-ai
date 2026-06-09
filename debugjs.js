const fs = require('fs');
const c = fs.readFileSync('app.html','utf8');
const scripts = c.match(/<script[\s\S]*?<\/script>/g)||[];
const code = scripts[1].replace(/<script[^>]*>/,'').replace('</script>','');
const lines = code.split('\n');

let currentFunc = '';
let isAsync = false;
lines.forEach((line,i)=>{
  if(line.includes('function ')){
    currentFunc = line.trim();
    isAsync = line.includes('async');
  }
  if(line.includes('await') && isAsync === false){
    console.log('BAD await at line',i,'in:',currentFunc);
    console.log('  ',line.trim());
  }
});
