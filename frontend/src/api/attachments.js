import { call } from "./_helper";
async function tryList(path){try{return await call(path)}catch(e){if(e&&e.status===405) return await call(path,{method:"POST",body:JSON.stringify({})}); throw e}}
export const attachmentsApi = {
  list: () => tryList("/attachments"),
  get: (id) => call(`/attachments/${id}`)
  // file uploads require FormData and a direct fetch from UI
};

