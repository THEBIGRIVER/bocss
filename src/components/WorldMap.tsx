import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, Crosshair, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { TERRITORY_COLORS, isPointInPolygon } from '../lib/territories';

// Custom Icons
const playerIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size: 24px; filter: drop-shadow(0 0 10px #06b6d4);">📍</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const treasureIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size: 24px; filter: drop-shadow(0 0 10px #eab308); animation: bounce 2s infinite;">💎</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const botIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size: 24px; filter: drop-shadow(0 0 10px #ef4444);">🤖</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

const otherPlayerIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size: 24px; filter: drop-shadow(0 0 10px #a855f7);">🥷</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

// Haversine distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function WorldMap() {
  const { setScreen, score, coins, setProfile, squadId, territories } = useGameStore();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [pois, setPois] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [capturedTerritories, setCapturedTerritories] = useState<string[]>([]);
  const prevTerritoriesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Check for newly captured territories
    if (territories.length > 0) {
      const newlyCaptured: string[] = [];
      territories.forEach(t => {
        const prevOwner = prevTerritoriesRef.current[t.id];
        if (prevOwner !== undefined && prevOwner !== t.ownerSquad && t.ownerSquad !== '') {
          newlyCaptured.push(t.id);
        }
        prevTerritoriesRef.current[t.id] = t.ownerSquad;
      });
      
      if (newlyCaptured.length > 0) {
        setCapturedTerritories(prev => [...prev, ...newlyCaptured]);
        setTimeout(() => {
          setCapturedTerritories(prev => prev.filter(id => !newlyCaptured.includes(id)));
        }, 1000);
      }
    }
  }, [territories]);

  useEffect(() => {
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          
          // Generate POIs once when we get the first position
          setPois(prev => {
            if (prev.length > 0) return prev;
            const newPois = [];
            for(let i=0; i<5; i++) {
              // Random offset within ~500m
              const latOffset = (Math.random() - 0.5) * 0.005;
              const lngOffset = (Math.random() - 0.5) * 0.005;
              newPois.push({
                id: `treasure-${i}`,
                type: 'treasure',
                lat: newPos[0] + latOffset,
                lng: newPos[1] + lngOffset,
                active: true
              });
            }
            for(let i=0; i<3; i++) {
              const latOffset = (Math.random() - 0.5) * 0.005;
              const lngOffset = (Math.random() - 0.5) * 0.005;
              newPois.push({
                id: `bot-${i}`,
                type: 'bot',
                lat: newPos[0] + latOffset,
                lng: newPos[1] + lngOffset,
                active: true
              });
            }
            for(let i=0; i<2; i++) {
              const latOffset = (Math.random() - 0.5) * 0.005;
              const lngOffset = (Math.random() - 0.5) * 0.005;
              newPois.push({
                id: `player-${i}`,
                type: 'player',
                lat: newPos[0] + latOffset,
                lng: newPos[1] + lngOffset,
                active: true
              });
            }
            return newPois;
          });
        },
        (err) => setError('Enable location to view the map.'),
        { enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation not supported.');
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (!position || territories.length === 0) return;
    let currentTerritoryId = '';
    for (const t of territories) {
      if (isPointInPolygon(position, t.polygonCoordinates)) {
        currentTerritoryId = t.id;
        break;
      }
    }
    if (currentTerritoryId !== useGameStore.getState().territoryId) {
      setProfile({ territoryId: currentTerritoryId });
    }
  }, [position, territories, setProfile]);

  const handleInteract = (poi: any) => {
    if (!position) return;
    const dist = getDistance(position[0], position[1], poi.lat, poi.lng);
    
    if (dist > 500) {
      alert('Too far! Get within 500 meters.');
      return;
    }

    if (poi.type === 'treasure') {
      setProfile({ coins: coins + 100, score: score + 50 });
      setPois(prev => prev.map(p => p.id === poi.id ? { ...p, active: false } : p));
    } else if (poi.type === 'bot' || poi.type === 'player') {
      // Engage in combat
      setPois(prev => prev.map(p => p.id === poi.id ? { ...p, active: false } : p));
      setScreen('game'); // Enter the 2D shooter
    }
  };

  if (error) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white">
        <p className="text-red-500 font-mono mb-4">{error}</p>
        <button onClick={() => setScreen('home')} className="text-cyan-400 font-mono underline">BACK</button>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center text-cyan-400 font-mono animate-pulse">
        ACQUIRING SATELLITE LOCK...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black"
    >
      <button 
        onClick={() => setScreen('home')}
        className="absolute top-8 left-8 z-[1000] bg-black/50 px-4 py-2 rounded-xl flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors font-mono tracking-widest border border-white/10 backdrop-blur-md"
      >
        <ArrowLeft /> BACK
      </button>

      <div className="absolute top-8 right-8 z-[1000] flex gap-4 text-cyan-400 font-mono">
        <div className="bg-black/50 px-4 py-2 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-md">
          COINS: {coins}
        </div>
      </div>

      <MapContainer 
        center={position} 
        zoom={16} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Player Marker */}
        <Marker position={position} icon={playerIcon}>
          <Popup className="font-mono">
            <div className="text-center font-bold text-cyan-600">YOU ARE HERE</div>
          </Popup>
        </Marker>
        
        {/* Interaction Radius */}
        <Circle center={position} radius={500} pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.1 }} />

        {/* Territories */}
        {territories.map(t => {
          const currentSquad = squadId || `SOLO-${auth.currentUser?.uid}`;
          const isOwned = t.ownerSquad && t.ownerSquad === currentSquad;
          const isEnemy = t.ownerSquad && t.ownerSquad !== currentSquad;
          const color = TERRITORY_COLORS[t.colorIndex];
          const fillColor = isOwned ? '#22c55e' : isEnemy ? '#ef4444' : color;
          const borderColor = isOwned ? '#4ade80' : isEnemy ? '#f87171' : color;
          
          const isCaptured = capturedTerritories.includes(t.id);
          const className = isCaptured ? 'animate-capture' : t.health < 1000 ? 'animate-pulse' : '';
          
          return (
            <Polygon 
              key={t.id} 
              positions={t.polygonCoordinates} 
              pathOptions={{ 
                color: borderColor, 
                fillColor: fillColor, 
                fillOpacity: 0.3,
                weight: 3,
                className
              }}
            >
              <Tooltip direction="center" permanent className="bg-transparent border-none shadow-none text-white font-mono font-bold text-shadow-md">
                <div className="flex flex-col items-center">
                  {t.ownerSquad ? (
                    <>
                      <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">🚩</span>
                      <span className="bg-black/60 px-2 py-1 rounded text-xs mt-1 border border-white/20 backdrop-blur-sm">
                        {t.ownerSquad.startsWith('SOLO-') ? 'SOLO' : t.ownerSquad}
                      </span>
                    </>
                  ) : (
                    <span className="bg-black/60 px-2 py-1 rounded text-xs mt-1 border border-white/20 backdrop-blur-sm text-gray-400">NEUTRAL</span>
                  )}
                  <div className="w-16 bg-gray-900/80 rounded-full h-1.5 mt-1 border border-white/10">
                    <div className="bg-red-500 h-1.5 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" style={{ width: `${(t.health / 1000) * 100}%` }}></div>
                  </div>
                </div>
              </Tooltip>
              <Popup className="font-mono">
                <div className="text-center p-2">
                  <div className="font-bold text-lg" style={{color: borderColor}}>{t.name}</div>
                  {t.ownerSquad ? (
                    <div className="text-sm my-1">
                      🚩 OWNER: <span className="font-bold">{t.ownerSquad.startsWith('SOLO-') ? 'SOLO' : t.ownerSquad}</span>
                    </div>
                  ) : (
                    <div className="text-sm my-1 text-gray-500">NEUTRAL</div>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${(t.health / 1000) * 100}%` }}></div>
                  </div>
                  <div className="text-xs mt-1">{t.health} / 1000 HP</div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* POIs */}
        {pois.filter(p => p.active).map(poi => (
          <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poi.type === 'treasure' ? treasureIcon : poi.type === 'bot' ? botIcon : otherPlayerIcon}>
            <Popup className="font-mono">
              <div className="flex flex-col items-center gap-2 p-2">
                <div className="font-bold text-gray-800">
                  {poi.type === 'treasure' ? 'HIDDEN CACHE' : poi.type === 'bot' ? 'ROGUE BOT' : 'RIVAL PLAYER'}
                </div>
                <button 
                  onClick={() => handleInteract(poi)}
                  className={`px-4 py-2 rounded font-bold text-white w-full ${poi.type === 'treasure' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {poi.type === 'treasure' ? 'COLLECT' : 'ENGAGE'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </motion.div>
  );
}
