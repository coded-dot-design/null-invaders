import test from 'node:test';import assert from 'node:assert/strict';
import {shipPixels,SHIP_ANCHOR,SHIP_MUZZLE} from '../src/ship-art.js';
test('tiers equip one stable ship with a split nose and twin rear engines',()=>{
 for(let tier=1;tier<=4;tier++){
  const pixels=shipPixels(tier),map=new Map(pixels.map(p=>[`${p.x},${p.y}`,p.color]));
  assert.equal(map.get('13,0'),2);assert.equal(map.get('17,0'),2);assert.equal(map.has('15,0'),false);assert.equal(map.get('15,12'),4);
  assert.equal(map.get('12,26'),5);assert.equal(map.get('18,26'),5);assert.ok(pixels.every(p=>p.x>=-1&&p.x<=31&&p.y>=0&&p.y<=30));
  // The muzzle sits one pixel ahead of the two nose tips on the aiming axis.
  assert.equal(SHIP_MUZZLE,SHIP_ANCHOR.y+1);
 }
});
test('banking leaves the nose/core anchored and engines stay behind the hull',()=>{
 const nose=pose=>shipPixels(4,pose,1).filter(p=>p.y<8);
 assert.deepEqual(nose('idle'),nose('bank-left'));assert.deepEqual(nose('idle'),nose('bank-right'));
 assert.notDeepEqual(shipPixels(1,'bank-left'),shipPixels(1,'bank-right'));
 assert.equal(shipPixels(1,'idle').filter(p=>p.y>=26).length,2);assert.equal(shipPixels(1,'thrust',1).filter(p=>p.y>=26).length,10);
});
