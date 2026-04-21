import { call, cleanPayload } from "./_helper";

async function tryList(path) {
  try { return await call(path); } catch (e) { if (e && e.status === 405) return await call(path, { method: "POST", body: JSON.stringify({}) }); throw e; }
}

export const usersApi = {
  list: () => tryList(`/users`),
  get: (id) => call(`/users/${id}`),
  create: (p) => { const payload=cleanPayload(p)||{}; delete payload.id; delete payload.Id; return call("/users",{method:"POST", body:JSON.stringify(payload)}); },
  update: async (id,p) => { try { return await call(`/users/${id}`,{method:"PUT", body: JSON.stringify(cleanPayload(p))}); } catch (e) { if (e && e.status===405) return await call("/users",{method:"POST", body:JSON.stringify({...cleanPayload(p), id})}); throw e; } },
  remove: (id) => call(`/users/${id}`, { method: "DELETE" })
};

