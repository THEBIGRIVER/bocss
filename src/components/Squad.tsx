import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Users, ArrowLeft } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export function Squad() {
  const { setScreen, squadId, setProfile } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [squadError, setSquadError] = useState('');

  const handleCreateSquad = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { squadId: code }, { merge: true });
      }
      setProfile({ squadId: code });
      setSquadError('');
    } catch (e) {
      setSquadError('Error creating squad.');
    }
  };

  const handleJoinSquad = async () => {
    if (!joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    
    try {
      const q = query(collection(db, 'active_players'), where('squadId', '==', code));
      const snap = await getDocs(q);
      if (snap.size >= 6) {
        setSquadError('Squad is full (max 6 players).');
        return;
      }
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { squadId: code }, { merge: true });
      }
      setProfile({ squadId: code });
      setSquadError('');
      setJoinCode('');
    } catch (e) {
      setSquadError('Error joining squad.');
    }
  };

  const handleLeaveSquad = async () => {
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { squadId: '' }, { merge: true });
      }
      setProfile({ squadId: '' });
      setSquadError('');
    } catch (e) {
      setSquadError('Error leaving squad.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white"
    >
      <button 
        onClick={() => setScreen('home')}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft /> BACK TO MENU
      </button>

      <div className="flex items-center gap-4 mb-12 text-cyan-400">
        <Users size={48} />
        <h1 className="text-5xl font-black tracking-tighter">SQUAD</h1>
      </div>

      <div className="bg-white/5 p-8 rounded-2xl border border-white/10 w-96 max-w-[90vw]">
        {squadId ? (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Current Squad Code:</div>
              <div className="text-4xl font-mono text-white tracking-widest bg-black/50 py-4 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                {squadId}
              </div>
            </div>
            <button 
              onClick={handleLeaveSquad}
              className="w-full py-4 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-xl font-bold tracking-widest transition-colors border border-red-500/30"
            >
              LEAVE SQUAD
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <button 
              onClick={handleCreateSquad}
              className="w-full py-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 rounded-xl font-bold tracking-widest transition-colors border border-cyan-500/30"
            >
              CREATE NEW SQUAD
            </button>
            
            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-sm text-gray-500 font-bold tracking-widest">OR JOIN</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="ENTER CODE" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white font-mono uppercase focus:outline-none focus:border-cyan-500 text-center text-xl tracking-widest"
                  maxLength={6}
                />
                <button 
                  onClick={handleJoinSquad}
                  className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                >
                  JOIN
                </button>
              </div>
              {squadError && <div className="text-red-400 text-sm font-bold mt-2 text-center">{squadError}</div>}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
