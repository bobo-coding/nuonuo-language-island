import {pathToFileURL} from 'node:url';

// Read the real project using the same official API endpoint and action as the
// pinned EdgeOne CLI. --area is a create-time flag, so a successful upload alone
// cannot prove that an existing project's acceleration area matches the request.
const endpoints={china:'https://pages-api.cloud.tencent.com/v1',global:'https://pages-api.edgeone.ai/v1'};
const regions={china:'ap-guangzhou',global:'ap-singapore'};
export async function verifyArea({token,site='china',name='nuonuo-language-island-cn',area='global'},request=fetch){
  if(!token)throw new Error('需要 EDGEONE_API_TOKEN 才能核对线上项目区域。');
  if(!endpoints[site])throw new Error('账号站点必须为 china 或 global。');
  if(!['global','overseas'].includes(area))throw new Error('加速区域必须为 global 或 overseas。');
  const response=await request(endpoints[site],{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({Action:'DescribePagesProjects',Region:regions[site],Filters:[{Name:'Name',Values:[name]}],Offset:0,Limit:100}),
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw new Error(`核对项目区域失败：HTTP ${response.status}。`);
  const envelope=await response.json(),data=envelope.Data?.Response??envelope.Response??envelope;
  // Do not echo raw API errors: they can contain credential or account details.
  if((envelope.Code!==undefined&&envelope.Code!==0)||data.Error)throw new Error('腾讯云 API 未能返回有效的项目信息，请在控制台检查凭证权限。');
  const project=data.Projects?.find(p=>p.Name===name);
  if(!project)throw new Error(`未找到目标项目 ${name}，无法确认区域。`);
  if(project.Area!==area)throw new Error(`项目 ${name} 实际区域为 ${project.Area??'未知'}，期望 ${area}。已有项目不会因 deploy --area 自动切换区域。`);
  return {name:project.Name,id:project.ProjectId,area:project.Area};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const project=await verifyArea({token:process.env.EDGEONE_API_TOKEN,site:process.env.EDGEONE_SITE||'china',name:process.env.EDGEONE_PROJECT_NAME||'nuonuo-language-island-cn',area:process.env.EDGEONE_AREA||'global'});
    console.log(`已核对线上项目：${project.name} (${project.id})，实际加速区域：${project.area==='global'?'全球可用区（含中国大陆）':'全球可用区（不含中国大陆）'}。`);
  }catch(error){
    console.error(error.name==='TimeoutError'?'核对项目区域超时，请稍后重跑工作流。':error.message);
    process.exitCode=1;
  }
}
