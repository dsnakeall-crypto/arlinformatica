import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import ts from 'typescript';
const root=process.cwd(),norm=p=>p.replaceAll('\\','/');
const tracked=cp.execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split(/\r?\n/).map(norm);
const source=tracked.filter(f=>/\.(tsx?|jsx?|css)$/.test(f)&&f.startsWith('resources/'));
const sset=new Set(source);const edges=new Map();const asFile=(base)=>{for(const c of [base,base+'.ts',base+'.tsx',base+'.js',base+'.jsx',base+'.css',base+'/index.ts',base+'/index.tsx'])if(sset.has(c))return c;return null};
for(const f of source){let data=fs.readFileSync(path.join(root,f),'utf8'); let imports=[];if(/\.(tsx?|jsx?)$/.test(f)){const sf=ts.createSourceFile(f,data,ts.ScriptTarget.Latest,true);function visit(n){if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))imports.push(n.moduleSpecifier.text);if(ts.isCallExpression(n)&&n.arguments.length&&ts.isStringLiteral(n.arguments[0])&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(sf)==='require'))imports.push(n.arguments[0].text);ts.forEachChild(n,visit)}visit(sf)}else{imports=[...data.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);}
edges.set(f,imports.filter(x=>x.startsWith('.')).map(x=>asFile(norm(path.posix.normalize(path.posix.join(path.posix.dirname(f),x))))).filter(Boolean));}
const entry=new Set();const blade=tracked.filter(f=>f.endsWith('.blade.php'));for(const f of blade){const d=fs.readFileSync(path.join(root,f),'utf8');for(const m of d.matchAll(/resources\/(?:js|css)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|css|js)/g)){let a=asFile(m[0]);if(a)entry.add(a)}}
const vite=tracked.filter(f=>/vite\.config\.[jt]s$/.test(f));for(const f of vite){let d=fs.readFileSync(path.join(root,f),'utf8');for(const m of d.matchAll(/resources\/(?:js|css)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|css|js)/g)){let a=asFile(m[0]);if(a)entry.add(a)}}
const visited=new Set();function walk(f){if(visited.has(f))return;visited.add(f);for(const e of edges.get(f)||[])walk(e)}for(const f of entry)walk(f);
const unreachable=source.filter(f=>!visited.has(f));
console.log(JSON.stringify({tracked:tracked.length,source:source.length,entries:[...entry].sort(),reachable:visited.size,unreachable:unreachable.sort(),note:'Candidatos apenas: grafo de imports estaticos relativos e strings dinamicas literais, sem validacao de runtime e sem PHP service container'},null,2));
