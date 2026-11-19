import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.env.PORT||4173);
const mime={
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.glb':'model/gltf-binary'
};
createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/'||pathname==='')pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if(!(file===root||file.startsWith(root+path.sep))||file.includes(path.sep+'.git'+path.sep)){
      res.writeHead(403);res.end('Acesso negado');return;
    }
    const info=await stat(file);
    if(!info.isFile()){res.writeHead(404);res.end('Não encontrado');return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  }catch{
    res.writeHead(404);res.end('Não encontrado');
  }
}).listen(PORT,()=>console.log('Oficina 3D: http://localhost:'+PORT));
