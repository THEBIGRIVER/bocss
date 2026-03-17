import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { db, auth } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

const GRAVITY = 0.6;
const MOVE_SPEED = 5;
const JUMP_FORCE = -12;
const GROUND_Y = 600;

export function GameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useGameStore();
  
  // Mutable game state to avoid React re-renders in the loop
  const state = useRef({
    player: { x: 200, y: 200, vx: 0, vy: 0, health: 100, ammo: 30, facingRight: true },
    keys: {} as Record<string, boolean>,
    opponents: {} as Record<string, any>,
    bots: [{ id: 'bot-1', x: 800, y: 200, vx: 0, vy: 0, health: 100, facingRight: false, shootCooldown: 60 }],
    bullets: [] as any[],
    particles: [] as any[],
    lastSync: 0,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Input handling
    const handleKeyDown = (e: KeyboardEvent) => {
      state.current.keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => { state.current.keys[e.code] = false; };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.current.mouseX = e.clientX - rect.left;
      state.current.mouseY = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (state.current.player.ammo > 0) {
        state.current.player.ammo--;
        store.setAmmo(state.current.player.ammo);
        
        // Calculate angle
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const angle = Math.atan2(mouseY - state.current.player.y, mouseX - state.current.player.x);
        
        // Shoot bullet
        const speed = 15;
        state.current.bullets.push({
          x: state.current.player.x,
          y: state.current.player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 100,
          owner: auth.currentUser?.uid || 'local',
          squadId: useGameStore.getState().squadId,
          territoryId: useGameStore.getState().territoryId
        });
        state.current.player.isShooting = true;
        
        // Add shoot particles
        for(let i=0; i<5; i++) {
          state.current.particles.push({
            x: state.current.player.x, y: state.current.player.y,
            vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
            life: 20, color: '#06b6d4'
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    // Firebase Sync (Listen to opponents)
    let unsubscribe = () => {};
    if (auth.currentUser) {
      unsubscribe = onSnapshot(collection(db, 'active_players'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.doc.id === auth.currentUser?.uid) return; // Skip self
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            if (typeof data.x !== 'number' || typeof data.y !== 'number') return; // Skip invalid data
            
            const prev = state.current.opponents[change.doc.id];
            if (data.isShooting && (!prev || !prev.isShooting)) {
              const speed = 15;
              const vx = data.facingRight ? speed : -speed;
              state.current.bullets.push({
                x: data.x, y: data.y, vx, vy: 0, life: 100, owner: change.doc.id, squadId: data.squadId, territoryId: data.territoryId
              });
            }
            state.current.opponents[change.doc.id] = data;
          }
          if (change.type === 'removed') {
            delete state.current.opponents[change.doc.id];
          }
        });
      });
    }

    // Game Loop
    let animationId: number;
    const loop = (time: number) => {
      try {
        update(time);
        draw(ctx, canvas);
      } catch (err) {
        console.error("Game loop error:", err);
      }
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      cancelAnimationFrame(animationId);
      unsubscribe();
      
      // Cleanup player from DB
      if (auth.currentUser) {
        deleteDoc(doc(db, 'active_players', auth.currentUser.uid)).catch(console.error);
      }
    };
  }, []);

  const update = (time: number) => {
    const p = state.current.player;
    const keys = state.current.keys;

    // Physics
    p.vy += GRAVITY;

    // Movement
    if (keys['KeyA']) { p.vx = -MOVE_SPEED; p.facingRight = false; }
    else if (keys['KeyD']) { p.vx = MOVE_SPEED; p.facingRight = true; }
    else { p.vx *= 0.8; } // Friction

    // Jump
    if (keys['Space']) {
      if (p.y >= GROUND_Y) {
        p.vy = JUMP_FORCE; // Normal jump
      }
    }

    p.x += p.vx;
    p.y += p.vy;

    // Floor collision
    if (p.y > GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
    }

    // Helper to calculate damage and update territory
    const handleDamage = (bullet: any, baseDamage: number) => {
      const territories = useGameStore.getState().territories;
      const territory = territories.find(t => t.id === bullet.territoryId);
      let damage = baseDamage;
      
      if (territory) {
        const bulletSquad = bullet.squadId || `SOLO-${bullet.owner}`;
        
        if (territory.ownerSquad === bulletSquad) {
          damage = baseDamage * 2; // Owner deals double damage
        } else if (territory.ownerSquad !== bulletSquad || territory.ownerSquad === '') {
          if (territory.ownerSquad !== '') {
            damage = baseDamage * 0.5; // Enemy deals half damage
          }
          
          // Damage territory (neutral or enemy)
          const newHp = Math.max(0, territory.health - 10);
          if (newHp === 0) {
            // Capture territory
            setDoc(doc(db, 'territories', territory.id), {
              ownerSquad: bulletSquad,
              health: 1000
            }, { merge: true });
          } else {
            setDoc(doc(db, 'territories', territory.id), {
              health: newHp
            }, { merge: true });
          }
        }
      }
      return damage;
    };

    // Update bullets
    state.current.bullets.forEach(b => {
      if (typeof b.x !== 'number' || typeof b.y !== 'number' || isNaN(b.x) || isNaN(b.y)) {
        b.life = 0;
        return;
      }
      
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      
      // Tracer particles (shimmering yellow)
      for (let i = 0; i < 2; i++) {
        state.current.particles.push({
          x: b.x - b.vx * (i * 0.5) + (Math.random() - 0.5) * 3,
          y: b.y - b.vy * (i * 0.5) + (Math.random() - 0.5) * 3,
          vx: b.vx * 0.05 + (Math.random() - 0.5) * 1,
          vy: b.vy * 0.05 + (Math.random() - 0.5) * 1,
          life: 15 + Math.random() * 10,
          color: Math.random() > 0.5 ? '#fde047' : '#eab308' // Shimmering yellow effect
        });
      }
      
      // Check hit player
      if (b.owner !== 'local' && b.owner !== auth.currentUser?.uid) {
        const currentSquadId = useGameStore.getState().squadId;
        const isFriendly = b.squadId && currentSquadId && b.squadId === currentSquadId;
        if (!isFriendly && Math.abs(b.x - p.x) < 20 && Math.abs(b.y - p.y) < 20) {
          const dmg = handleDamage(b, 10);
          p.health -= dmg;
          b.life = 0;
          
          if (p.health <= 0) {
            p.health = 100;
            p.x = Math.random() * 800;
            p.y = 100; // Respawn in air
          }
          
          store.setHealth(p.health);
          
          // Impact sparks
          for (let i = 0; i < 15; i++) {
            state.current.particles.push({
              x: b.x, y: b.y,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: 15 + Math.random() * 15,
              color: Math.random() > 0.5 ? '#ef4444' : '#f97316' // Red/Orange sparks
            });
          }
        }
      }
      
      // Check hit bots
      if (b.owner === 'local' || b.owner === auth.currentUser?.uid) {
        state.current.bots.forEach(bot => {
          if (Math.abs(b.x - bot.x) < 20 && Math.abs(b.y - bot.y) < 20) {
            const dmg = handleDamage(b, 25);
            bot.health -= dmg;
            b.life = 0;
            
            // Impact sparks
            for (let i = 0; i < 15; i++) {
              state.current.particles.push({
                x: b.x, y: b.y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 15 + Math.random() * 15,
                color: Math.random() > 0.5 ? '#06b6d4' : '#3b82f6' // Cyan/Blue sparks
              });
            }

            if (bot.health <= 0) {
              store.setProfile({ score: store.score + 100, coins: store.coins + 50 });
            }
          }
        });
      }
    });
    state.current.bullets = state.current.bullets.filter(b => b.life > 0);
    state.current.bots = state.current.bots.filter(b => b.health > 0);

    // Update bots
    state.current.bots.forEach(bot => {
      const dx = p.x - bot.x;
      const dy = p.y - bot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 1. Low Health: Retreat / Take Cover
      if (bot.health <= 40) {
        if (distance < 500) {
          // Run away from player
          bot.vx = dx > 0 ? -MOVE_SPEED * 0.8 : MOVE_SPEED * 0.8;
          bot.facingRight = bot.vx > 0;
          
          // Evasive jumping
          if (Math.random() < 0.05 && bot.y >= GROUND_Y) {
            bot.vy = JUMP_FORCE;
          }
        } else {
          bot.vx *= 0.8; // Safe distance reached
        }
      } 
      // 2. Normal Combat: Detect and Engage
      else if (distance < 600) { // Detection range
        // Move towards player but keep a shooting distance
        if (Math.abs(dx) > 250) {
          bot.vx = dx > 0 ? MOVE_SPEED * 0.5 : -MOVE_SPEED * 0.5;
          bot.facingRight = dx > 0;
        } else if (Math.abs(dx) < 100) {
          // Back away if too close
          bot.vx = dx > 0 ? -MOVE_SPEED * 0.4 : MOVE_SPEED * 0.4;
          bot.facingRight = dx > 0;
        } else {
          bot.vx *= 0.8; // Stop and shoot
          bot.facingRight = dx > 0;
        }

        // Jump if player is higher
        if (p.y < bot.y - 50 && Math.random() < 0.05 && bot.y >= GROUND_Y) {
          bot.vy = JUMP_FORCE;
        }

        // Shoot at player (aimed)
        bot.shootCooldown--;
        if (bot.shootCooldown <= 0) {
          bot.shootCooldown = 60;
          const speed = 10;
          const angle = Math.atan2(dy, dx);
          state.current.bullets.push({
            x: bot.x, y: bot.y, 
            vx: Math.cos(angle) * speed, 
            vy: Math.sin(angle) * speed, 
            life: 100, owner: bot.id
          });
        }
      } 
      // 3. Idle
      else {
        bot.vx *= 0.8;
      }

      bot.vy += GRAVITY;
      bot.x += bot.vx;
      bot.y += bot.vy;
      
      // Keep within bounds
      if (bot.x < 20) bot.x = 20;
      if (bot.x > window.innerWidth - 20) bot.x = window.innerWidth - 20;
      
      if (bot.y > GROUND_Y) { bot.y = GROUND_Y; bot.vy = 0; }
    });

    // Update particles
    state.current.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    state.current.particles = state.current.particles.filter(p => p.life > 0);

    // Sync to Firebase (throttle to ~10fps)
    if (auth.currentUser && time - state.current.lastSync > 100) {
      state.current.lastSync = time;
      setDoc(doc(db, 'active_players', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Player',
        x: p.x, y: p.y, vx: p.vx, vy: p.vy,
        health: p.health,
        squadId: useGameStore.getState().squadId || '',
        territoryId: useGameStore.getState().territoryId || '',
        isShooting: p.isShooting,
        facingRight: p.facingRight,
        lastUpdated: new Date()
      }).catch(console.error);
      p.isShooting = false;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Cyberpunk feel)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=50) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Draw Ground
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, GROUND_Y + 20, canvas.width, canvas.height - GROUND_Y);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 20); ctx.lineTo(canvas.width, GROUND_Y + 20); ctx.stroke();

    // Draw Particles (Behind players)
    state.current.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 30);
      
      if (p.color === '#fde047' || p.color === '#eab308') {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    // Draw Bullets (Behind players)
    ctx.fillStyle = '#fde047';
    state.current.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#fde047';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Opponents
    Object.values(state.current.opponents).forEach((opp: any) => {
      if (typeof opp.x !== 'number' || typeof opp.y !== 'number') return;
      const currentSquadId = useGameStore.getState().squadId;
      const isFriendly = opp.squadId && currentSquadId && opp.squadId === currentSquadId;
      const color = isFriendly ? '#22c55e' : '#ef4444';
      drawPlayer(ctx, opp.x, opp.y, opp.facingRight || false, color);
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      const nameText = opp.squadId ? `[${opp.squadId}] ${opp.displayName || 'Player'}` : (opp.displayName || 'Player');
      ctx.fillText(nameText, opp.x, opp.y - 40);
    });

    // Draw Bots
    state.current.bots.forEach(bot => {
      drawPlayer(ctx, bot.x, bot.y, bot.facingRight, '#f97316');
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ROGUE BOT', bot.x, bot.y - 40);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bot.x - 15, bot.y - 30, 30 * (bot.health / 100), 4);
    });

    // Draw Player
    const p = state.current.player;
    drawPlayer(ctx, p.x, p.y, p.facingRight, '#06b6d4');
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const currentSquadId = useGameStore.getState().squadId;
    const myNameText = currentSquadId ? `[${currentSquadId}] YOU` : 'YOU';
    ctx.fillText(myNameText, p.x, p.y - 40);

    // Draw Crosshair
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.current.mouseX - 10, state.current.mouseY);
    ctx.lineTo(state.current.mouseX + 10, state.current.mouseY);
    ctx.moveTo(state.current.mouseX, state.current.mouseY - 10);
    ctx.lineTo(state.current.mouseX, state.current.mouseY + 10);
    ctx.stroke();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, facingRight: boolean, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;

    // Body (Box)
    ctx.lineWidth = 3;
    ctx.fillStyle = '#000';
    ctx.fillRect(-15, -20, 30, 40);
    ctx.strokeRect(-15, -20, 30, 40);

    // Eye / Visor
    ctx.fillStyle = color;
    if (facingRight) {
      ctx.fillRect(5, -10, 15, 8);
    } else {
      ctx.fillRect(-20, -10, 15, 8);
    }

    ctx.restore();
  };

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-none" />;
}
