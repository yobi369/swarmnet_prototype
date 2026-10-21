import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, exportScenario, recomputeConnectivity, stepWorld, type World } from './engine';
import { runBenchmark } from './benchmark';

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
test('end-to-end connected survivor has a base-reachable drone path', () => {
  const world = createWorld({ seed: 88, survivorCount: 50 });
  const reachable = new Set<number>();
  const queue = world.drones.filter(d => d.active && Math.hypot(d.x-world.baseStation.x,d.y-world.baseStation.y) <= Math.min(d.range,world.baseRange)).map(d=>d.id);
  for (const id of queue) reachable.add(id);
  const adjacency = new Map<number, number[]>();
  for (const link of world.links) {
    adjacency.set(link.from, [...(adjacency.get(link.from) ?? []), link.to]);
    adjacency.set(link.to, [...(adjacency.get(link.to) ?? []), link.from]);
  }
  for (let i=0;i<queue.length;i++) for (const next of adjacency.get(queue[i]) ?? []) if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
  for (const survivor of world.survivors.filter(s=>s.connected)) {
    assert.ok(world.drones.some(d=>d.active && reachable.has(d.id) && Math.hypot(d.x-survivor.x,d.y-survivor.y)<=d.range));
  }
});
test('local radio coverage is distinguished from end-to-end connectivity', () => {
  const world = createWorld({ seed: 19, droneCount: 1, survivorCount: 0 });
  const draft = { ...world, drones: [{ ...world.drones[0], x: 30, y: 30, range: 20 }],
    survivors: [{ id: 1, x: 35, y: 30, emergency: true, connected: false, localCoverage: false, signal: 0, pathLatencyMs: null }], links: [] };
  recomputeConnectivity(draft as Omit<World, 'metrics'>);
  assert.equal(draft.survivors[0].localCoverage, true);
  assert.equal(draft.survivors[0].connected, false);
});
test('metrics distinguish local radio reach from base-connected survivors', () => {
  const world = createWorld({ seed: 88, survivorCount: 50 });
  assert.ok(world.metrics.localCoverageSurvivors >= world.metrics.connectedSurvivors);
  assert.equal(world.metrics.connectedSurvivors, world.survivors.filter(s => s.connected).length);
  assert.equal(world.metrics.localCoverageSurvivors, world.survivors.filter(s => s.localCoverage).length);
});
test('export is valid, versioned JSON with gateway topology', () => {
  const world = createWorld({ seed: 5 });
  const data = JSON.parse(exportScenario(world));
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.seed, 5);
  assert.deepEqual(data.baseStation, world.baseStation);
});

test('packet loss deterministically removes usable mesh links', () => {
  const ideal = createWorld({ seed: 31, packetLossRate: 0 });
  const lossy = createWorld({ seed: 31, packetLossRate: 0.9 });
  assert.ok(ideal.links.every(link => link.packetDelivered));
  assert.ok(lossy.links.every(link => link.latencyMs === 30));
  assert.ok(lossy.metrics.successfulTransmissions <= ideal.metrics.successfulTransmissions);
  assert.ok(lossy.metrics.connectedSurvivors <= ideal.metrics.connectedSurvivors);
  assert.deepEqual(lossy, createWorld({ seed: 31, packetLossRate: 0.9 }));
});
test('latency setting is bounded and reflected in connected path estimates', () => {
  const world = createWorld({ seed: 31, packetLossRate: 0, linkLatencyMs: 80 });
  assert.ok(world.links.every(link => link.latencyMs === 80));
  assert.ok(world.survivors.filter(s => s.connected).every(s => s.pathLatencyMs !== null && s.pathLatencyMs >= 80));
  if (world.survivors.some(s => s.connected)) assert.ok(world.metrics.meanPathLatencyMs >= 80);
  else assert.equal(world.metrics.meanPathLatencyMs, 0);
});

test('batch benchmark is reproducible and reports bounded coverage', () => {
  const options = { seeds: [9, 10], ticks: 3, packetLossRates: [0, 0.4], droneCount: 6, survivorCount: 8 };
  const first = runBenchmark(options);
  assert.deepEqual(first, runBenchmark(options));
  assert.equal(first.length, 4);
  assert.ok(first.every(row => row.meanConnectedPercent >= 0 && row.meanConnectedPercent <= 100));
  assert.ok(first.every(row => row.finalConnectedPercent >= 0 && row.finalConnectedPercent <= 100));
});
