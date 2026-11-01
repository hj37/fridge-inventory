import {parseReceipt,inferFood,units,mergeReceiptItems} from './receipt.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(values,current)=>values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${v==='g'?'g (그램)':esc(v)}</option>`).join('');
export function openReceipt({db,getItems,getUser,onSaved,notify}) {
 const owner=getUser()?.id||null;
 const dialog=document.querySelector('#modal');dialog.className='receipt-dialog';
 dialog.innerHTML=`<div class="modal-title"><h2>🧾 영수증으로 채우기</h2><button id="receipt-close" aria-label="닫기">✕</button></div><p>사진은 내 브라우저에서 읽고 업로드하지 않아요. 품목과 수량을 확인한 뒤 저장해주세요.</p><div class="receipt-buttons"><label class="outline">📷 사진 촬영<input id="receipt-camera" type="file" accept="image/*" capture="environment" hidden></label><label class="outline">▧ 사진 선택<input id="receipt-photo" type="file" accept="image/*" hidden></label></div><p id="receipt-status" role="status" aria-live="polite">처음에는 한국어 인식 파일을 내려받아 시간이 걸릴 수 있어요.</p><details><summary>인식한 글자 직접 수정 / 붙여넣기</summary><textarea id="receipt-text" rows="7" maxlength="20000" aria-label="영수증 텍스트" placeholder="품목명 단가 수량 금액"></textarea><button type="button" class="outline" id="receipt-parse">이 글자로 품목 다시 읽기</button></details><form id="receipt-form"><div id="receipt-rows"></div><div class="receipt-buttons"><button type="button" class="outline" id="receipt-add-row">＋ 품목 직접 추가</button><button type="submit" class="primary" id="receipt-save" disabled>선택한 품목 재고에 반영</button></div><p>사진·영수증에는 보통 소비기한이 없어요. 날짜는 포장을 확인해 직접 입력해주세요. 소스·장류도 개봉 여부에 맞춰 보관장소를 확인해주세요.</p></form>`;
 const state={rows:[],fingerprint:null,saving:false,controller:null,ocrBusy:false};
 const close=()=>{if(state.saving)return;state.controller?.abort();dialog.close();};
 document.querySelector('#receipt-close').onclick=close;
 dialog.oncancel=event=>{event.preventDefault();close();};
 dialog.onclose=()=>{state.controller?.abort();dialog.className='';dialog.oncancel=null;dialog.onclose=null;};
 const showRows=()=>renderRows(state,getItems());
 document.querySelector('#receipt-parse').onclick=()=>{state.rows=parseReceipt(document.querySelector('#receipt-text').value);showRows();};
 document.querySelector('#receipt-add-row').onclick=()=>{captureRows(state);state.rows.push({name:'',quantity:1,unit:'개',location:'냉장',expires_on:null,category:'식재료',icon:'🥬',note:'직접 추가한 품목이에요.'});showRows();};
 for(const id of ['receipt-camera','receipt-photo']) document.querySelector('#'+id).onchange=event=>scanPhoto(event.target.files[0],state,dialog,showRows);
 document.querySelector('#receipt-form').onsubmit=event=>saveReceipt(event,state,{db,getItems,getUser,owner,onSaved,notify},dialog);
 dialog.showModal();
}
async function scanPhoto(file,state,dialog,showRows) {
 if(!file||state.ocrBusy||state.saving)return;
 if(file.size>15*1024*1024){document.querySelector('#receipt-status').textContent='사진은 15MB 이하로 선택해주세요.';return;}
 if(state.rows.length&&!confirm('현재 수정 중인 품목을 새 사진으로 교체할까요?'))return;
 state.rows=[];state.fingerprint=null;document.querySelector('#receipt-text').value='';showRows();
 state.controller=new AbortController();state.ocrBusy=true;
 const status=document.querySelector('#receipt-status');status.textContent='사진을 읽는 중이에요…';
 setReceiptBusy(true);
 try {
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  state.fingerprint=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  const {recognizeReceipt}=await import('./receipt-ocr.js');
  const text=await recognizeReceipt(file,message=>{if(dialog.open&&!state.controller.signal.aborted)status.textContent=message.status==='recognizing text'?`영수증 읽는 중… ${Math.round((message.progress||0)*100)}%`:'한국어 인식 준비 중…';},state.controller.signal);
  if(!dialog.open||state.controller.signal.aborted)return;
  document.querySelector('#receipt-text').value=text;state.rows=parseReceipt(text);showRows();
  status.textContent=state.rows.length?`${state.rows.length}개 품목 후보를 찾았어요. 가격이 수량으로 읽히지 않았는지 확인해주세요.`:'품목을 찾지 못했어요. 밝고 선명하게 다시 찍거나 글자를 붙여넣어주세요.';
 }catch(error){if(dialog.open&&!state.controller.signal.aborted)status.textContent=`사진을 읽지 못했어요. ${error.message} 글자 붙여넣기도 사용할 수 있어요.`;}
 finally {state.ocrBusy=false;if(dialog.open&&!state.controller.signal.aborted){setReceiptBusy(false);document.querySelector('#receipt-save').disabled=!state.rows.length;}}
}
function setReceiptBusy(value) {
 document.querySelectorAll('#receipt-camera,#receipt-photo,#receipt-parse,#receipt-add-row,#receipt-save').forEach(el=>el.disabled=value);
}
function renderRows(state,items) {
 document.querySelector('#receipt-rows').innerHTML=state.rows.map((row,index)=>`<fieldset class="receipt-row" data-row="${index}"><legend><label class="receipt-check"><input type="checkbox" name="include" ${row.include===false?'':'checked'}> ${index+1}. ${esc(row.icon||'🥬')} 등록할 품목</label></legend><label>품목명<input name="name" value="${esc(row.name)}" maxlength="100" required></label><div class="form-row"><label>구매 수량<input name="quantity" type="number" min="0.01" max="99999" step="0.01" value="${row.quantity}" required></label><label>단위<select name="unit">${options(units.includes(row.unit)?units:[row.unit,...units],row.unit)}</select></label></div><div class="form-row"><label>분류<select name="category">${options(['식재료','소스·장류'],row.category)}</select></label><label>보관장소<select name="location">${options(['냉장','냉동','실온'],row.location)}</select></label></div><label>소비기한<input name="expires_on" type="date" value="${row.expires_on||''}"></label><label>반영 방법<select name="target_id"><option value="">새 재고로 등록</option>${items.map(i=>`<option value="${esc(i.id)}" ${String(row.target_id)===String(i.id)?'selected':''}>기존에 더하기: ${esc(i.name)} (${i.quantity}${esc(i.unit)}, ${esc(i.expires_on||'날짜 미정')})</option>`).join('')}</select></label><small>${row.source?`읽은 글자: ${esc(row.source)}<br>`:''}${esc(row.note||'수량과 단위를 확인해주세요.')}</small></fieldset>`).join('');
 document.querySelector('#receipt-save').disabled=!state.rows.length;
 document.querySelectorAll('[data-row]').forEach(field=>{
  field.querySelector('[name="include"]').onchange=event=>{for(const control of field.querySelectorAll('input:not([name="include"]),select'))control.disabled=!event.target.checked;};
  field.querySelector('[name="name"]').onchange=event=>{const food=inferFood(event.target.value);field.querySelector('[name="category"]').value=food.category;};
  field.querySelector('[name="target_id"]').onchange=event=>{
   const target=items.find(item=>String(item.id)===event.target.value);if(!target)return;
   field.querySelector('[name="unit"]').value=target.unit;field.querySelector('[name="location"]').value=target.location;field.querySelector('[name="expires_on"]').value=target.expires_on||'';
  };
  if(field.querySelector('[name="include"]').checked===false)field.querySelector('[name="include"]').dispatchEvent(new Event('change'));
 });
}
function captureRows(state) {
 state.rows=Array.from(document.querySelectorAll('[data-row]')).map((field,index)=>{
  const value=name=>field.querySelector(`[name="${name}"]`).value;
  return {...state.rows[index],name:value('name').trim(),quantity:Number(value('quantity')),unit:value('unit'),category:value('category'),location:value('location'),expires_on:value('expires_on')||null,target_id:value('target_id')||null,icon:inferFood(value('name')).icon,include:field.querySelector('[name="include"]').checked};
 });
}
async function saveReceipt(event,state,context,dialog) {
 event.preventDefault();if(state.saving||state.ocrBusy)return;
 captureRows(state);const selected=state.rows.filter(row=>row.include!==false);
 if(!selected.length)return context.notify('반영할 품목을 선택해주세요.');
 if((context.getUser()?.id||null)!==context.owner)return context.notify('로그인 계정이 바뀌었어요. 창을 닫고 다시 시작해주세요.');
 const rows=selected.map(({name,quantity,unit,category,location,expires_on,target_id,icon})=>({name,quantity,unit,category,location,expires_on,target_id,icon}));
 state.saving=true;setReceiptBusy(true);document.querySelector('#receipt-close').disabled=true;
 const status=document.querySelector('#receipt-status');status.textContent='재고에 반영하는 중이에요…';
 try {
  const fingerprint=state.fingerprint||Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(rows))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  let duplicate=false;
  if(context.owner){const {data,error}=await context.db.rpc('import_fridge_receipt',{receipt_hash:fingerprint,receipt_rows:rows});if(error)throw error;duplicate=data.duplicate;}
  else {
   const imports=JSON.parse(localStorage.getItem('fridge-demo-receipts')||'[]');duplicate=imports.includes(fingerprint);
   if(!duplicate){const next=mergeReceiptItems(context.getItems(),rows);localStorage.setItem('fridge-demo',JSON.stringify(next));localStorage.setItem('fridge-demo-receipts',JSON.stringify([...imports,fingerprint]));}
  }
  state.saving=false;dialog.close();try{await context.onSaved();}catch{context.notify('반영은 완료했지만 재고를 다시 불러오지 못했어요. 새로고침해주세요.');return;}context.notify(duplicate?'이미 반영한 영수증이에요. 중복으로 더하지 않았어요.':`${rows.length}개 품목을 재고에 반영했어요 🧾`);
 }catch(error){status.textContent=`저장하지 못했어요: ${error.message}`;}
 finally {state.saving=false;if(dialog.open){setReceiptBusy(false);document.querySelector('#receipt-close').disabled=false;}}
}
