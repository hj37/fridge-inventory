import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseReceipt,inferFood,remainingQuantity,mergeReceiptItems,units} from './receipt.js';
test('영수증 가격과 구매 수량을 구분하고 결제 정보는 제외한다',()=>{
 const rows=parseReceipt('품명 단가 수량 금액\n01 청정원 된장 500g 3,000 2 6,000\n02 진간장 1L 5,500 1 5,500\n합계 11,500\n신용카드 1234-****-****-5678\n2026-11-01 17:00\n사업자 123-45-67890');
 assert.equal(rows.length,2);assert.equal(rows[0].quantity,2);assert.equal(rows[0].unit,'개');assert.equal(rows[0].name,'청정원 된장 500g');assert.match(rows[0].note,/포장 용량/);assert.equal(rows[1].category,'소스·장류');assert.equal(rows[0].expires_on,null);
});
test('불명확한 수량은 1로 제안하고 수정을 요구한다',()=>{const [row]=parseReceipt('토마토 3,900');assert.equal(row.quantity,1);assert.match(row.note,/수량을 읽지 못해/);assert.equal(row.name,'토마토');});
test('소스·장류를 넓게 인식하되 일반 식재료는 구분한다',()=>{for(const name of ['고추장','된장','양조간장','쌈장','굴소스','참깨 드레싱','마요네즈','케찹','올리브유','멸치액젓'])assert.equal(inferFood(name).category,'소스·장류');assert.equal(inferFood('양파').category,'식재료');});
test('무게 단위와 소수 사용량을 지원하고 과다 차감을 막는다',()=>{assert.ok(units.includes('g'));assert.equal(remainingQuantity(500,125),375);assert.equal(remainingQuantity(.3,.1),.2);assert.equal(remainingQuantity(100,100),0);assert.throws(()=>remainingQuantity(100,101));assert.throws(()=>remainingQuantity(100,-2));});
test('기존 재고에 더할 때 단위와 소비기한을 확인하고 전체 작업은 원본을 변경하지 않는다',()=>{
 const items=[{id:1,name:'된장',quantity:300,unit:'g',location:'냉장',expires_on:'2026-12-01'}];
 const row={target_id:'1',name:'된장',quantity:100,unit:'g',location:'냉장',expires_on:'2026-12-01'};
 assert.equal(mergeReceiptItems(items,[row])[0].quantity,400);assert.equal(items[0].quantity,300);
 assert.throws(()=>mergeReceiptItems(items,[{...row,unit:'개'}]));assert.throws(()=>mergeReceiptItems(items,[{...row,expires_on:null}]));assert.throws(()=>mergeReceiptItems(items,[{...row,target_id:'2'}]));
});
test('수량 표시와 곱하기 표기를 인식한다',()=>{assert.equal(parseReceipt('굴소스 수량:2')[0].quantity,2);assert.equal(parseReceipt('양파 x3')[0].quantity,3);});
test('가격이나 수량이 없는 안내 문장은 재고 후보에 포함하지 않는다',()=>{assert.equal(parseReceipt('실제 구매내역이 아닌 검증용 이미지\n감사합니다').length,0);});
