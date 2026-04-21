import { call, cleanPayload } from "./_helper";

async function tryList(path) {
  try { return await call(path); } catch (e) { if (e && e.status === 405) return await call(path, { method: "POST", body: JSON.stringify({}) }); throw e; }
}

export const usersApi = {
  list: ({ search="", page=1, limit=50 }={}) => tryList(`/api/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`),
  get: (id) => call(`/api/users/${id}`),
  create: (p) => { const payload=cleanPayload(p)||{}; delete payload.id; delete payload.Id; return call("/api/users",{method:"POST", body:JSON.stringify(payload)}); },
  update: async (id,p) => { try { return await call(`/api/users/${id}`,{method:"PUT", body: JSON.stringify(cleanPayload(p))}); } catch (e) { if (e && e.status===405) return await call("/api/users",{method:"POST", body:JSON.stringify({...cleanPayload(p), id})}); throw e; } },
  remove: (id) => call(`/api/users/${id}`, { method: "DELETE" })
};

