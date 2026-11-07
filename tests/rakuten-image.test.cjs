const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/rakuten-image.js');
const url = 'https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/item.jpg?_ex=1000x1000';
async function request(input) {
  const res = {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(value){this.body=value;return this;},send(value){this.body=value;return this;}};
  await handler({query:{url:input}},res); return res;
}
test('image proxy validates destinations, preserves image bytes and handles failures', async t => {
  const original = global.fetch;
  t.after(() => { global.fetch = original; });
  await t.test('rejects other hosts, protocols, credentials, ports and paths before fetching', async () => {
    global.fetch = () => { throw Error('must not fetch'); };
    for (const input of ['https://example.com/x.jpg','https://thumbnail.image.rakuten.co.jp.evil.test/@0_mall/a','http://thumbnail.image.rakuten.co.jp/@0_mall/a','https://user:pass@thumbnail.image.rakuten.co.jp/@0_mall/a','https://thumbnail.image.rakuten.co.jp:8080/@0_mall/a','https://thumbnail.image.rakuten.co.jp/private',undefined]) assert.equal((await request(input)).code,400);
  });
  await t.test('delivers exact bytes and disallows redirects', async () => {
    const bytes=Buffer.from([255,216,255,217]);
    global.fetch=async (target,options)=>{assert.equal(target,url);assert.equal(options.redirect,'error');return new Response(bytes,{headers:{'Content-Type':'image/jpeg'}});};
    const res=await request(url);assert.equal(res.code,200);assert.deepEqual(res.body,bytes);assert.equal(res.headers['Content-Type'],'image/jpeg');
  });
  await t.test('reports upstream denial without treating it as a valid image', async () => {
    global.fetch=async()=>new Response('Forbidden',{status:403});
    const res=await request(url);assert.equal(res.code,502);assert.equal(res.body.upstreamStatus,403);
  });
  await t.test('rejects non-image responses',async()=>{
    global.fetch=async()=>new Response('<html>error</html>',{headers:{'Content-Type':'text/html'}});
    assert.equal((await request(url)).code,502);
  });
  await t.test('bounds downloaded bytes',async()=>{
    global.fetch=async()=>new Response(new Uint8Array(3*1024*1024+1),{headers:{'Content-Type':'image/png'}});
    assert.equal((await request(url)).code,413);
  });
  await t.test('connection errors remain recoverable',async()=>{
    global.fetch=async()=>{throw Error('connection failed');};
    assert.equal((await request(url)).code,502);
  });
});
