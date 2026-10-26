import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daysLeft,sortItems,shopURL,shareText} from './domain.js';
test('소비기한은 날짜 기준으로 계산하고 미정은 구분한다',()=>{assert.equal(daysLeft('2026-10-27','2026-10-26'),1);assert.equal(daysLeft('2026-10-25','2026-10-26'),-1);assert.equal(daysLeft(null),null);assert.equal(daysLeft('2027-01-01','2026-12-31'),1);});
test('소비기한 미정은 마지막으로 정렬한다',()=>{assert.deepEqual(sortItems([{name:'우유',expires_on:null},{name:'딸기',expires_on:'2026-10-27'},{name:'치즈',expires_on:'2026-10-29'}]).map(i=>i.name),['딸기','치즈','우유']);});
test('쇼핑 검색어는 URL 인코딩한다',()=>{assert.equal(new URL(shopURL('coupang','우유 & 달걀')).searchParams.get('q'),'우유 & 달걀');assert.equal(new URL(shopURL('naver','우유')).searchParams.get('query'),'우유');assert.equal(new URL(shopURL('kurly','우유')).searchParams.get('sword'),'우유');});
test('공유 목록에는 계정 정보나 식별자가 포함되지 않는다',()=>{const text=shareText([{name:'우유',icon:'🥛',quantity:1,unit:'병',location:'냉장',expires_on:null,user_id:'private'}]);assert.ok(text.includes('우유'));assert.ok(!text.includes('private'));});

test('저녁 재료는 기한 지난 재고와 소진된 재고를 제외하고 오늘 마감부터 제안한다',async()=>{
 const {dinnerIngredients}=await import('./domain.js');
 const items=[{name:'지난 우유',quantity:1,expires_on:'2026-10-25'},{name:'달걀',quantity:6,expires_on:'2026-10-28'},{name:'브로콜리',quantity:1,expires_on:'2026-10-26'},{name:'소진',quantity:0,expires_on:null},{name:'만두',quantity:1,expires_on:null}];
 assert.deepEqual(dinnerIngredients(items,'2026-10-26').map(i=>i.name),['브로콜리','달걀','만두']);
});
test('같은 이름의 식재료는 한 번만 제안하고 원본을 변경하지 않는다',async()=>{
 const {dinnerIngredients}=await import('./domain.js');
 const items=[{name:'달걀',quantity:1,expires_on:'2026-10-28'},{name:'달걀',quantity:2,expires_on:'2026-10-26'}];
 assert.equal(dinnerIngredients(items,'2026-10-26').length,1);assert.equal(items[0].quantity,1);
});
test('재고가 없으면 일반 집밥 검색어를 만들고 특수문자를 그대로 전달할 수 있다',async()=>{
 const {dinnerSearchQuery,dinnerIngredients}=await import('./domain.js');
 assert.deepEqual(dinnerIngredients([]),[]);
 assert.equal(dinnerSearchQuery(),'간단 집밥 저녁 레시피');
 const url=new URL('https://www.youtube.com/results');url.searchParams.set('search_query',dinnerSearchQuery('달걀 & 양파'));
 assert.equal(url.searchParams.get('search_query'),'달걀 & 양파 간단 집밥 저녁 레시피');
});
