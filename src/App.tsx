import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { Shop } from './components/Shop';
import { Inventory } from './components/Inventory';
import { Leaderboard } from './components/Leaderboard';
import { Squad } from './components/Squad';
import { GameEngine } from './game/GameEngine';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { AnimatePresence } from 'framer-motion';

import { WorldMap } from './components/WorldMap';
import { initializeTerritoriesIfEmpty, Territory } from './lib/territories';

export default function App() {
  const { screen, setProfile, setScreen, setTerritories } = useGameStore();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeTerritoriesIfEmpty();
    const unsubscribe = onSnapshot(collection(db, 'territories'), (snapshot) => {
      const loaded: Territory[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loaded.push({
          ...data,
          polygonCoordinates: typeof data.polygonCoordinates === 'string' ? JSON.parse(data.polygonCoordinates) : data.polygonCoordinates
        } as Territory);
      });
      setTerritories(loaded);
    });
    return () => unsubscribe();
  }, [setTerritories]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.squadId === undefined) {
              data.squadId = '';
              await setDoc(userRef, { squadId: '' }, { merge: true });
            }
            setProfile(data);
          } else {
            const newProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Player',
              score: 0,
              coins: 100,
              equippedWeapon: 'blaster',
              inventory: ['blaster'],
              squadId: '',
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          console.error("Error loading profile", e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setProfile]);

  // Handle ESC to exit game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && screen === 'game') {
        setScreen('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, setScreen]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-cyan-400 font-mono text-xl tracking-widest animate-pulse">
        INITIALIZING BOCS...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        
        <h1 className="text-8xl font-black tracking-tighter mb-12 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] z-10">
          BOCS
        </h1>
        <p className="text-gray-400 font-mono mb-12 tracking-widest z-10">COMBAT SYSTEM</p>
        
        <button 
          onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
          className="z-10 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl font-bold tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-105"
        >
          LOGIN TO PLAY
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative font-sans select-none">
      {screen === 'game' && (
        <>
          <GameEngine />
          <HUD />
          <div className="absolute top-4 right-4 text-white/50 font-mono text-xs pointer-events-none z-50">
            PRESS ESC TO MENU
          </div>
        </>
      )}
      
      <AnimatePresence mode="wait">
        {screen === 'home' && <MainMenu key="home" />}
        {screen === 'shop' && <Shop key="shop" />}
        {screen === 'inventory' && <Inventory key="inventory" />}
        {screen === 'squad' && <Squad key="squad" />}
        {screen === 'leaderboard' && <Leaderboard key="leaderboard" />}
        {screen === 'map' && <WorldMap key="map" />}
      </AnimatePresence>
    </div>
  );
}
