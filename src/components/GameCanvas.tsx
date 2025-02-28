
import React, { useEffect, useRef, useState } from 'react';
import networkManager from '@/utils/p2pNetworking';

interface GameCanvasProps {
  width: number;
  height: number;
  onScoreUpdate?: (team: 'player1' | 'player2') => void;
  onTimeUpdate?: (time: number) => void;
  dayMode?: 'day' | 'night';
  isFastMode?: boolean;
  playersPerTeam?: number;
  networkManager?: typeof networkManager;
  isHost?: boolean;
}

interface GameObject {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  speed?: number;
  id: string;
  team?: 'team1' | 'team2';
  number?: number;
  isControlled?: boolean;
  isAI?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  width, 
  height, 
  onScoreUpdate = () => {}, 
  onTimeUpdate = () => {},
  dayMode = 'day',
  isFastMode = false,
  playersPerTeam = 1,
  networkManager,
  isHost = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<GameObject[]>([]);
  const gameObjectsRef = useRef<{
    ball: GameObject;
    players: GameObject[];
  }>({
    ball: { 
      x: width / 2, 
      y: height / 2, 
      radius: 5, 
      velocityX: 0, 
      velocityY: 0,
      id: 'ball' 
    },
    players: []
  });
  
  const keysPressed = useRef<Set<string>>(new Set());
  const timeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const localPlayerId = useRef<string>(networkManager?.getLocalPlayerId() || 'local-player');
  const controlledPlayerId = useRef<string | null>(null);

