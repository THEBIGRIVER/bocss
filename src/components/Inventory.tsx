import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, Package } from 'lucide-react';

export function Inventory() {
  const { setScreen, equippedWeapon, setProfile } = useGameStore();
  const inventory = ['blaster', 'plasma']; // Mock data

  return (
    <motion.div 
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white z-50"
    >
      <button 
        onClick={() => setScreen('home')}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors font-mono tracking-widest"
      >
        <ArrowLeft /> BACK
      </button>

      <h2 className="text-5xl font-black tracking-tighter mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center gap-4">
        <Package size={48} className="text-cyan-400" /> ARMORY
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        {inventory.map(id => (
          <div 
            key={id} 
            onClick={() => setProfile({ equippedWeapon: id })}
            className={`cursor-pointer bg-white/5 border rounded-3xl p-6 transition-all group flex flex-col items-center justify-center h-48 ${
              equippedWeapon === id 
                ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-cyan-900/20' 
                : 'border-white/10 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            <div className="w-16 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-sm transform -rotate-12 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <span className="font-mono font-bold tracking-widest uppercase text-sm">{id}</span>
            {equippedWeapon === id && (
              <span className="mt-2 text-xs text-cyan-400 font-bold tracking-widest">EQUIPPED</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
