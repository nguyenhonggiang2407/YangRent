import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const base=new URL(process.argv[2]);
assert.ok(base.protocol==='https:'||(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)));
assert.equal(base.pathname,'/');assert.equal(base.username,'');assert.equal(base.password,'');
const checks=[];const startedAt=new Date().toISOString();
function pass(name){checks.push({name,result:'passed'});}
async function request(path,{method='GET',body,token,status=200}={}){
  const response=await fetch(new URL(path,base),{method,signal:AbortSignal.timeout(55000),headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});
  assert.equal(response.status,status,`${method} ${path} status`);return response;
}
async function json(path,options){return(await request(path,options)).json();}
const health=await json('/api/health');assert.equal(health.data.mode,'ephemeral-demo');assert.equal(health.data.database,'ok');
if(process.env.EXPECTED_REVISION)assert.equal(health.data.revision,process.env.EXPECTED_REVISION);pass('Isolated demo database health and expected revision');
const html=await(await request('/')).text();assert.match(html,/<title>YangRent/);pass('Homepage HTML');
for(const path of [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(x=>x[1]))]){const r=await request(path);assert.match(r.headers.get('content-type'),/javascript|css/);assert.ok((await r.arrayBuffer()).byteLength>100);pass(`Bundled asset ${path.split('/').pop()}`);}
for(const path of ['/login','/register','/rooms']){assert.match(await(await request(path)).text(),/<title>YangRent/);pass(`Frontend deep route ${path}`);}
await request('/api/does-not-exist',{status:404});await request('/assets/not-present.js',{status:404});pass('Missing API and assets remain 404');
const catalogue=await json('/api/rooms');assert.equal(catalogue.success,true);assert.ok(catalogue.data.items.length>=6);const rooms=catalogue.data.items;assert.ok(rooms.every(x=>/hư cấu|minh họa/i.test(x.title)));pass('Fictional rooms read from the new database');
const detail=await json(`/api/rooms/${rooms[0].id}`);assert.equal(detail.data.id,rooms[0].id);pass('Room detail');
const filtered=await json('/api/rooms?room_type=STUDIO');assert.ok(filtered.data.items.length>0&&filtered.data.items.every(x=>x.room_type==='STUDIO'));pass('Room type filter');
const imagePaths=[...new Set(rooms.flatMap(x=>(x.images||[]).map(i=>typeof i==='string'?i:i.image_url||i.url)).filter(Boolean))];assert.ok(imagePaths.length>=6);
for(const path of imagePaths){assert.match(path,/^\/images\/housing\/[a-z0-9-]+\.webp$/);const r=await request(path);assert.match(r.headers.get('content-type'),/image\/webp/);const bytes=Buffer.from(await r.arrayBuffer()),source=await readFile(new URL('../frontend/public'+path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(source).digest('hex'));}pass('All sample room photographs match the source');
const suffix=Date.now()+'-'+randomBytes(4).toString('hex'),password=randomBytes(27).toString('base64url'),email=`yangrent-qa-${suffix}@example.com`;
const registered=await json('/api/auth/register',{method:'POST',body:{email,password,full_name:'Khách thử hư cấu',roles:['USER']}});assert.ok(registered.data.access_token);assert.deepEqual(registered.data.user.roles,['USER']);pass('Temporary fictional visitor registration');
const logged=await json('/api/auth/login',{method:'POST',body:{email,password}});const token=logged.data.access_token;assert.ok(token);pass('Visitor login');
const me=await json('/api/auth/me',{token});assert.equal(me.data.id,registered.data.user.id);pass('Authenticated profile');
await json(`/api/rooms/${rooms[0].id}/favorite`,{method:'POST',token});let fav=await json('/api/rooms/favorites/me',{token});assert.ok(fav.data.some(x=>x.id===rooms[0].id));pass('Save a favorite and read it back');
await json(`/api/rooms/${rooms[0].id}/favorite`,{method:'POST',token});fav=await json('/api/rooms/favorites/me',{token});assert.ok(!fav.data.some(x=>x.id===rooms[0].id));pass('Remove the test favorite');
await request('/api/auth/me',{status:401});pass('Signed-out profile access denied');
const admin=await fetch(new URL('/api/admin/overview',base),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});assert.ok([401,403].includes(admin.status));pass('Visitor cannot access administrator route');
const elevation=await fetch(new URL('/api/auth/register',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`yangrent-denied-${suffix}@example.com`,password,full_name:'Kiểm tra hư cấu',roles:['ADMIN']}),signal:AbortSignal.timeout(20000)});assert.ok([401,403].includes(elevation.status));pass('Administrator self-registration rejected');
const landlord=await json('/api/auth/register',{method:'POST',body:{email:`yangrent-owner-${suffix}@example.com`,password,full_name:'Chủ thử hư cấu',roles:['LANDLORD']}});
await request(`/api/rooms/${rooms[0].id}`,{method:'PUT',token:landlord.data.access_token,body:{title:'Không được đổi phòng này'},status:403});pass('A new landlord cannot edit someone else’s room');
const report={url:base.href,startedAt,finishedAt:new Date().toISOString(),revision:health.data.revision,passed:checks.length,checks};
if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(`${checks.length} demo checks passed: ${base.href}`);
