import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyArea} from '../scripts/verify-edgeone-area.mjs';

test('verifies the actual project area without putting the token in the URL or body',async()=>{
  const fakeToken='fake-test-token';
  const result=await verifyArea({token:fakeToken},async(url,options)=>{
    assert.equal(url,'https://pages-api.cloud.tencent.com/v1');
    assert.equal(options.headers.Authorization,`Bearer ${fakeToken}`);
    assert(!options.body.includes(fakeToken));
    const body=JSON.parse(options.body);
    assert.equal(body.Action,'DescribePagesProjects');assert.equal(body.Region,'ap-guangzhou');
    assert.deepEqual(body.Filters,[{Name:'Name',Values:['nuonuo-language-island-cn']}]);
    return {ok:true,json:async()=>({Code:0,Data:{Response:{Projects:[{Name:'nuonuo-language-island-cn',ProjectId:'test-project',Area:'global'}]}}})};
  });
  assert.equal(result.area,'global');
});

test('rejects an existing overseas project even when the upload itself succeeded',async()=>{
  await assert.rejects(verifyArea({token:'fake'},async()=>({ok:true,json:async()=>({Code:0,Data:{Response:{Projects:[{Name:'nuonuo-language-island-cn',Area:'overseas'}]}}})})),/实际区域为 overseas/);
});

test('does not substitute another project, accept an empty response or disclose raw API errors',async()=>{
  for(const payload of [{Code:0,Data:{Response:{Projects:[{Name:'another-project',Area:'global'}]}}},{Code:0,Data:{Response:{Projects:[]}}},{Code:1,Message:'sensitive-account-detail',Data:{}}]){
    await assert.rejects(verifyArea({token:'fake'},async()=>({ok:true,json:async()=>payload})),error=>!error.message.includes('sensitive-account-detail'));
  }
});

test('requires credentials and a recognized account site before making a request',async()=>{
  const noRequest=()=>assert.fail('must not send request');
  await assert.rejects(verifyArea({},noRequest),/EDGEONE_API_TOKEN/);
  await assert.rejects(verifyArea({token:'fake',site:'unexpected'},noRequest),/账号站点/);
  await assert.rejects(verifyArea({token:'fake',area:'mainland'},noRequest),/加速区域/);
});
