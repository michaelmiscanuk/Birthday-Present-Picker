'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  alphaDecay: number;
  color: string;
  twinkle: number; // twinkle phase
  twinkleSpeed: number;
}

const COLORS = [
  'rgba(255, 230, 80,',   // golden sun
  'rgba(255, 255, 180,',  // pale yellow
  'rgba(255, 210, 90,',   // warm amber
  'rgba(180, 235, 255,',  // icy blue (Frozen)
  'rgba(255, 255, 255,',  // white sparkle
  'rgba(220, 240, 255,',  // pale ice
];

function spawnParticle(canvasWidth: number, canvasHeight: number, fromTop = false): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: fromTop ? Math.random() * canvasHeight : canvasHeight + 10,
    vx: (Math.random() - 0.5) * 0.7,
    vy: -(Math.random() * 1.5 + 0.3),
    radius: Math.random() * 5.0 + 1.2,
    alpha: Math.random() * 0.65 + 0.35,
    alphaDecay: Math.random() * 0.0022 + 0.0004,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.06 + 0.02,
  };
}

export default function SunParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Seed initial particles spread across the full screen
    for (let i = 0; i < 150; i++) {
      particles.push(spawnParticle(canvas.width, canvas.height, true));
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles from the bottom
      if (particles.length < 180 && Math.random() < 0.6) {
        particles.push(spawnParticle(canvas.width, canvas.height, false));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.twinkle += p.twinkleSpeed;
        p.alpha -= p.alphaDecay;

        if (p.alpha <= 0 || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        // Twinkle pulse
        const pulse = 0.85 + 0.15 * Math.sin(p.twinkle);
        const drawAlpha = Math.min(p.alpha * pulse, 1);
        const drawRadius = p.radius * pulse;

        // Outer glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, drawRadius * 4);
        grd.addColorStop(0, `${p.color}${drawAlpha})`);
        grd.addColorStop(0.5, `${p.color}${drawAlpha * 0.4})`);
        grd.addColorStop(1, `${p.color}0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, drawRadius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.min(drawAlpha + 0.25, 1)})`;
        ctx.fill();

        // Star cross-sparkle on bigger particles
        if (p.radius > 2.0) {
          ctx.strokeStyle = `${p.color}${drawAlpha * 0.6})`;
          ctx.lineWidth = 0.6;
          const len = drawRadius * 2.8;
          ctx.beginPath();
          ctx.moveTo(p.x - len, p.y);
          ctx.lineTo(p.x + len, p.y);
          ctx.moveTo(p.x, p.y - len);
          ctx.lineTo(p.x, p.y + len);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[2]"
      aria-hidden="true"
    />
  );
}
