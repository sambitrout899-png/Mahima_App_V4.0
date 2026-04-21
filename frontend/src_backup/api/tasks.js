import { call, cleanPayload } from "./_helper";
async function tryList(path){try{return await call(path)}catch(e){if(e&&e.status===405) return await call(path,{method:"POST",body:JSON.stringify({})}); throw e}}
export const tasksApi = {
  list: () => tryList("/api/tasks"),
  get: (id) => call(`/api/tasks/${id}`),
  create: (p) => { const payload = cleanPayload(p)||{}; delete payload.id; delete payload.Id; return call("/api/tasks",{method:"POST", body: JSON.stringify(payload)}); },
  update: async (id,p) => { try{return await call(`/api/tasks/${id}`,{method:"PUT", body:JSON.stringify(cleanPayload(p))}); } catch(e) { if(e && e.status===405) return await call("/api/tasks",{method:"POST", body: JSON.stringify({...cleanPayload(p), id})}); throw e; } },
  remove: (id) => call(`/api/tasks/${id}`,{ method:"DELETE" })
};

