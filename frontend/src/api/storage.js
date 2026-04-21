const KEY_USERS = 'mahima_users_v1'
const KEY_TEAMS = 'mahima_teams_v1'
const KEY_MEETINGS = 'mahima_meetings_v1'

function read(key){ try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function write(key, arr){ localStorage.setItem(key, JSON.stringify(arr)) }

function id(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

export const usersApi = {
  list: () => Promise.resolve(read(KEY_USERS)),
  get: (idv) => Promise.resolve(read(KEY_USERS).find(x=>x.id===idv)),
  create: (u) => {
    const all = read(KEY_USERS)
    const n = { ...u, id: id(), createdAt: new Date().toISOString() }
    all.unshift(n); write(KEY_USERS, all); return Promise.resolve(n)
  },
  update: (idv, patch) => {
    const all = read(KEY_USERS).map(x => x.id === idv ? ({ ...x, ...patch }) : x)
    write(KEY_USERS, all); return Promise.resolve(all.find(x=>x.id===idv))
  },
  delete: (idv) => {
    const all = read(KEY_USERS).filter(x=>x.id!==idv); write(KEY_USERS, all); return Promise.resolve()
  }
}

export const teamsApi = {
  list: () => Promise.resolve(read(KEY_TEAMS)),
  create: (t) => { const all=read(KEY_TEAMS); const n={...t,id:id()}; all.unshift(n); write(KEY_TEAMS, all); return Promise.resolve(n) },
  update: (idv,patch) => { const all = read(KEY_TEAMS).map(x=>x.id===idv?({...x,...patch}):x); write(KEY_TEAMS, all); return Promise.resolve(all.find(x=>x.id===idv)) },
  delete: (idv) => { const all = read(KEY_TEAMS).filter(x=>x.id!==idv); write(KEY_TEAMS, all); return Promise.resolve() }
}

export const meetingsApi = {
  list: () => Promise.resolve(read(KEY_MEETINGS)),
  create: (m) => { const all=read(KEY_MEETINGS); const n={...m,id:id()}; all.unshift(n); write(KEY_MEETINGS, all); return Promise.resolve(n) },
  update: (idv,patch) => { const all = read(KEY_MEETINGS).map(x=>x.id===idv?({...x,...patch}):x); write(KEY_MEETINGS, all); return Promise.resolve(all.find(x=>x.id===idv)) },
  delete: (idv) => { const all = read(KEY_MEETINGS).filter(x=>x.id!==idv); write(KEY_MEETINGS, all); return Promise.resolve() }
}


