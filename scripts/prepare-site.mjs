import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Stage only runtime assets, never the surrounding workspace or student documents.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'dist');
const outputArg=process.argv[2];
if(!outputArg)throw new Error('Usage: node scripts/prepare-site.mjs <empty-output-directory>');
if(fs.lstatSync(source).isSymbolicLink())throw new Error('dist must be a real directory, not a symlink.');
const output=path.resolve(outputArg);
if(output===source||output.startsWith(source+path.sep)||source.startsWith(output+path.sep))throw new Error('Output must be outside dist and cannot contain dist.');
fs.mkdirSync(output,{recursive:true});
if(fs.lstatSync(output).isSymbolicLink()||fs.readdirSync(output).length)throw new Error('Output must be an empty, real directory.');
const roots=new Set(['index.html','navigation.html','plan.html','train.html','journal.html','library.html','parents.html','curriculum.html']);
const extensions=new Set(['.js','.css','.svg','.png','.jpg','.jpeg','.webp','.ico','.woff','.woff2']);
let count=0,bytes=0;
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    if(name==='.DS_Store'||name==='Thumbs.db')continue;
    const file=path.join(dir,name),relative=path.relative(source,file),stat=fs.lstatSync(file);
    if(stat.isSymbolicLink())throw new Error(`Symlinks are not allowed: ${relative}`);
    if(stat.isDirectory()){
      if(relative!=='assets'&&!relative.startsWith('assets'+path.sep))throw new Error(`Unexpected directory in dist: ${relative}`);
      walk(file);continue;
    }
    if(!stat.isFile())throw new Error(`Unexpected file type: ${relative}`);
    const asset=relative.startsWith('assets'+path.sep);
    if((!asset&&!roots.has(relative))||(asset&&(!extensions.has(path.extname(name).toLowerCase())||relative.split(path.sep).some(p=>p.startsWith('.')))))throw new Error(`Unexpected deploy file: ${relative}`);
    if(stat.size>25*1024*1024)throw new Error(`Asset exceeds the documented 25MB limit: ${relative}`);
    const target=path.join(output,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
    count++;bytes+=stat.size;
  }
}
walk(source);
for(const name of roots)if(!fs.existsSync(path.join(output,name)))throw new Error(`Missing entrypoint: ${name}`);
console.log(`已准备 ${count} 个静态文件，共 ${bytes} 字节。`);
console.log('上传范围仅为 dist 中的页面及 assets；不含试卷、分析、凭证或浏览器记录。');
