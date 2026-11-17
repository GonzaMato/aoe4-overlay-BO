import test from 'node:test';
import assert from 'node:assert/strict';
import { CompletionFeedback } from '../src/lib/completion.ts';
test('completion celebrates once and hides after a short interval',()=>{
 const c=new CompletionFeedback();assert.equal(c.tick(0),false);
 assert.equal(c.begin(100),true);assert.equal(c.begin(200),false);
 assert.equal(c.tick(2299),false);assert.equal(c.tick(2300),true);
 assert.equal(c.tick(9999),false);assert.equal(c.begin(10000),false);
});
test('showing the overlay explicitly cancels a pending hide without replaying celebration',()=>{
 const c=new CompletionFeedback();assert.equal(c.begin(100),true);c.reveal();
 assert.equal(c.tick(5000),false);assert.equal(c.begin(5001),false);
});
test('a new practice or build cancels old feedback and permits a new completion',()=>{
 const c=new CompletionFeedback();c.begin(100);c.reset();
 assert.equal(c.tick(5000),false);assert.equal(c.begin(6000),true);
 assert.equal(c.tick(8199),false);assert.equal(c.tick(8200),true);
});
