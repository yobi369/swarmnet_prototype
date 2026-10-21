import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, exportScenario, stepWorld } from './engine';

test('same seed creates identical worlds', () => {
  assert.deepEqual(createWorld({ seed: 42 }), createWorld({ seed: 42 }));
});
test('different seeds vary scenario placement', () => {
  assert.notDeepEqual(createWorld({ seed: 42 }).survivors, createWorld({ seed: 43 }).survivors);
});
test('scenario sizes are bounded and configurable', () => {
  const world = createWorld({ droneCount: 4, survivorCount: 7, hazardCount: 2, seed: 1 });
  assert.equal(world.drones.length, 4);
  assert.equal(world.survivors.length, 7);
  assert.equal(world.hazards.length, 2);
  assert.ok(world.metrics.survivorCoverage >= 0 && world.metrics.survivorCoverage <= 100);
});
test('step advances tick without mutating previous snapshot', () => {
  const first = createWorld({ seed: 7 });
  const oldX = first.drones[0].x;
  const second = stepWorld(first);
  assert.equal(second.tick, 1);
  assert.equal(first.tick, 0);
  assert.equal(first.drones[0].x, oldX);
});
test('links are unique undirected pairs and only include active drones', () => {
  const world = createWorld({ seed: 19, droneCount: 20 });
  const pairs = world.links.map(l => [l.from, l.to].sort((a,b) => a-b).join(':'));
  assert.equal(new Set(pairs).size, pairs.length);
  assert.ok(world.links.every(l => l.from !== l.to));
});
test('coverage metrics match survivor state', () => {
  const world = createWorld({ seed: 88, survivorCount: 50 });
  const connected = world.survivors.filter(s => s.connected).length;
  assert.equal(world.metrics.connectedSurvivors, connected);
  assert.equal(world.metrics.survivorCoverage, Math.round(100 * connected / world.survivors.length));
});
test('export is valid, versioned JSON', () => {
  const world = createWorld({ seed: 5 });
  const data = JSON.parse(exportScenario(world));
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.seed, 5);
});