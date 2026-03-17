import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

const WEAPONS = [
  { id: 'blaster', name: 'Neon Blaster', price: 0, damage: 10, fireRate: 'Fast' },
  { id: 'plasma', name: 'Plasma Rifle', price: 500, damage: 25, fireRate: 'Medium' },
  { id: 'railgun', name: 'Void Railgun', price: 1500, damage: 100, fireRate: 'Slow' },
];

export function Shop() {
  const { setScreen, coins } = useGameStore();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white z-50"
    >
      <button 
        onClick={() => setScreen('home')}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors font-mono tracking-widest"
      >
        <ArrowLeft /> BACK
      </button>

      <div className="absolute top-8 right-8 bg-black/50 px-6 py-3 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] font-mono text-xl text-purple-400">
        COINS: {coins}
      </div>

      <h2 className="text-5xl font-black tracking-tighter mb-12 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center gap-4">
        <ShoppingCart size={48} className="text-purple-400" /> BLACK MARKET
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {WEAPONS.map(w => (
          <div key={w.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-purple-500/50 transition-all group flex flex-col">
            <div className="h-32 bg-black/50 rounded-2xl mb-6 border border-white/5 flex items-center justify-center group-hover:shadow-[inset_0_0_20px_rgba(168,85,247,0.2)] transition-all">
              <div className="w-20 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-sm transform -rotate-12 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            </div>
            <h3 className="text-2xl font-bold font-mono mb-2">{w.name}</h3>
            <div className="flex justify-between text-sm text-gray-400 mb-6 font-mono">
              <span>DMG: {w.damage}</span>
              <span>RATE: {w.fireRate}</span>
            </div>
            <button className="mt-auto w-full py-3 rounded-xl bg-purple-600/20 text-purple-400 font-bold tracking-widest border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              {w.price === 0 ? 'OWNED' : `${w.price} COINS`}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
