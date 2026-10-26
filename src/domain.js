export function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function daysLeft(value, today = dateKey()) { return value ? Math.round((Date.parse(value+'T00:00:00Z') - Date.parse(today+'T00:00:00Z')) / 86400000) : null; }
export function expiryLabel(value) { const d=daysLeft(value); return d===null?'날짜 미정':d<0?`${-d}일 지남`:d===0?'오늘까지':`D-${d}`; }
export function shopURL(shop, name) { const q=encodeURIComponent(name); return {coupang:`https://www.coupang.com/np/search?q=${q}`,kurly:`https://www.kurly.com/search?sword=${q}`,naver:`https://search.shopping.naver.com/search/all?query=${q}`,baemin:'https://www.baemin.com/'}[shop]; }
export function shareText(items) { return '🌱 나의 냉장고 숲\n'+items.map(i=>`${i.icon} ${i.name} · ${i.quantity}${i.unit} · ${i.location} · ${i.expires_on || '소비기한 미정'}`).join('\n'); }
export function sortItems(items) { return [...items].sort((a,b)=>(a.expires_on||'9999').localeCompare(b.expires_on||'9999') || a.name.localeCompare(b.name,'ko')); }
