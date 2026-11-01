export const units = ['개','g','kg','ml','L','팩','봉','병','통','모','단','캔'];
const condimentPattern = /간장|고추장|된장|쌈장|춘장|청국장|초장|소스|드레싱|마요네즈|케[첩찹]|머스[터타]드|굴소스|액젓|식초|참기름|들기름|식용유|올리브유|고춧가루|소금|설탕|후추|물엿|올리고당|맛술/;
export function inferFood(name) {
 if(condimentPattern.test(name)) return {icon:'🫙',category:'소스·장류'};
 const foods=[[/달걀|계란/,'🥚'],[/우유/,'🥛'],[/두부/,'◻️'],[/돼지|소고기|삼겹|목살/,'🥩'],[/닭/,'🍗'],[/만두/,'🥟'],[/양파/,'🧅'],[/감자/,'🥔'],[/당근/,'🥕'],[/브로콜리/,'🥦'],[/토마토/,'🍅'],[/버섯/,'🍄'],[/사과/,'🍎'],[/딸기/,'🍓'],[/치즈/,'🧀']];
 return {icon:foods.find(([pattern])=>pattern.test(name))?.[1]||'🥬',category:'식재료'};
}
const metadata = /합\s*계|총\s*액|결제|과세|면세|부가세|승인|신용|현금|카드|할인|쿠폰|포인트|거스름|사업자|대표자|전화|주소|영수증|감사합니다|상품명|품명|단가|매장|고객|적립|판매일|거래일|취소|환불|반품/;
export function parseReceipt(text) {
 const rows=[];
 for(const source of text.split(/\r?\n/)) {
  const line=source.trim().replace(/[₩￦]/g,'').replace(/\s+/g,' ');
  if(!/\d/.test(line)||!/[가-힣A-Za-z]/.test(line)||metadata.test(line)||/\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{2,3}-\d{3,4}-\d{4}|\d{3}-\d{2}-\d{5}/.test(line)) continue;
  if(/수량/.test(line)&&!/수량\s*[:：]?\s*\d/.test(line)) continue;
  let name=line.replace(/^\d{1,3}[.)]?\s+/,'').replace(/^\d{8,14}\s+/,'');
  let quantity=1, note='수량을 읽지 못해 1개로 제안했어요. 확인해주세요.';
  const columns=name.match(/^(.*?)\s+([\d,]+)\s+(\d{1,3})\s+([\d,]+)\s*$/);
  if(columns&&Number(columns[2].replaceAll(',',''))>=100&&Number(columns[4].replaceAll(',',''))>=100) {
   name=columns[1];quantity=Number(columns[3]);note='단가·수량·금액 열에서 읽었어요. 수량을 확인해주세요.';
  } else {
   const explicit=name.match(/(?:수량\s*[:：]?\s*|[x×*]\s*)(\d{1,3})(?:\s*개)?\s*$/i);
   if(explicit){quantity=Number(explicit[1]);name=name.slice(0,explicit.index).trim();note='표시된 구매 수량을 읽었어요. 확인해주세요.';}
   else name=name.replace(/\s+[\d,]+(?:원)?\s*$/,'').trim();
  }
  name=name.replace(/\s+[\d,]+원?$/,'').trim();
  if(name.length<2||name.length>100||quantity<=0||quantity>999||!/[가-힣A-Za-z]/.test(name)) continue;
  const weight=name.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|L)\b/i);
  if(weight) note+=` 포장 용량 ${weight[0]}은 구매 개수와 별개예요. 무게로 관리하려면 수량과 단위를 수정하세요.`;
  rows.push({name,quantity,unit:'개',location:'냉장',expires_on:null,...inferFood(name),note,source,target_id:null});
  if(rows.length===50) break;
 }
 return rows;
}
export function remainingQuantity(total,used) {
 const amount=Number(used);
 if(!Number.isFinite(amount)||amount<=0||amount>Number(total)) throw new Error('사용량은 0보다 크고 현재 재고 이하여야 해요.');
 return Math.round((Number(total)-amount)*100)/100;
}
export function mergeReceiptItems(items,rows) {
 const result=items.map(item=>({...item}));
 for(const row of rows) {
  const {target_id,...value}=row;
  if(!target_id){result.push({...value,id:crypto.randomUUID()});continue;}
  const target=result.find(item=>String(item.id)===String(target_id));
  if(!target||target.unit!==row.unit||target.location!==row.location||(target.expires_on||null)!==(row.expires_on||null)) throw new Error('기존 재고의 단위·보관장소·소비기한을 확인해주세요.');
  target.quantity=Math.round((Number(target.quantity)+Number(row.quantity))*100)/100;
  if(target.quantity>99999) throw new Error('재고 수량은 99,999를 넘을 수 없어요.');
 }
 return result;
}
