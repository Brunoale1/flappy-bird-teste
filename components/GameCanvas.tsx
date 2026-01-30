import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Pipe } from '../types';
import { CONFIG, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Mutable game state stored in refs to avoid closure staleness in the game loop
  const birdY = useRef(GAME_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frameCount = useRef(0);
  const animationFrameId = useRef<number>(0);
  
  // Load high score on mount
  useEffect(() => {
    const saved = localStorage.getItem('flappyHighScore');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  const resetGame = () => {
    birdY.current = GAME_HEIGHT / 2;
    birdVelocity.current = 0;
    pipes.current = [];
    frameCount.current = 0;
    setScore(0);
    setGameState(GameState.START);
  };

  const jump = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      birdVelocity.current = CONFIG.jumpStrength;
    } else if (gameState === GameState.START) {
      setGameState(GameState.PLAYING);
      birdVelocity.current = CONFIG.jumpStrength;
    } else if (gameState === GameState.GAME_OVER) {
      resetGame();
    }
  }, [gameState]);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
    // Prevent default behavior to stop double firing or scrolling
    // e.preventDefault(); 
    jump();
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); // Prevent scrolling
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    // We set the display size via CSS, but the internal buffer needs to match
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      // 1. Update Physics
      if (gameState === GameState.PLAYING) {
        // Bird Physics
        birdVelocity.current += CONFIG.gravity;
        birdY.current += birdVelocity.current;

        // Pipe Spawning
        if (frameCount.current % CONFIG.pipeSpawnRate === 0) {
          const minPipeHeight = 50;
          const maxPipeHeight = GAME_HEIGHT - CONFIG.pipeGap - minPipeHeight - 100; // -100 for ground buffer
          const randomHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
          
          pipes.current.push({
            x: GAME_WIDTH,
            topHeight: randomHeight,
            passed: false
          });
        }

        // Pipe Movement & Collision
        pipes.current.forEach(pipe => {
          pipe.x -= CONFIG.pipeSpeed;

          // Collision Detection
          // Bird box
          const birdLeft = GAME_WIDTH / 2 - CONFIG.birdRadius;
          const birdRight = GAME_WIDTH / 2 + CONFIG.birdRadius;
          const birdTop = birdY.current - CONFIG.birdRadius;
          const birdBottom = birdY.current + CONFIG.birdRadius;

          // Pipe box
          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + 50; // Pipe width fixed at 50
          
          const hitTopPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdTop < pipe.topHeight;
          const hitBottomPipe = birdRight > pipeLeft && birdLeft < pipeRight && birdBottom > (pipe.topHeight + CONFIG.pipeGap);

          if (hitTopPipe || hitBottomPipe) {
            endGame();
          }

          // Score update
          if (!pipe.passed && birdLeft > pipeRight) {
            pipe.passed = true;
            setScore(prev => prev + 1);
          }
        });

        // Cleanup off-screen pipes
        if (pipes.current.length > 0 && pipes.current[0].x < -60) {
          pipes.current.shift();
        }

        // Ground/Ceiling Collision
        if (birdY.current + CONFIG.birdRadius >= GAME_HEIGHT - 20 || birdY.current - CONFIG.birdRadius <= 0) {
          endGame();
        }

        frameCount.current++;
      } else if (gameState === GameState.START) {
        // Bobbing animation
        birdY.current = GAME_HEIGHT / 2 + Math.sin(Date.now() / 300) * 10;
      }

      // 2. Draw
      draw(ctx);

      animationFrameId.current = requestAnimationFrame(render);
    };

    const endGame = () => {
      setGameState(GameState.GAME_OVER);
      setHighScore(prev => {
        const newHigh = Math.max(prev, score);
        localStorage.setItem('flappyHighScore', newHigh.toString());
        return newHigh;
      });
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      // Clear
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Sky Background
      ctx.fillStyle = COLORS.sky;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Pipes
      pipes.current.forEach(pipe => {
        ctx.fillStyle = COLORS.pipe;
        ctx.strokeStyle = COLORS.pipeBorder;
        ctx.lineWidth = 2;

        // Top Pipe
        ctx.fillRect(pipe.x, 0, 50, pipe.topHeight);
        ctx.strokeRect(pipe.x, -2, 50, pipe.topHeight + 2); // -2 to hide top border
        // Cap
        ctx.fillRect(pipe.x - 2, pipe.topHeight - 20, 54, 20);
        ctx.strokeRect(pipe.x - 2, pipe.topHeight - 20, 54, 20);

        // Bottom Pipe
        const bottomPipeY = pipe.topHeight + CONFIG.pipeGap;
        const bottomPipeHeight = GAME_HEIGHT - bottomPipeY;
        ctx.fillRect(pipe.x, bottomPipeY, 50, bottomPipeHeight);
        ctx.strokeRect(pipe.x, bottomPipeY, 50, bottomPipeHeight + 2);
        // Cap
        ctx.fillRect(pipe.x - 2, bottomPipeY, 54, 20);
        ctx.strokeRect(pipe.x - 2, bottomPipeY, 54, 20);
      });

      // Ground
      const groundHeight = 20;
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(0, GAME_HEIGHT - groundHeight, GAME_WIDTH, groundHeight);
      ctx.beginPath();
      ctx.moveTo(0, GAME_HEIGHT - groundHeight);
      ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - groundHeight);
      ctx.strokeStyle = COLORS.groundBorder;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Bird
      ctx.save();
      ctx.translate(GAME_WIDTH / 2, birdY.current);
      // Rotation
      const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdVelocity.current * 0.1)));
      if (gameState === GameState.START) ctx.rotate(0);
      else ctx.rotate(rotation);

      // Body
      ctx.fillStyle = COLORS.bird;
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.birdRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(8, -6, 2, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#fcf2c4';
      ctx.beginPath();
      ctx.ellipse(-6, 4, 8, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Beak
      ctx.fillStyle = '#e86101';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(16, 6);
      ctx.lineTo(8, 10);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // Start loop
    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameState, score]); // Re-bind if game state changes significantly, though refs handle physics

  return (
    <div 
      className="relative w-full max-w-md mx-auto h-[600px] overflow-hidden select-none shadow-2xl rounded-xl border-4 border-gray-800 bg-black"
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        className="block cursor-pointer"
      />

      {/* UI Overlay */}
      <div className="absolute top-8 left-0 w-full text-center pointer-events-none z-10">
        <span className="text-5xl font-bold text-white tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          {score}
        </span>
      </div>

      {gameState === GameState.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 pointer-events-none">
          <h1 className="text-4xl text-white mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] text-[#f4ce42] font-bold animate-bounce">
            FLAPPY REACT
          </h1>
          <p className="text-xl text-white drop-shadow-md bg-black/50 px-4 py-2 rounded">
            Toque ou Espaço para começar
          </p>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-20 overflow-hidden flex flex-col justify-between">
          
          {/* Background Image Layer */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url('https://scontent.fcau12-1.fna.fbcdn.net/v/t39.30808-6/623365914_122113835997148617_7157475870769065823_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=127cfc&_nc_ohc=pQQKlBiXTmoQ7kNvwF6SahL&_nc_oc=AdktbY2yV0L3CUkFtoD6py1zNcwTuydW4qfeQsQGM-qviJxDvptW8N5vZ5oZJzRPnJj6GDIlv-lf9WBMjhVJGCnW&_nc_zt=23&_nc_ht=scontent.fcau12-1.fna&_nc_gid=5vvC8XfUtqBnvnhM9rS0Qw&oh=00_AfqZIDV6Uj2SUun_F5cv4jzwrtdNPMmjRWOEigMyXuSR2w&oe=69828FB0')` 
            }}
          />

          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

          {/* Top Content: Game Over & Score */}
          <div className="relative z-10 pt-10 px-6 flex flex-col items-center animate-in fade-in slide-in-from-top duration-500">
            <h2 className="text-5xl text-[#e86101] font-bold mb-4 drop-shadow-[3px_3px_0_#fff]">
              GAME OVER
            </h2>
            
            <div className="flex gap-8 mt-2 bg-black/40 p-3 rounded-xl backdrop-blur-sm border border-white/20">
              <div className="flex flex-col items-center">
                <span className="text-[#f4ce42] text-lg font-bold drop-shadow-sm tracking-wider">SCORE</span>
                <span className="text-4xl text-white font-bold drop-shadow-md">{score}</span>
              </div>
              <div className="w-px bg-white/30"></div>
              <div className="flex flex-col items-center">
                <span className="text-[#f4ce42] text-lg font-bold drop-shadow-sm tracking-wider">BEST</span>
                <span className="text-4xl text-white font-bold drop-shadow-md">{Math.max(score, highScore)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Content: Button */}
          <div className="relative z-10 pb-8 px-6 animate-in fade-in slide-in-from-bottom duration-500">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                resetGame();
              }}
              className="w-full bg-[#4ec0ca] hover:bg-[#3da0a9] text-white font-bold py-4 rounded-xl border-b-4 border-[#2c8690] active:border-b-0 active:translate-y-1 transition-all text-2xl shadow-xl uppercase tracking-wider"
            >
              JOGAR NOVAMENTE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;