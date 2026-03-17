import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Play, ShoppingCart, Package, Trophy, LogOut, Map, Users } from 'lucide-react';
import { auth } from '../lib/firebase';

export function MainMenu() {
  const { setScreen, score, coins } = useGameStore();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white">
      <div className="absolute top-4 right-4 flex gap-4 text-cyan-400 font-mono">
        <div className="bg-black/50 px-4 py-2 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          SCORE: {score}
        </div>
        <div className="bg-black/50 px-4 py-2 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          COINS: {coins}
        </div>
      </div>

      <motion.h1 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-7xl font-black tracking-tighter mb-12 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]"
      >
        BOCS
      </motion.h1>

      <div className="flex flex-col gap-4 w-64">
        <MenuButton icon={<Play />} label="PLAY" onClick={() => setScreen('game')} primary />
        <MenuButton icon={<Map />} label="WORLD MAP" onClick={() => setScreen('map')} />
        <MenuButton icon={<Users />} label="SQUAD" onClick={() => setScreen('squad')} />
        <MenuButton icon={<Package />} label="INVENTORY" onClick={() => setScreen('inventory')} />
        <MenuButton icon={<ShoppingCart />} label="SHOP" onClick={() => setScreen('shop')} />
        <MenuButton icon={<Trophy />} label="LEADERBOARD" onClick={() => setScreen('leaderboard')} />
      </div>

      <button 
        onClick={() => auth.signOut()}
        className="absolute top-4 left-4 flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors bg-black/50 px-4 py-2 rounded-xl border border-white/10 hover:border-red-500/30 backdrop-blur-md"
      >
        <LogOut size={18} />
        <span className="font-mono text-sm font-bold">SIGN OUT</span>
      </button>
    </div>
  );
}

function MenuButton({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold tracking-widest transition-all duration-300 ${
        primary 
          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]' 
          : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20'
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}
