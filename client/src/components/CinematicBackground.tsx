import { useEffect, useRef } from 'preact/hooks';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
}

export function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;
    const particles: Particle[] = [];
    const particleCount = 100;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      color: Math.random() > 0.5 ? '#007aff' : '#f0c040',
      opacity: Math.random() * 0.5 + 0.1,
    });

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(1, '#020205');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw Pixel Grid Overlay (Very subtle)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pixel-like square particles
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size * 2, p.size * 2);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // Scanline effect
      const scanlinePos = (Date.now() / 20) % height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.fillRect(0, scanlinePos, width, 2);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