  // Initialize players based on playersPerTeam
  useEffect(() => {
    const initialPlayers: GameObject[] = [];
    
    // Create players for team 1 (blue)
    for (let i = 0; i < playersPerTeam; i++) {
      const playerId = i === 0 ? localPlayerId.current : `team1-ai-${i}`;
      const isControlled = i === 0;
      
      if (isControlled) {
        controlledPlayerId.current = playerId;
      }
      
      // Position players in different formations based on team size
      let playerX = 100;
      let playerY = height / 2;
      
      if (playersPerTeam > 1) {
        if (i === 0) { // Forward
          playerX = 220;
          playerY = height / 2;
        } else if (i === 1) { // Midfielder
          playerX = 130;
          playerY = height / 2 - 80;
        } else if (i === 2) { // Defender
          playerX = 60;
          playerY = height / 2 + 80;
        }
      }
      
      initialPlayers.push({
        x: playerX,
        y: playerY,
        radius: 15,
        velocityX: 0,
        velocityY: 0,
        speed: 5,
        id: playerId,
        team: 'team1',
        number: i + 1,
        isControlled,
        isAI: !isControlled
      });
    }
    
    // Create players for team 2 (red)
    for (let i = 0; i < playersPerTeam; i++) {
      const playerId = `team2-ai-${i}`;
      
      // Position players in different formations based on team size
      let playerX = width - 100;
      let playerY = height / 2;
      
      if (playersPerTeam > 1) {
        if (i === 0) { // Forward
          playerX = width - 220;
          playerY = height / 2;
        } else if (i === 1) { // Midfielder
          playerX = width - 130;
          playerY = height / 2 + 80;
        } else if (i === 2) { // Defender
          playerX = width - 60;
          playerY = height / 2 - 80;
        }
      }
      
      initialPlayers.push({
        x: playerX,
        y: playerY,
        radius: 15,
        velocityX: 0,
        velocityY: 0,
        speed: 5,
        id: playerId,
        team: 'team2',
        number: i + 1,
        isControlled: false,
        isAI: true
      });
    }
    
    gameObjectsRef.current.players = initialPlayers;
    setPlayers(initialPlayers);
    
    // If we're using networking, set up the player join handler
    if (networkManager) {
      networkManager.onPlayerJoin((player) => {
        console.log('Player joined:', player);
        // Add the new player to our game objects
        // In a real implementation, we would add logic to handle new players properly
      });
      
      // Handle ball kick events from other players
      networkManager.onBallKick((ballState) => {
        // Update our local ball with the kicked ball state
        gameObjectsRef.current.ball.x = ballState.x;
        gameObjectsRef.current.ball.y = ballState.y;
        gameObjectsRef.current.ball.velocityX = ballState.velocityX;
        gameObjectsRef.current.ball.velocityY = ballState.velocityY;
      });
    }
  }, [playersPerTeam, height, width, networkManager]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const drawField = () => {
      // Main field (with gradient)
      const fieldGradient = ctx.createLinearGradient(0, 0, 0, height);
      
      if (dayMode === 'day') {
        // Bright green field for day mode
        fieldGradient.addColorStop(0, '#10b981');
        fieldGradient.addColorStop(1, '#059669');
      } else {
        // Darker green field for night mode
        fieldGradient.addColorStop(0, '#065f46');
        fieldGradient.addColorStop(1, '#064e3b');
      }
      
      ctx.fillStyle = fieldGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Apply brightness/contrast filter for night mode
      if (dayMode === 'night') {
        ctx.save();
        ctx.globalAlpha = 0.2; // Darken effect
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      
      // Field lines with shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 5;
      
      const lineColor = dayMode === 'day' ? '#f8fafc' : '#d1d5db';
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      
      // Border
      ctx.beginPath();
      ctx.rect(10, 10, width - 20, height - 20);
      ctx.stroke();
      
      // Center line
      ctx.beginPath();
      ctx.moveTo(width / 2, 10);
      ctx.lineTo(width / 2, height - 10);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2);
      ctx.stroke();
      
      // Center spot
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Goals (with 3D effect)
      // Left goal
      ctx.fillStyle = dayMode === 'day' ? '#0369a1' : '#0c4a6e';
      ctx.fillRect(0, height / 2 - 60, 10, 120);
      ctx.strokeRect(0, height / 2 - 60, 25, 120);
      
      // Right goal
      ctx.fillStyle = dayMode === 'day' ? '#be123c' : '#881337';
      ctx.fillRect(width - 10, height / 2 - 60, 10, 120);
      ctx.strokeRect(width - 25, height / 2 - 60, 25, 120);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Draw penalty areas
      ctx.strokeStyle = lineColor;
      
      // Left penalty area
      ctx.beginPath();
      ctx.rect(10, height / 2 - 120, 100, 240);
      ctx.stroke();
      
      // Right penalty area
      ctx.beginPath();
      ctx.rect(width - 110, height / 2 - 120, 100, 240);
      ctx.stroke();
    };

    const updatePlayerPosition = (player: GameObject, keys: string[], boundaries: { minX: number; maxX: number }) => {
      if (!player.isControlled) return;
      
      const speed = (player.speed || 5) * (isFastMode ? 1.2 : 1);
      
      if (keys.some(key => keysPressed.current.has(key))) {
        const [up, down, left, right] = keys;
        
        const prevX = player.x;
        const prevY = player.y;
        
        if (keysPressed.current.has(up)) player.y = Math.max(player.radius, player.y - speed);
        if (keysPressed.current.has(down)) player.y = Math.min(height - player.radius, player.y + speed);
        if (keysPressed.current.has(left)) player.x = Math.max(boundaries.minX, player.x - speed);
        if (keysPressed.current.has(right)) player.x = Math.min(boundaries.maxX, player.x + speed);
        
        // Send position update to peers if we moved
        if (networkManager && (prevX !== player.x || prevY !== player.y)) {
          // In a real implementation, we would send position updates
          // This is just a placeholder as we're focusing on the local simulation
        }
      }
    };
    
    const updateAIPlayers = () => {
      const { ball } = gameObjectsRef.current;
      const aiPlayers = gameObjectsRef.current.players.filter(p => p.isAI);
      
      aiPlayers.forEach(player => {
        // Very basic AI - move toward the ball but respect field positions
        const speed = (player.speed || 3) * (isFastMode ? 1.2 : 1) * 0.6; // AI is slower than human players
        
        // Calculate distance to ball
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const distanceToBall = Math.sqrt(dx * dx + dy * dy);
        
        // Only chase the ball if it's close or if this is a forward player
        const shouldChaseBall = distanceToBall < 150 || 
          (player.team === 'team1' && player.number === 1 && ball.x < width / 2) ||
          (player.team === 'team2' && player.number === 1 && ball.x > width / 2);
        
        if (shouldChaseBall) {
          // Move toward ball
          const angle = Math.atan2(dy, dx);
          player.x += Math.cos(angle) * speed;
          player.y += Math.sin(angle) * speed;
        } else {
          // Return to default position based on role
          let targetX = player.team === 'team1' ? 100 : width - 100;
          let targetY = height / 2;
          
          if (playersPerTeam > 1) {
            if (player.number === 1) { // Forward
              targetX = player.team === 'team1' ? 220 : width - 220;
              targetY = height / 2;
            } else if (player.number === 2) { // Midfielder
              targetX = player.team === 'team1' ? 130 : width - 130;
              targetY = player.team === 'team1' ? height / 2 - 80 : height / 2 + 80;
            } else if (player.number === 3) { // Defender
              targetX = player.team === 'team1' ? 60 : width - 60;
              targetY = player.team === 'team1' ? height / 2 + 80 : height / 2 - 80;
            }
          }
          
          // Move toward default position
          const tdx = targetX - player.x;
          const tdy = targetY - player.y;
          const distance = Math.sqrt(tdx * tdx + tdy * tdy);
          
          if (distance > 5) {
            const angle = Math.atan2(tdy, tdx);
            player.x += Math.cos(angle) * speed * 0.5;
            player.y += Math.sin(angle) * speed * 0.5;
          }
        }
        
        // Ensure player stays in bounds
        player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
        
        // Respect team sides (optional)
        if (player.team === 'team1') {
          player.x = Math.min(width / 2 + 50, player.x); // Team 1 stays mostly on left side
        } else {
          player.x = Math.max(width / 2 - 50, player.x); // Team 2 stays mostly on right side
        }
      });
    };

    const updateBallPhysics = () => {
      const ball = gameObjectsRef.current.ball;
      const players = gameObjectsRef.current.players;

      // Apply reduced friction for faster movement
      ball.velocityX *= isFastMode ? 0.99 : 0.98; // Less friction in fast mode
      ball.velocityY *= isFastMode ? 0.99 : 0.98;

      // Update ball position with speed based on game mode
      const speedMultiplier = isFastMode ? 1.5 : 1.0;
      ball.x += ball.velocityX * speedMultiplier;
      ball.y += ball.velocityY * speedMultiplier;

      // Ball collision with walls - more bounce in fast mode
      if (ball.y <= ball.radius || ball.y >= height - ball.radius) {
        ball.velocityY *= isFastMode ? -0.9 : -0.8; // More bounce in fast mode
        ball.y = ball.y <= ball.radius ? ball.radius : height - ball.radius;
      }

      // Ball collision with players
      players.forEach(player => {
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + ball.radius) {
          // Calculate collision angle
          const angle = Math.atan2(dy, dx);
          const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
          
          // Apply new velocity to ball with increased speed in fast mode
          const kickBoost = isFastMode ? 8 : 5;
          const newVelocityX = Math.cos(angle) * (speed + kickBoost);
          const newVelocityY = Math.sin(angle) * (speed + kickBoost);
          
          ball.velocityX = newVelocityX;
          ball.velocityY = newVelocityY;

          // Move ball outside of collision
          const overlap = (player.radius + ball.radius) - distance;
          ball.x += Math.cos(angle) * overlap;
          ball.y += Math.sin(angle) * overlap;
          
          // Broadcast ball kick if this is the local player and we're using networking
          if (networkManager && player.id === localPlayerId.current) {
            networkManager.broadcastBallKick({
              x: ball.x,
              y: ball.y,
              velocityX: newVelocityX,
              velocityY: newVelocityY
            });
          }
        }
      });

      // Check for goals
      if (ball.x <= 25 && ball.y >= height / 2 - 60 && ball.y <= height / 2 + 60) {
        // Goal for team 2!
        onScoreUpdate('player2');
        resetBall();
        
        // If we're the host and using networking, broadcast the goal
        if (isHost && networkManager) {
          networkManager.broadcastGoalScored('team2');
        }
      } else if (ball.x >= width - 25 && ball.y >= height / 2 - 60 && ball.y <= height / 2 + 60) {
        // Goal for team 1!
        onScoreUpdate('player1');
        resetBall();
        
        // If we're the host and using networking, broadcast the goal
        if (isHost && networkManager) {
          networkManager.broadcastGoalScored('team1');
        }
      }

      // Keep ball in bounds (except for goals) with more bounce in fast mode
      const bounceEnergy = isFastMode ? -0.9 : -0.8;
      if (ball.x <= ball.radius && (ball.y < height / 2 - 60 || ball.y > height / 2 + 60)) {
        ball.velocityX *= bounceEnergy;
        ball.x = ball.radius;
      } else if (ball.x >= width - ball.radius && (ball.y < height / 2 - 60 || ball.y > height / 2 + 60)) {
        ball.velocityX *= bounceEnergy;
        ball.x = width - ball.radius;
      }
    };

