export type DroneRole = 'command' | 'relay' | 'sensor' | 'logistics';
export type HazardKind = 'earthquake' | 'flood' | 'fire';
export interface Point { x: number; y: number }
export interface Drone extends Point {
  id: number; role: DroneRole; battery: number; health: number;
  target: Point; range: number; active: boolean;
}
export interface Survivor extends Point {
  id: number; emergency: boolean; connected: boolean; localCoverage: boolean; signal: number;
}
export interface Hazard extends Point { id: number; kind: HazardKind; radius: number }
export interface Link { from: number; to: number; strength: number }
export interface Scenario {
  width?: number; height?: number; droneCount?: number; survivorCount?: number;
  hazardCount?: number; seed?: number;
}
export interface Metrics {
  tick: number; activeDrones: number; survivorCoverage: number;
  localCoverageSurvivors: number; connectedSurvivors: number; emergencyConnected: number;
  networkLinks: number; gatewayDrones: number; meanBattery: number;
  estimatedAreaCoverage: number;
}
export interface World {
  width: number; height: number; tick: number; seed: number;
  baseStation: Point; baseRange: number;
  drones: Drone[]; survivors: Survivor[]; hazards: Hazard[]; links: Link[];
  metrics: Metrics;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Small deterministic PRNG. The same seed and actions reproduce the same scenario.
function randomFor(seed: number) {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
function metricsFor(world: Omit<World, 'metrics'>): Metrics {
  const connected = world.survivors.filter(s => s.connected);
  const local = world.survivors.filter(s => s.localCoverage);
  const total = world.survivors.length;
  const samples = 12;
  let covered = 0;
  for (let gy = 0; gy < samples; gy++) for (let gx = 0; gx < samples; gx++) {
    const p = { x: (gx + 0.5) * world.width / samples, y: (gy + 0.5) * world.height / samples };
    if (world.drones.some(d => d.active && distance(d, p) <= d.range)) covered++;
  }
  const active = world.drones.filter(d => d.active);
  return {
    tick: world.tick, activeDrones: active.length,
    survivorCoverage: total ? Math.round(100 * connected.length / total) : 100,
    localCoverageSurvivors: local.length,
    connectedSurvivors: connected.length,
    emergencyConnected: connected.filter(s => s.emergency).length,
    networkLinks: world.links.length,
    gatewayDrones: active.filter(d => distance(d, world.baseStation) <= Math.min(d.range, world.baseRange)).length,
    meanBattery: active.length ? Math.round(active.reduce((n, d) => n + d.battery, 0) / active.length) : 0,
    estimatedAreaCoverage: Math.round(100 * covered / (samples * samples))
  };
}

/**
 * Rebuilds radio links and end-to-end reachability.
 * A survivor is connected only when a drone can reach it AND that drone has a
 * graph path to a drone within range of the fixed incident base station.
 * localCoverage is intentionally separate from end-to-end connectivity.
 */
export function recomputeConnectivity(world: Omit<World, 'metrics'>) {
  world.links = [];
  const active = world.drones.filter(d => d.active);
  const adjacency = new Map<number, Set<number>>(active.map(d => [d.id, new Set<number>()]));
  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      const d = distance(a, b);
      const limit = Math.min(a.range, b.range);
      if (d <= limit) {
        world.links.push({ from: a.id, to: b.id, strength: clamp(1 - d / limit, 0, 1) });
        adjacency.get(a.id)?.add(b.id);
        adjacency.get(b.id)?.add(a.id);
      }
    }
  }
  const reachable = new Set<number>();
  const queue = active.filter(d => distance(d, world.baseStation) <= Math.min(d.range, world.baseRange)).map(d => d.id);
  for (const id of queue) reachable.add(id);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const next of adjacency.get(queue[cursor]) ?? []) {
      if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
    }
  }
  for (const s of world.survivors) {
    let bestLocal = 0, bestEndToEnd = 0;
    for (const d of active) {
      const dist = distance(d, s);
      if (dist <= d.range) {
        const signal = clamp(1 - dist / d.range, 0, 1);
        bestLocal = Math.max(bestLocal, signal);
        if (reachable.has(d.id)) bestEndToEnd = Math.max(bestEndToEnd, signal);
      }
    }
    s.localCoverage = bestLocal > 0;
    s.connected = bestEndToEnd > 0;
    s.signal = Math.round(bestLocal * 100);
  }
}
export function createWorld(options: Scenario = {}): World {
  const width = options.width ?? 800, height = options.height ?? 600;
  const droneCount = clamp(Math.floor(options.droneCount ?? 15), 1, 100);
  const survivorCount = clamp(Math.floor(options.survivorCount ?? 25), 0, 1000);
  const hazardCount = clamp(Math.floor(options.hazardCount ?? 3), 0, 30);
  const seed = options.seed ?? 20261021, random = randomFor(seed);
  const roles: DroneRole[] = ['command', 'command', 'relay', 'relay', 'relay', 'relay', 'sensor', 'sensor', 'sensor', 'sensor', 'logistics'];
  const drones: Drone[] = Array.from({ length: droneCount }, (_, id) => {
    const x = 40 + random() * (width - 80), y = 40 + random() * (height - 80);
    const role = roles[id] ?? 'relay';
    return { id, x, y, target: { x, y }, role, battery: 100, health: 100,
      range: role === 'command' ? 130 : role === 'relay' ? 105 : 85, active: true };
  });
  const kinds: HazardKind[] = ['earthquake', 'flood', 'fire'];
  const hazards: Hazard[] = Array.from({ length: hazardCount }, (_, id) => ({
    id, x: width * (0.2 + random() * 0.6), y: height * (0.2 + random() * 0.6),
    radius: 35 + random() * 45, kind: kinds[id % kinds.length]
  }));
  const survivors: Survivor[] = Array.from({ length: survivorCount }, (_, id) => ({
    id, x: random() * width, y: random() * height, emergency: random() < 0.3,
    connected: false, localCoverage: false, signal: 0
  }));
  const draft = { width, height, tick: 0, seed, baseStation: { x: width / 2, y: height - 28 },
    baseRange: 150, drones, survivors, hazards, links: [] as Link[] };
  recomputeConnectivity(draft);
  return { ...draft, metrics: metricsFor(draft) };
}
export function stepWorld(input: World): World {
  // Copy all mutable state: callers can retain prior snapshots safely.
  const world = {
    width: input.width, height: input.height, tick: input.tick + 1, seed: input.seed,
    baseStation: { ...input.baseStation }, baseRange: input.baseRange,
    drones: input.drones.map(d => ({ ...d, target: { ...d.target } })),
    survivors: input.survivors.map(s => ({ ...s })),
    hazards: input.hazards.map(h => ({ ...h })), links: [] as Link[]
  };
  const active = world.drones.filter(d => d.active);
  for (const d of active) {
    if (d.role === 'sensor' && world.hazards.length) {
      const h = world.hazards.reduce((best, candidate) =>
        distance(d, candidate) < distance(d, best) ? candidate : best);
      const angle = (h.id * 2.399963229728653 + d.id) % (Math.PI * 2);
      d.target = { x: clamp(h.x + Math.cos(angle) * (h.radius + 20), 10, world.width - 10),
        y: clamp(h.y + Math.sin(angle) * (h.radius + 20), 10, world.height - 10) };
    } else if (d.role === 'relay' || d.role === 'command') {
      // Prefer local-only survivors first: they have radio coverage but no route
      // to the incident base, making them useful mesh-extension targets.
      const uncovered = world.survivors.filter(s => !s.connected)
        .sort((a, b) => distance(d, a) - distance(d, b));
      if (uncovered[0]) d.target = { x: uncovered[0].x, y: uncovered[0].y };
    }
    const dx = d.target.x - d.x, dy = d.target.y - d.y, dist = Math.hypot(dx, dy);
    const speed = d.role === 'command' ? 1.7 : d.role === 'sensor' ? 1.35 : 1.5;
    if (dist > speed) { d.x += dx / dist * speed; d.y += dy / dist * speed; }
    else { d.x = d.target.x; d.y = d.target.y; }
    d.x = clamp(d.x, 0, world.width); d.y = clamp(d.y, 0, world.height);
    d.battery = Math.max(0, d.battery - (d.role === 'sensor' ? 0.035 : 0.025));
    if (d.battery <= 0) d.active = false;
    if (world.hazards.some(h => distance(d, h) < h.radius)) d.health = Math.max(0, d.health - 0.04);
    if (d.health <= 0) d.active = false;
  }
  recomputeConnectivity(world);
  return { ...world, metrics: metricsFor(world) };
}
export function exportScenario(world: World) {
  return JSON.stringify({ schemaVersion: 2, seed: world.seed, width: world.width, height: world.height,
    tick: world.tick, baseStation: world.baseStation, baseRange: world.baseRange,
    drones: world.drones, survivors: world.survivors, hazards: world.hazards,
    links: world.links, metrics: world.metrics }, null, 2);
}