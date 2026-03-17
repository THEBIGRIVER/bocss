import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Heart } from 'lucide-react';

export function HUD() {
  const { health, ammo } = useGameStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
      {/* Dynamic Crosshair */}
      <motion.div
        className="absolute w-8 h-8 pointer-events-none border-2 border-cyan-400/50 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]"
        animate={{
          x: mousePos.x - 16,
          y: mousePos.y - 16,
          scale: 1,
          rotate: 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <div className="w-1 h-1 bg-cyan-400 rounded-full" />
      </motion.div>

      {/* Health Bar */}
      <div className="absolute top-6 left-6 flex items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
        <Heart className="text-red-500" fill="currentColor" />
        <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-red-600 to-red-400"
            initial={{ width: '100%' }}
            animate={{ width: `${health}%` }}
            transition={{ type: 'spring' }}
          />
        </div>
        <span className="font-mono text-white font-bold">{health}</span>
      </div>

      {/* Ammo */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
        <div className="text-cyan-400 font-mono text-5xl font-black drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
          {ammo}
        </div>
        <div className="text-gray-400 text-sm tracking-widest font-bold">AMMO</div>
      </div>
    </div>
  );
}
