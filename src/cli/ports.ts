import {createServer} from 'node:net';

async function available(port:number){
  const server=createServer();
  return new Promise<boolean>((resolve,reject)=>{
    server.once('error',(error:NodeJS.ErrnoException)=>{if(error.code==='EADDRINUSE'||error.code==='EACCES')resolve(false);else reject(error);});
    server.listen(port,'127.0.0.1',()=>server.close(error=>error?reject(error):resolve(true)));
  });
}
export async function findEditorPort(preferred=4310,strict=false){
  // Another process can bind after this check; Vite's strictPort remains the final guard.
  for(let attempt=0;attempt<(strict?1:50);attempt++){
    const port=preferred+attempt*2;if(port>65534)break;
    if((await Promise.all([available(port),available(port+1)])).every(Boolean))return port;
  }
  throw new Error(strict?`Ports ${preferred}/${preferred+1} are unavailable. Open an existing editor or choose --port with two free consecutive ports.`:'No free editor/preview pair found. Choose --port with two free consecutive ports.');
}
