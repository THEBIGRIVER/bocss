import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, Trophy } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Leaderboard() {
  const { setScreen } = useGameStore();
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data());
        setLeaders(data);
      } catch (e) {
        console.error("Error fetching leaderboard", e);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white z-50"
    >
      <button 
        onClick={() => setScreen('home')}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors font-mono tracking-widest"
      >
        <ArrowLeft /> BACK
      </button>

      <h2 className="text-5xl font-black tracking-tighter mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-4">
        <Trophy size={48} className="text-yellow-400" /> LEADERBOARD
      </h2>

      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {leaders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 font-mono">Loading data...</div>
        ) : (
          leaders.map((l, i) => (
            <div key={l.uid} className={`flex items-center justify-between p-6 border-b border-white/5 ${i === 0 ? 'bg-yellow-500/10' : 'hover:bg-white/5'} transition-colors`}>
              <div className="flex items-center gap-6">
                <span className={`font-black text-2xl ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                  #{i + 1}
                </span>
                <span className="font-mono font-bold text-lg">{l.displayName}</span>
              </div>
              <span className="font-mono text-cyan-400 font-bold tracking-widest">{l.score} PTS</span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
