import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daysLeft,sortItems,shopURL,shareText} from './domain.js';
test('소비기한은 날짜 기준으로 계산하고 미정은 구분한다',()=>{assert.equal(daysLeft('2026-10-27','2026-10-26'),1);assert.equal(daysLeft('2026-10-25','2026-10-26'),-1);assert.equal(daysLeft(null),null);assert.equal(daysLeft('2027-01-01','2026-12-31'),1);});
test('소비기한 미정은 마지막으로 정렬한다',()=>{assert.deepEqual(sortItems([{name:'우유',expires_on:null},{name:'딸기',expires_on:'2026-10-27'},{name:'치즈',expires_on:'2026-10-29'}]).map(i=>i.name),['딸기','치즈','우유']);});
test('쇼핑 검색어는 URL 인코딩한다',()=>{assert.equal(new URL(shopURL('coupang','우유 & 달걀')).searchParams.get('q'),'우유 & 달걀');assert.equal(new URL(shopURL('naver','우유')).searchParams.get('query'),'우유');assert.equal(new URL(shopURL('kurly','우유')).searchParams.get('sword'),'우유');});
test('공유 목록에는 계정 정보나 식별자가 포함되지 않는다',()=>{const text=shareText([{name:'우유',icon:'🥛',quantity:1,unit:'병',location:'냉장',expires_on:null,user_id:'private'}]);assert.ok(text.includes('우유'));assert.ok(!text.includes('private'));});