    const resetBall = () => {
      const ball = gameObjectsRef.current.ball;
      ball.x = width / 2;
      ball.y = height / 2;
      
      // Give the ball a random initial direction when reset
      const angle = Math.random() * Math.PI * 2;
      const initialSpeed = isFastMode ? 4 : 3; // Faster initial speed in fast mode
      ball.velocityX = Math.cos(angle) * initialSpeed;
      ball.velocityY = Math.sin(angle) * initialSpeed;
    };

    // Kick off the ball with an initial random speed when the game starts
    const kickOffBall = () => {
      const ball = gameObjectsRef.current.ball;
      if (ball.velocityX === 0 && ball.velocityY === 0) {
        const angle = Math.random() * Math.PI * 2;
        const initialSpeed = isFastMode ? 4 : 3;
        ball.velocityX = Math.cos(angle) * initialSpeed;
        ball.velocityY = Math.sin(angle) * initialSpeed;
      }
    };

    // Call kickOffBall after a short delay to start the game
    setTimeout(kickOffBall, 1000);

    let lastTimestamp = 0;
    const GAME_SECOND = 1000; // 1 second in ms
    let timeAccumulator = 0;

    const gameLoop = (timestamp: number) => {
      // Calculate delta time
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Update game time
      timeAccumulator += deltaTime;
      if (timeAccumulator >= GAME_SECOND) {
        timeRef.current += 1;
        onTimeUpdate(timeRef.current);
        timeAccumulator -= GAME_SECOND;
      }

      // Find controlled player
      const controlledPlayer = gameObjectsRef.current.players.find(p => p.isControlled);
      
      if (controlledPlayer) {
        // Update controlled player position based on keys pressed
        updatePlayerPosition(
          controlledPlayer,
          ['w', 's', 'a', 'd'],
          { 
            minX: controlledPlayer.radius, 
            maxX: controlledPlayer.team === 'team1' 
              ? width / 2 + 50 // Team 1 players can go slightly into opponent's half
              : width - controlledPlayer.radius 
          }
        );
      }
      
      // Update AI players
      updateAIPlayers();

      // Update ball physics
      updateBallPhysics();

      // Sync game state via network if needed
      if (networkManager && isHost && timeRef.current % 2 === 0) {
        // Convert our game objects to the network format
        const networkPlayers = gameObjectsRef.current.players.map(player => ({
          id: player.id,
          x: player.x,
          y: player.y,
          team: player.team as 'team1' | 'team2',
          number: player.number || 1
        }));
        
        const { ball } = gameObjectsRef.current;
        
        networkManager.broadcastGameState({
          players: networkPlayers,
          ball: {
            x: ball.x,
            y: ball.y,
            velocityX: ball.velocityX,
            velocityY: ball.velocityY
          },
          score: {
            team1: 0, // You would track this separately
            team2: 0,
          },
          timestamp: Date.now()
        });
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw field
      drawField();

      // Draw ball with shadow for 3D effect
      const { ball } = gameObjectsRef.current;
      
      // Adjust shadow for day/night mode
      ctx.shadowColor = dayMode === 'day' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = dayMode === 'day' ? 10 : 15;
      ctx.shadowOffsetY = 5;
      
      // Ball gradient adjusted for day/night
      const ballGradient = ctx.createRadialGradient(
        ball.x - 2, ball.y - 2, 0,
        ball.x, ball.y, ball.radius
      );
      
      if (dayMode === 'day') {
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(1, '#f1f5f9');
      } else {
        ballGradient.addColorStop(0, '#f1f5f9');
        ballGradient.addColorStop(1, '#e2e8f0');
      }
      
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Add motion blur effect for fast ball
      if (Math.abs(ball.velocityX) > 3 || Math.abs(ball.velocityY) > 3) {
        const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
        const blurFactor = Math.min(5, speed / 3);
        
        for (let i = 1; i <= blurFactor; i++) {
          const alpha = 0.3 * (1 - i / blurFactor);
          const blurColor = dayMode === 'day' ? `rgba(255, 255, 255, ${alpha})` : `rgba(241, 245, 249, ${alpha})`;
          ctx.fillStyle = blurColor;
          ctx.beginPath();
          ctx.arc(
            ball.x - (ball.velocityX * i * 0.15),
            ball.y - (ball.velocityY * i * 0.15),
            ball.radius * (1 - i * 0.05),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Draw players
      gameObjectsRef.current.players.forEach(player => {
        // Determine player gradient colors based on team and day/night mode
        const playerGradient = ctx.createRadialGradient(
          player.x, player.y, 0,
          player.x, player.y, player.radius * 1.2
        );
        
        if (player.team === 'team1') {
          // Blue team
          if (dayMode === 'day') {
            playerGradient.addColorStop(0, '#3b82f6');
            playerGradient.addColorStop(0.7, '#2563eb');
            playerGradient.addColorStop(1, '#1d4ed8');
            ctx.shadowColor = 'rgba(37, 99, 235, 0.5)';
          } else {
            playerGradient.addColorStop(0, '#2563eb');
            playerGradient.addColorStop(0.7, '#1d4ed8');
            playerGradient.addColorStop(1, '#1e40af');
            ctx.shadowColor = 'rgba(30, 64, 175, 0.6)';
          }
        } else {
          // Red team
          if (dayMode === 'day') {
            playerGradient.addColorStop(0, '#ef4444');
            playerGradient.addColorStop(0.7, '#dc2626');
            playerGradient.addColorStop(1, '#b91c1c');
            ctx.shadowColor = 'rgba(220, 38, 38, 0.5)';
          } else {
            playerGradient.addColorStop(0, '#dc2626');
            playerGradient.addColorStop(0.7, '#b91c1c');
            playerGradient.addColorStop(1, '#991b1b');
            ctx.shadowColor = 'rgba(153, 27, 27, 0.6)';
          }
        }
        
        // Add glow effect for the player being controlled
        if (player.isControlled) {
          ctx.shadowBlur = 20;
        } else {
          ctx.shadowBlur = 15;
        }
        
        // Draw player
        ctx.fillStyle = playerGradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player number
        ctx.fillStyle = 'white';
        ctx.font = `${player.isControlled ? 'bold ' : ''}10px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.number?.toString() || '1', player.x, player.y);
      });

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Night mode overlay
      if (dayMode === 'night') {
        // Add stadium lights effect
        const lightGradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, width / 1.5
        );
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
        lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, width, height);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [width, height, onScoreUpdate, onTimeUpdate, dayMode, isFastMode, playersPerTeam, networkManager, isHost]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`border ${dayMode === 'day' ? 'border-slate-300' : 'border-slate-700'} rounded-xl shadow-2xl`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className={`absolute top-4 left-4 ${
        dayMode === 'day' 
          ? 'bg-blue-700/90 text-blue-100' 
          : 'bg-slate-800/90 text-blue-300'
      } px-3 py-1 rounded text-sm`}>
        WASD to move
      </div>
      {isFastMode && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-600/90 text-amber-100 px-3 py-1 rounded text-sm">
          Fast Mode
        </div>
      )}
      {playersPerTeam > 1 && (
        <div className={`absolute top-4 right-4 ${
          dayMode === 'day' 
            ? 'bg-slate-700/90 text-slate-100' 
            : 'bg-slate-800/90 text-slate-300'
        } px-3 py-1 rounded text-sm`}>
          {playersPerTeam}v{playersPerTeam} Match
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
