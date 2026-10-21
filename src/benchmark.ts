import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorld, stepWorld } from './engine';

export interface BenchmarkOptions {
  seeds?: number[];
  ticks?: number;
  packetLossRates?: number[];
  linkLatencyMs?: number;
  droneCount?: number;
  survivorCount?: number;
}
export interface BenchmarkRow {
  seed: number;
  packetLossRate: number;
  ticks: number;
  meanConnectedPercent: number;
  finalConnectedPercent: number;
  meanPathLatencyMs: number;
  finalActiveDrones: number;
}

/** Runs repeatable batches; this is a comparative simulator, not field validation. */
export function runBenchmark(options: BenchmarkOptions = {}): BenchmarkRow[] {
  const seeds = (options.seeds ?? [17, 31, 47, 73, 101]).slice(0, 100);
  const ticks = Math.max(1, Math.min(5000, Math.floor(options.ticks ?? 100)));
  const lossRates = (options.packetLossRates ?? [0, 0.05, 0.15, 0.3, 0.6])
    .map(rate => Math.max(0, Math.min(0.95, rate)));
  const rows: BenchmarkRow[] = [];
  for (const packetLossRate of lossRates) {
    for (const seed of seeds) {
      let world = createWorld({ seed, packetLossRate, linkLatencyMs: options.linkLatencyMs ?? 30,
        droneCount: options.droneCount, survivorCount: options.survivorCount });
      let connectedPctSum = world.metrics.survivorCoverage;
      let latencySum = world.metrics.connectedSurvivors ? world.metrics.meanPathLatencyMs : 0;
      let latencySamples = world.metrics.connectedSurvivors ? 1 : 0;
      for (let tick = 0; tick < ticks; tick++) {
        world = stepWorld(world);
        connectedPctSum += world.metrics.survivorCoverage;
        if (world.metrics.connectedSurvivors) {
          latencySum += world.metrics.meanPathLatencyMs;
          latencySamples++;
        }
      }
      rows.push({
        seed, packetLossRate, ticks,
        meanConnectedPercent: Math.round(connectedPctSum / (ticks + 1) * 100) / 100,
        finalConnectedPercent: world.metrics.survivorCoverage,
        meanPathLatencyMs: latencySamples ? Math.round(latencySum / latencySamples * 100) / 100 : 0,
        finalActiveDrones: world.metrics.activeDrones
      });
    }
  }
  return rows;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(runBenchmark(), null, 2));
}
