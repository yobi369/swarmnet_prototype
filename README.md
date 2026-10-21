# SwarmNet — Disaster Response Simulation Lab

SwarmNet is an open, browser-based research prototype for exploring how autonomous drone teams could support emergency communications and survivor discovery when conventional infrastructure is disrupted.

> **Safety boundary:** SwarmNet is a simulation and planning aid, not a certified rescue system, emergency dispatch service, radio propagation model, or flight controller. Do not use its output as operational guidance without independent validation.

## What works in this repository

- Seeded scenario generation for repeatable initial conditions.
- Role-based simulated agents (command, relay, sensor, logistics).
- Geometric drone-to-drone links and survivor-to-drone connectivity.
- Hazard zones, battery depletion, health degradation, and inactive nodes.
- Explicit metrics: survivor connectivity, emergency survivors connected, active nodes, mean battery, mesh links, and sampled area coverage.
- Export of a versioned JSON run record.
- Isolated simulation engine with automated tests.
- Responsive browser UI and a CI workflow.

## Quick start

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run check
npm run dev
```

Open the local URL printed by Vite. Use the scenario seed to reproduce a setup, run/pause the simulation, change speed, and export the current run as JSON.

## Project layout

- `src/engine.ts` — deterministic world creation, simulation stepping, connectivity, metrics, and export.
- `src/engine.test.ts` — unit tests for reproducibility, snapshot safety, topology, metrics, and export.
- `src/App.tsx` — interactive visualization and controls.
- `docs/VALIDATION_ROADMAP.md` — limitations and path to credible field validation.

## Metric definitions

- **Survivor coverage:** percentage of simulated survivors within at least one active drone's nominal communication radius.
- **Mesh links:** unique active drone pairs within the smaller of their nominal ranges.
- **Sampled area coverage:** fraction of cells in a 12×12 grid whose centers are within an active drone's nominal range. This is an approximation, not a radio-coverage map.
- **Messages delivered:** illustrative count based on connected survivors (emergency survivors count as three). This is not packet-level networking.

These metrics are geometric proxies. Terrain, obstruction, interference, latency, packet loss, realistic energy curves, wind, vehicle dynamics, no-fly zones, and flight safety constraints are not modeled yet.

## Research integrity

A run is not evidence of field performance. Record the seed, configuration, software version, and scenario assumptions when comparing algorithms. Compare against simple baselines, report failures as well as successes, and do not describe simulation-only behavior as tested autonomous flight.

## Roadmap

1. Add scenario import and richer configuration validation.
2. Add algorithm interfaces and baseline comparisons (static relay, greedy nearest-survivor, and coverage-aware placement).
3. Model packet delivery, latency, loss, partitions, and reconnection explicitly.
4. Add obstacle/terrain layers and realistic energy models.
5. Integrate a network emulator or robotics simulator and publish reproducible benchmark scenarios.
6. Conduct staged hardware-in-the-loop testing, followed by controlled field trials with safety officers and required regulatory approvals.

## License

MIT. See [LICENSE](LICENSE).

## Network semantics

The incident base station is a fixed simulated gateway. A drone is a gateway node only when its radio range overlaps the base station's configured range. Drone-to-drone links form an undirected graph; breadth-first reachability from gateway drones determines which drones can relay traffic to the base. The dashboard reports local radio coverage separately from end-to-end survivor connectivity, so a survivor near an isolated drone is not incorrectly counted as connected. This remains an idealized geometric radio model: packet delivery, interference, latency, terrain obstruction, and asymmetric links are not simulated yet.


## Network reliability model (schema v3)

The simulator can apply a configurable deterministic packet-loss probability to each drone-to-drone link and each drone-to-base gateway link at every simulation tick. The same seed, tick, and link pair produce the same packet-delivery outcome, which keeps experiments reproducible. Connected survivor path latency is an estimate based on hop count multiplied by the configured per-hop latency; it is not a packet-level timing measurement. The dashboard exposes packet-loss and latency assumptions, available links, gateway availability, and mean estimated survivor path latency. This is a simplified link model, not a validated propagation model or network emulator.


## Network reliability model (schema v3)

The simulator can apply a configurable deterministic packet-loss probability to each drone-to-drone link and each drone-to-base gateway link at every simulation tick. The same seed, tick, and link pair produce the same availability decision, which keeps experiments reproducible. Connected survivor path latency is an estimate based on hop count multiplied by the configured per-hop latency; it is not a packet-level timing measurement. The dashboard exposes packet-loss and latency assumptions, available links, gateway availability, and mean estimated survivor path latency. This is a simplified link model, not a validated propagation model or network emulator.


## Batch experiments

Run `npm run benchmark` to compare the same seeded scenarios across packet-loss settings. The default batch uses five seeds, five loss rates, and 100 simulation ticks per run; output is JSON with mean and final survivor connectivity, estimated mean path latency, and final active-drone count. For a smaller local experiment, import `runBenchmark` from `src/benchmark.ts` and pass custom seeds, ticks, loss rates, drone count, survivor count, and per-hop latency. Results are simulator comparisons only; use calibrated traces and field measurements before drawing operational conclusions.
