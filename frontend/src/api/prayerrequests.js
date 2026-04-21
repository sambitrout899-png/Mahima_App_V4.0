import { call, cleanPayload } from "./_helper";
async function tryList(path){try{return await call(path)}catch(e){if(e&&e.status===405) return await call(path,{method:"POST",body:JSON.stringify({})}); throw e}}
export const prayerrequestsApi = {
  list: () => tryList("/prayerrequests"),
  get: (id) => call(`/prayerrequests/${id}`),
  create: (p) => { const payload = cleanPayload(p)||{}; delete payload.id; delete payload.Id; return call("/prayerrequests",{method:"POST", body: JSON.stringify(payload)}); },
  update: async (id,p) => { try{return await call(`/prayerrequests/${id}`,{method:"PUT", body:JSON.stringify(cleanPayload(p))}); } catch(e) { if(e && e.status===405) return await call("/prayerrequests",{method:"POST", body: JSON.stringify({...cleanPayload(p), id})}); throw e; } },
  remove: (id) => call(`/prayerrequests/${id}`,{ method:"DELETE" })
};

