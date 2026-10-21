import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, BatteryCharging, Download, Pause, Play, Radio, RotateCcw, Users, Wifi } from 'lucide-react';
import { createWorld, exportScenario, stepWorld, type World } from './engine';

const initial = () => createWorld({ seed: 20261021 });
export default function App() {
  const [world, setWorld] = useState<World>(initial);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seed, setSeed] = useState('20261021');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  const reset = useCallback(() => {
    setRunning(false);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const next = createWorld({ seed: Number(seed) || 1 });
    worldRef.current = next;
    setWorld(next);
  }, [seed]);

  useEffect(() => {
    if (!running) return;
    let last = 0, accumulator = 0;
    const loop = (now: number) => {
      if (!last) last = now;
      accumulator += now - last; last = now;
      const interval = 100 / speed;
      let next = worldRef.current;
      while (accumulator >= interval) { next = stepWorld(next); accumulator -= interval; }
      worldRef.current = next; setWorld(next);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [running, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = world.width, h = world.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a1422'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(100,145,180,.12)'; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    for (const hazard of world.hazards) {
      ctx.beginPath(); ctx.arc(hazard.x,hazard.y,hazard.radius,0,Math.PI*2);
      ctx.fillStyle = hazard.kind === 'fire' ? 'rgba(255,104,73,.14)' : hazard.kind === 'flood' ? 'rgba(73,155,255,.16)' : 'rgba(240,183,84,.13)';
      ctx.fill(); ctx.strokeStyle = hazard.kind === 'flood' ? '#4d9dff' : hazard.kind === 'fire' ? '#ff7559' : '#e6b45e'; ctx.stroke();
      ctx.fillStyle = '#d9e5f2'; ctx.font = '11px system-ui'; ctx.fillText(hazard.kind.toUpperCase(), hazard.x - 24, hazard.y - hazard.radius - 7);
    }
    for (const link of world.links) {
      const a = world.drones.find(d => d.id === link.from), b = world.drones.find(d => d.id === link.to);
      if (!a || !b) continue;
      ctx.strokeStyle = `rgba(62,210,190,${.12 + link.strength * .45})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    for (const s of world.survivors) {
      ctx.beginPath(); ctx.arc(s.x,s.y,s.emergency ? 4.5 : 3,0,Math.PI*2);
      ctx.fillStyle = s.connected ? (s.emergency ? '#ffb45c' : '#55d6a5') : (s.emergency ? '#ff5f70' : '#77859a'); ctx.fill();
    }
    for (const d of world.drones) {
      ctx.beginPath(); ctx.arc(d.x,d.y,d.range,0,Math.PI*2);
      ctx.strokeStyle = d.active ? 'rgba(84,145,255,.13)' : 'rgba(255,80,100,.12)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(d.x,d.y,d.role === 'command' ? 6 : 4.5,0,Math.PI*2);
      ctx.fillStyle = !d.active ? '#ff5268' : d.role === 'command' ? '#7ba7ff' : d.role === 'relay' ? '#49d4c0' : d.role === 'sensor' ? '#ffc36b' : '#c39bff'; ctx.fill();
      ctx.fillStyle = '#eaf1fa'; ctx.font = '10px system-ui'; ctx.fillText(String(d.id),d.x+7,d.y-5);
    }
  }, [world]);

  const download = () => {
    const blob = new Blob([exportScenario(world)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `swarmnet-run-seed-${world.seed}-tick-${world.tick}.json`;
    anchor.click(); URL.revokeObjectURL(url);
  };
  const m = world.metrics;
  const coverageLabel = useMemo(() => m.survivorCoverage >= 80 ? 'Strong' : m.survivorCoverage >= 45 ? 'Partial' : 'Low', [m.survivorCoverage]);

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">S</div><div><div className="eyebrow">DISASTER RESPONSE LAB</div><h1>SwarmNet <span>Simulation</span></h1></div><div className="top-status"><i /> SIMULATION ONLY</div></header>
    <section className="intro"><div><p className="eyebrow">RESILIENT AUTONOMOUS SYSTEMS</p><h2>When infrastructure fails,<br/><em>the network must adapt.</em></h2><p className="lede">Explore drone coordination, survivor connectivity, and mesh-network resilience in repeatable disaster scenarios.</p></div><div className="intro-note"><AlertTriangle size={18}/><span>Research prototype. Not a live emergency service or flight-control system.</span></div></section>
    <section className="toolbar"><div className="toolbar-group"><label htmlFor="seed">Scenario seed</label><input id="seed" value={seed} onChange={e=>setSeed(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" maxLength={12}/><button className="btn secondary" onClick={reset}><RotateCcw size={15}/> Reset scenario</button></div><div className="toolbar-group"><label htmlFor="speed">Simulation speed</label><select id="speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select><button className="btn primary" onClick={()=>setRunning(v=>!v)}>{running ? <Pause size={15}/> : <Play size={15}/>} {running ? 'Pause' : 'Run simulation'}</button><button className="btn secondary" onClick={download}><Download size={15}/> Export run</button></div></section>
    <section className="metrics-grid">
      <Metric icon={<Users size={17}/>} label="Survivors connected" value={`${m.connectedSurvivors}/${world.survivors.length}`} detail={`${m.survivorCoverage}% of simulated survivors`} />
      <Metric icon={<Radio size={17}/>} label="Mesh links" value={String(m.networkLinks)} detail="Unique active drone pairs" />
      <Metric icon={<BatteryCharging size={17}/>} label="Mean battery" value={`${m.meanBattery}%`} detail={`${m.activeDrones} active drones`} />
      <Metric icon={<Activity size={17}/>} label="Sampled area coverage" value={`${m.estimatedAreaCoverage}%`} detail="12 × 12 grid estimate" />
    </section>
    <section className="workspace"><div className="map-panel"><div className="panel-heading"><div><p className="eyebrow">LIVE WORLD MODEL</p><h3>Disaster field</h3></div><div className="run-counter">TICK <strong>{m.tick.toString().padStart(5,'0')}</strong></div></div><div className="canvas-wrap"><canvas ref={canvasRef} width={world.width} height={world.height} aria-label="Simulated disaster map with hazards, drone coverage, network links, and survivor positions"/></div><div className="legend"><span><i className="dot blue"/>Command</span><span><i className="dot teal"/>Relay</span><span><i className="dot amber"/>Sensor</span><span><i className="dot green"/>Connected survivor</span><span><i className="dot red"/>Disconnected emergency</span></div></div>
      <aside className="side-panel"><div className="panel-heading"><div><p className="eyebrow">MISSION TELEMETRY</p><h3>Operational picture</h3></div><Wifi size={19}/></div><div className="status-row"><span>Coverage assessment</span><strong className={coverageLabel.toLowerCase()}>{coverageLabel}</strong></div><div className="meter"><span style={{width:`${m.survivorCoverage}%`}}/></div><div className="status-row"><span>Emergency survivors linked</span><strong>{m.emergencyConnected}</strong></div><div className="status-row"><span>Hazard zones</span><strong>{world.hazards.length}</strong></div><div className="status-row"><span>Inactive drones</span><strong>{world.drones.length-m.activeDrones}</strong></div><div className="status-row"><span>Illustrative delivered messages</span><strong>{m.messagesDelivered}</strong></div><div className="side-callout"><Activity size={17}/><div><strong>How to use this run</strong><p>Reset with the same seed to reproduce initial placements. Export the JSON to compare runs or share an experiment record.</p></div></div><p className="microcopy">Coverage is geometric and illustrative. Radio interference, terrain, weather, real battery curves, and flight dynamics are not yet modeled.</p></aside></section>
    <section className="bottom-grid"><article className="info-card"><p className="eyebrow">01 / METHOD</p><h3>Deterministic experiments</h3><p>Scenario generation is seeded, simulation steps are isolated from the interface, and run snapshots can be exported for reproducible comparisons.</p></article><article className="info-card"><p className="eyebrow">02 / RESILIENCE</p><h3>Observe network behavior</h3><p>See how drone positions affect pairwise links, survivor access, sampled geographic coverage, and the effect of nodes becoming inactive.</p></article><article className="info-card"><p className="eyebrow">03 / NEXT FRONTIER</p><h3>Bridge simulation to reality</h3><p>The engine is intentionally separated from the UI so future adapters can connect to offline replay data, network emulators, or approved hardware test rigs.</p></article></section>
    <footer><span>SWARMNET · OPEN RESEARCH FOUNDATION</span><span>Not validated for operational rescue or autonomous flight.</span></footer>
  </main>;
}
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="metric-card"><div className="metric-icon">{icon}</div><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}