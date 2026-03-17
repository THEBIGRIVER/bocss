import { create } from 'zustand';
import { Territory } from '../lib/territories';

export type Screen = 'home' | 'game' | 'inventory' | 'shop' | 'leaderboard' | 'map' | 'squad';

interface GameState {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  
  // Game HUD State
  health: number;
  setHealth: (health: number) => void;
  ammo: number;
  setAmmo: (ammo: number) => void;
  
  // User Profile
  score: number;
  coins: number;
  equippedWeapon: string;
  squadId: string;
  territoryId: string;
  territories: Territory[];
  setProfile: (profile: Partial<{score: number, coins: number, equippedWeapon: string, squadId: string, territoryId: string}>) => void;
  setTerritories: (territories: Territory[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'home',
  setScreen: (screen) => set({ screen }),
  
  health: 100,
  setHealth: (health) => set({ health }),
  ammo: 30,
  setAmmo: (ammo) => set({ ammo }),
  
  score: 0,
  coins: 0,
  equippedWeapon: 'blaster',
  squadId: '',
  territoryId: '',
  territories: [],
  setProfile: (profile) => set((state) => ({ ...state, ...profile })),
  setTerritories: (territories) => set({ territories }),
}));
