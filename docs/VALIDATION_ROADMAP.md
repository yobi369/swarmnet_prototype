# Validation roadmap: simulation to field evidence

## Current maturity

SwarmNet is a deterministic geometric simulation prototype. It is useful for software experimentation and teaching, but it is not a validated digital twin and must not control real aircraft or make live rescue decisions.

## Current model assumptions

- A communication link exists when Euclidean distance is within the minimum nominal range of two active nodes.
- A survivor is connected when at least one active drone is within its nominal range.
- Battery is a linear abstract percentage decrement per simulation tick.
- Hazards apply a simple health penalty to drones inside their radius.
- The area-coverage score samples a 12×12 grid.
- The message metric is a dashboard proxy, not a packet simulation.

## Required next validations

### 1. Algorithmic correctness
- Property-based tests for coordinate bounds, unique links, and metric invariants.
- Compare link and coverage results against independently computed fixtures.
- Test zero survivors, one drone, all nodes inactive, dense swarms, and extreme configuration values.

### 2. Communications realism
- Model packet generation, delivery, latency, loss, retries, bandwidth, and network partitions.
- Calibrate range and loss against a selected radio/network simulator and measured hardware.
- Test routing under node failure and intermittent links.

### 3. Physical realism
- Introduce terrain, line-of-sight, obstacles, wind, vehicle dynamics, payload, battery discharge curves, and safe landing/return policies.
- Calibrate energy estimates from measured vehicle logs; never treat current linear battery values as flight-time predictions.

### 4. Benchmark protocol
- Publish fixed scenario sets and random seeds.
- Compare the proposed coordination policy with static placement and greedy baselines.
- Report median and tail discovery time, connectivity availability, packet delivery ratio, energy per successful connection, and confidence intervals across many seeds.
- Include negative results and failure scenarios.

### 5. Safe deployment pathway
1. Offline simulation and code review.
2. Network-emulator testing with no aircraft connected.
3. Hardware-in-the-loop tests in a controlled environment.
4. Supervised field experiments in an approved area, with geofencing, emergency stop, lost-link behavior, trained operators, and local aviation/radio permissions.
5. Independent review before any operational use.

## Release gate

No claim of real-world rescue readiness should be made until independent tests substantiate it. Keep human operators in control of deployment decisions and never use this prototype as the sole basis for emergency response.