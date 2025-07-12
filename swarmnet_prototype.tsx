import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, Wifi, AlertTriangle, Users, Activity, Signal, Battery, MapPin, Radio } from 'lucide-react';

const SwarmNetPrototype = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [drones, setDrones] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [survivors, setSurvivors] = useState([]);
  const [networkConnections, setNetworkConnections] = useState([]);
  const [time, setTime] = useState(0);
  const [stats, setStats] = useState({
    activeDrones: 0,
    networkCoverage: 0,
    survivorsConnected: 0,
    dataProcessed: 0,
    emergencyCalls: 0
  });

  // Drone class
  class Drone {
    constructor(id, x, y, type = 'relay') {
      this.id = id;
      this.x = x;
      this.y = y;
      this.targetX = x;
      this.targetY = y;
      this.type = type; // relay, sensor, logistics, command
      this.battery = 100;
      this.status = 'active';
      this.range = type === 'command' ? 120 : type === 'relay' ? 100 : 80;
      this.speed = 1;
      this.connections = [];
      this.dataBuffer = 0;
      this.mission = null;
      this.health = 100;
    }

    update(disasters, survivors, allDrones) {
      // Move towards target
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 2) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }

      // Battery consumption
      this.battery -= 0.02;
      if (this.battery < 20) {
        this.findChargingStation();
      }

      // AI decision making
      this.makeDecisions(disasters, survivors, allDrones);
      
      // Process data
      this.dataBuffer += Math.random() * 10;
      
      // Health degradation in harsh conditions
      const nearDisaster = disasters.some(d => 
        Math.sqrt((this.x - d.x) ** 2 + (this.y - d.y) ** 2) < d.severity
      );
      if (nearDisaster) {
        this.health -= 0.1;
      }
    }

    makeDecisions(disasters, survivors, allDrones) {
      if (this.type === 'command') {
        this.coordinateSwarm(allDrones, disasters, survivors);
      } else if (this.type === 'sensor') {
        this.sensorMission(disasters, survivors);
      } else if (this.type === 'relay') {
        this.optimizePosition(allDrones, survivors);
      }
    }

    coordinateSwarm(allDrones, disasters, survivors) {
      // Command drones coordinate the entire swarm
      const uncoveredSurvivors = survivors.filter(s => !s.connected);
      if (uncoveredSurvivors.length > 0) {
        const nearestDrone = allDrones
          .filter(d => d.type === 'relay' && d.id !== this.id)
          .sort((a, b) => {
            const distA = Math.sqrt((a.x - uncoveredSurvivors[0].x) ** 2 + (a.y - uncoveredSurvivors[0].y) ** 2);
            const distB = Math.sqrt((b.x - uncoveredSurvivors[0].x) ** 2 + (b.y - uncoveredSurvivors[0].y) ** 2);
            return distA - distB;
          })[0];
        
        if (nearestDrone) {
          nearestDrone.targetX = uncoveredSurvivors[0].x;
          nearestDrone.targetY = uncoveredSurvivors[0].y;
        }
      }
    }

    sensorMission(disasters, survivors) {
      // Sensor drones patrol disaster areas
      const nearestDisaster = disasters.sort((a, b) => {
        const distA = Math.sqrt((this.x - a.x) ** 2 + (this.y - a.y) ** 2);
        const distB = Math.sqrt((this.x - b.x) ** 2 + (this.y - b.y) ** 2);
        return distA - distB;
      })[0];

      if (nearestDisaster) {
        const angle = Math.random() * Math.PI * 2;
        this.targetX = nearestDisaster.x + Math.cos(angle) * 60;
        this.targetY = nearestDisaster.y + Math.sin(angle) * 60;
      }
    }

    optimizePosition(allDrones, survivors) {
      // Relay drones optimize for network coverage
      const nearestSurvivor = survivors
        .filter(s => !s.connected)
        .sort((a, b) => {
          const distA = Math.sqrt((this.x - a.x) ** 2 + (this.y - a.y) ** 2);
          const distB = Math.sqrt((this.x - b.x) ** 2 + (this.y - b.y) ** 2);
          return distA - distB;
        })[0];

      if (nearestSurvivor) {
        this.targetX = nearestSurvivor.x;
        this.targetY = nearestSurvivor.y;
      }
    }

    findChargingStation() {
      // Move to edge for charging (simplified)
      this.targetX = Math.random() < 0.5 ? 50 : 750;
      this.targetY = Math.random() < 0.5 ? 50 : 550;
      if (Math.sqrt((this.x - this.targetX) ** 2 + (this.y - this.targetY) ** 2) < 30) {
        this.battery = Math.min(100, this.battery + 2);
      }
    }
  }

  // Initialize simulation
  const initializeSimulation = useCallback(() => {
    const newDrones = [];
    const newDisasters = [];
    const newSurvivors = [];

    // Create drone swarm
    for (let i = 0; i < 15; i++) {
      const type = i < 2 ? 'command' : i < 6 ? 'relay' : i < 10 ? 'sensor' : 'logistics';
      newDrones.push(new Drone(
        i,
        100 + Math.random() * 100,
        100 + Math.random() * 100,
        type
      ));
    }

    // Create disaster zones
    for (let i = 0; i < 3; i++) {
      newDisasters.push({
        id: i,
        x: 200 + Math.random() * 400,
        y: 200 + Math.random() * 200,
        severity: 60 + Math.random() * 40,
        type: ['earthquake', 'flood', 'fire'][i % 3]
      });
    }

    // Create survivors
    for (let i = 0; i < 25; i++) {
      newSurvivors.push({
        id: i,
        x: Math.random() * 800,
        y: Math.random() * 600,
        connected: false,
        emergency: Math.random() < 0.3,
        signalStrength: 0
      });
    }

    setDrones(newDrones);
    setDisasters(newDisasters);
    setSurvivors(newSurvivors);
    setTime(0);
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!isRunning) return;

    setTime(t => t + 1);
    
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => {
        const newDrone = { ...drone };
        newDrone.update(disasters, survivors, prevDrones);
        return newDrone;
      });
      return updatedDrones;
    });

    // Update network connections
    setNetworkConnections(prevConnections => {
      const newConnections = [];
      drones.forEach(drone1 => {
        drones.forEach(drone2 => {
          if (drone1.id !== drone2.id) {
            const distance = Math.sqrt(
              (drone1.x - drone2.x) ** 2 + (drone1.y - drone2.y) ** 2
            );
            if (distance < Math.min(drone1.range, drone2.range)) {
              newConnections.push({
                from: drone1,
                to: drone2,
                strength: Math.max(0, 1 - distance / 100)
              });
            }
          }
        });
      });
      return newConnections;
    });

    // Update survivors connectivity
    setSurvivors(prevSurvivors => {
      return prevSurvivors.map(survivor => {
        const nearestDrone = drones.find(drone => {
          const distance = Math.sqrt(
            (drone.x - survivor.x) ** 2 + (drone.y - survivor.y) ** 2
          );
          return distance < drone.range;
        });
        
        return {
          ...survivor,
          connected: !!nearestDrone,
          signalStrength: nearestDrone ? 
            Math.max(0, 100 - Math.sqrt(
              (nearestDrone.x - survivor.x) ** 2 + (nearestDrone.y - survivor.y) ** 2
            )) : 0
        };
      });
    });

    // Update stats
    setStats(prevStats => ({
      activeDrones: drones.filter(d => d.status === 'active').length,
      networkCoverage: Math.min(100, (networkConnections.length / 20) * 100),
      survivorsConnected: survivors.filter(s => s.connected).length,
      dataProcessed: prevStats.dataProcessed + drones.reduce((sum, d) => sum + d.dataBuffer, 0),
      emergencyCalls: survivors.filter(s => s.emergency && s.connected).length
    }));

    animationRef.current = requestAnimationFrame(animate);
  }, [isRunning, drones, disasters, survivors, networkConnections]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw disaster zones
    disasters.forEach(disaster => {
      ctx.fillStyle = disaster.type === 'fire' ? 'rgba(255, 100, 100, 0.3)' : 
                     disaster.type === 'flood' ? 'rgba(100, 150, 255, 0.3)' : 
                     'rgba(150, 75, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(disaster.x, disaster.y, disaster.severity, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(disaster.type.toUpperCase(), disaster.x - 20, disaster.y - disaster.severity - 10);
    });

    // Draw network connections
    networkConnections.forEach(connection => {
      ctx.strokeStyle = `rgba(0, 255, 255, ${connection.strength * 0.5})`;
      ctx.lineWidth = connection.strength * 3;
      ctx.beginPath();
      ctx.moveTo(connection.from.x, connection.from.y);
      ctx.lineTo(connection.to.x, connection.to.y);
      ctx.stroke();
    });

    // Draw drone coverage areas
    drones.forEach(drone => {
      if (drone.status === 'active') {
        ctx.strokeStyle = `rgba(0, 255, 0, 0.2)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, drone.range, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw survivors
    survivors.forEach(survivor => {
      ctx.fillStyle = survivor.connected ? 
        (survivor.emergency ? 'orange' : 'green') : 
        (survivor.emergency ? 'red' : 'gray');
      ctx.beginPath();
      ctx.arc(survivor.x, survivor.y, survivor.emergency ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Signal strength indicator
      if (survivor.connected) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(survivor.x, survivor.y, 8 + (survivor.signalStrength / 10), 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw drones
    drones.forEach(drone => {
      // Drone body
      const color = drone.type === 'command' ? 'blue' :
                   drone.type === 'relay' ? 'green' :
                   drone.type === 'sensor' ? 'orange' : 'purple';
      
      ctx.fillStyle = drone.health > 50 ? color : 'red';
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, drone.type === 'command' ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Battery indicator
      ctx.fillStyle = drone.battery > 50 ? 'green' : drone.battery > 20 ? 'yellow' : 'red';
      ctx.fillRect(drone.x - 8, drone.y - 12, (drone.battery / 100) * 16, 2);
      
      // Drone ID
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText(drone.id, drone.x - 3, drone.y + 3);
    });

  }, [drones, disasters, survivors, networkConnections]);

  // Control functions
  const startSimulation = () => {
    setIsRunning(true);
  };

  const pauseSimulation = () => {
    setIsRunning(false);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initializeSimulation();
  };

  // Initialize on mount
  useEffect(() => {
    initializeSimulation();
  }, [initializeSimulation]);

  // Start animation loop
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-blue-400">SwarmNet Disaster Response Prototype</h1>
        <p className="text-gray-300">Real-time simulation of autonomous drone swarm network for disaster response</p>
      </div>

      {/* Control Panel */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={startSimulation}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
        >
          <Play size={16} />
          Start
        </button>
        <button
          onClick={pauseSimulation}
          disabled={!isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded"
        >
          <Pause size={16} />
          Pause
        </button>
        <button
          onClick={resetSimulation}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Simulation Canvas */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Live Disaster Zone</h3>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-gray-600 bg-gray-900 w-full"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            <div className="mt-3 text-sm text-gray-400">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Legend:</strong>
                  <div>🔵 Command Drone</div>
                  <div>🟢 Relay Drone</div>
                  <div>🟠 Sensor Drone</div>
                  <div>🟣 Logistics Drone</div>
                </div>
                <div>
                  <div>🔴 Emergency Survivor</div>
                  <div>⚫ Disconnected Survivor</div>
                  <div>🟢 Connected Survivor</div>
                  <div>🟠 Connected Emergency</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          {/* System Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-400">
              <Activity size={18} />
              System Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Active Drones:</span>
                <span className="text-green-400">{stats.activeDrones}/15</span>
              </div>
              <div className="flex justify-between">
                <span>Network Coverage:</span>
                <span className="text-blue-400">{stats.networkCoverage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Communication Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-400">
              <Signal size={18} />
              Communications
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Connected Survivors:</span>
                <span className="text-green-400">{stats.survivorsConnected}/{survivors.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Emergency Calls:</span>
                <span className="text-red-400">{stats.emergencyCalls}</span>
              </div>
              <div className="flex justify-between">
                <span>Data Processed:</span>
                <span className="text-cyan-400">{(stats.dataProcessed / 1000).toFixed(1)}GB</span>
              </div>
            </div>
          </div>

          {/* Network Health */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-400">
              <Wifi size={18} />
              Network Health
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Mesh Density:</span>
                  <span>{networkConnections.length} links</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (networkConnections.length / 30) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Average Battery:</span>
                  <span>{drones.length > 0 ? (drones.reduce((sum, d) => sum + d.battery, 0) / drones.length).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${drones.length > 0 ? drones.reduce((sum, d) => sum + d.battery, 0) / drones.length : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-400">
              <MapPin size={18} />
              Mission Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Disaster Zones:</span>
                <span className="text-red-400">{disasters.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Search & Rescue:</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Data Collection:</span>
                <span className="text-blue-400">Continuous</span>
              </div>
              <div className="flex justify-between">
                <span>Network Optimization:</span>
                <span className="text-cyan-400">Adaptive</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Information */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-cyan-400">Prototype Features Demonstrated</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <strong className="text-green-400">Autonomous Behavior:</strong>
            <ul className="ml-4 mt-1 text-gray-300">
              <li>• Self-organizing swarm intelligence</li>
              <li>• Dynamic target acquisition</li>
              <li>• Adaptive mission planning</li>
            </ul>
          </div>
          <div>
            <strong className="text-blue-400">Network Management:</strong>
            <ul className="ml-4 mt-1 text-gray-300">
              <li>• Mesh network formation</li>
              <li>• Coverage optimization</li>
              <li>• Redundancy & self-healing</li>
            </ul>
          </div>
          <div>
            <strong className="text-purple-400">AI Coordination:</strong>
            <ul className="ml-4 mt-1 text-gray-300">
              <li>• Multi-agent coordination</li>
              <li>• Real-time decision making</li>
              <li>• Resource allocation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwarmNetPrototype;