import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectionRect, physicalRegion } from '../src/lib/region.ts';

test('drag works in either direction and is clamped to the chosen screen', () => {
  assert.deepEqual(selectionRect({x:200,y:100},{x:-10,y:40},800,600), {x:0,y:40,width:200,height:60});
});
test('physical region accounts for DPI and negative monitor origins', () => {
  assert.deepEqual(physicalRegion({x:100,y:50,width:120,height:30}, {x:-1920,y:0,width:1920,height:1080},1280,720), {x:-1770,y:75,width:180,height:45});
});
test('empty and oversized selections cannot be saved', () => {
  const screen={x:0,y:0,width:1920,height:1080};
  assert.throws(()=>physicalRegion({x:0,y:0,width:0,height:0},screen,1920,1080));
  assert.throws(()=>physicalRegion({x:0,y:0,width:1200,height:100},screen,1920,1080));
});
test('inactive counter uses its own single-row selection', () => {
  const screen={x:0,y:0,width:1920,height:1080};
  const region={x:190,y:900,width:50,height:20};
  assert.deepEqual(physicalRegion(region,screen,1920,1080,'idle'),region);
  assert.throws(()=>physicalRegion(region,screen,1920,1080,'workers'));
});
