
import { useState, useEffect, useRef } from 'react';
import GameCanvas from '@/components/GameCanvas';
import { Button } from "@/components/ui/button";
import { 
  Trophy, Users, Zap, Wifi, Sun, Moon, Copy, 
  UserCircle, Star, ChevronRight, Goal, Clock, Share2,
  ChevronsUp, ChevronsDown, ArrowDownToLine, Gamepad2
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import networkManager from '@/utils/p2pNetworking';
import { Input } from "@/components/ui/input";

const Index = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [dayMode, setDayMode] = useState<'day' | 'night'>('day');
  const [isFastMode, setIsFastMode] = useState(false);
  const [playersPerTeam, setPlayersPerTeam] = useState(1);
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [connectedPlayers, setConnectedPlayers] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState("Player 1");
  const { toast } = useToast();
  const playerNameSet = useRef(false);

  // Connect to network events
  useEffect(() => {
    // Set player name when it changes
    if (playerName && !playerNameSet.current) {
      networkManager.setLocalPlayerName(playerName);
      playerNameSet.current = true;
    }

    const checkPeers = setInterval(() => {
      setConnectedPeers(networkManager.getPeerCount());
      setConnectedPlayers(networkManager.getConnectedPlayers());
    }, 1000);
    
    networkManager.onGoalScored((team) => {
      handleScoreUpdate(team === 'team1' ? 'player1' : 'player2');
    });
    
    networkManager.onPlayerJoin((player) => {
      // Show a toast when a new player joins
      if (player.name && player.name !== networkManager.getLocalPlayerName()) {
        toast({
          title: "Player joined",
          description: `${player.name} joined the game.`,
          duration: 3000,
        });
      }
    });
    
    return () => {
      clearInterval(checkPeers);
    };
  }, [playerName, toast]);

  // Clean up network connections when component unmounts
  useEffect(() => {
    return () => {
      if (networkManager) {
        networkManager.disconnect();
      }
    };
  }, []);

  const handleHostGame = () => {
    if (playerName) {
      networkManager.setLocalPlayerName(playerName);
      playerNameSet.current = true;
    }
    
    const newRoomId = networkManager.hostGame();
    setRoomId(newRoomId);
    setIsHost(true);
    
    toast({
      title: "Game created!",
      description: `Share the room ID: ${newRoomId} with your friends.`,
      duration: 5000,
    });
  };

  const handleJoinGame = async () => {
    if (playerName) {
      networkManager.setLocalPlayerName(playerName);
      playerNameSet.current = true;
    }
    
    setIsJoining(true);
    
    try {
      const success = await networkManager.joinGame(roomId);
      
      if (success) {
        setIsPlaying(true);
        
        toast({
          title: "Joined game!",
          description: `Connected to room: ${roomId}`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Failed to join",
          description: "Could not connect to the game. Check the room ID and try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Connection error",
        description: "An error occurred while trying to join the game.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsJoining(false);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard",
      duration: 2000,
    });
  };

  const handleScoreUpdate = (team: 'player1' | 'player2') => {
    if (team === 'player1') {
      setPlayer1Score(prev => prev + 1);
    } else {
      setPlayer2Score(prev => prev + 1);
    }
    
    // If we're the host, broadcast the goal
    if (isHost) {
      networkManager.broadcastGoalScored(team === 'player1' ? 'team1' : 'team2');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const startLocalGame = () => {
    setIsPlaying(true);
    setIsHost(true);
    handleHostGame();
  };

  // Get team player counts
  const getTeamPlayerCounts = () => {
    const team1Count = connectedPlayers.filter(p => p.team === 'team1').length;
    const team2Count = connectedPlayers.filter(p => p.team === 'team2').length;
    return { team1Count, team2Count };
  };

  const { team1Count, team2Count } = getTeamPlayerCounts();

  // Create stadium light elements for night mode
  const renderStadiumLights = () => {
    if (dayMode !== 'night') return null;
    
    const lights = [];
    const lightCount = 8;
    
    for (let i = 0; i < lightCount; i++) {
      const leftPos = (i / (lightCount-1)) * 100;
      lights.push(
        <div 
          key={`light-${i}`} 
          className="stadium-light animate-pulse-glow"
          style={{
            left: `${leftPos}%`,
            top: 0,
            transform: `rotate(${85 + Math.random() * 10}deg)`,
            opacity: 0.3 + Math.random() * 0.4
          }}
        />
      );
    }
    
    return lights;
  };

  return (
    <div className={`min-h-screen flex flex-col items-center py-8 px-4 transition-all duration-500 relative ${
      dayMode === 'day' 
        ? 'bg-gradient-to-b from-sky-400 via-blue-300 to-sky-200' 
        : 'bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900'
    }`}>
      {/* Add stadium lights for night mode */}
      {renderStadiumLights()}
      
      {/* Stars background for night mode */}
      {dayMode === 'night' && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse-glow"
              style={{
                width: Math.random() * 3 + 'px',
                height: Math.random() * 3 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.7,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-4xl z-10 animate-fade-in relative">
        <div className="text-center mb-8">
          <h1 className={`text-6xl font-bold mb-3 drop-shadow-lg ${
            dayMode === 'day' 
              ? 'text-slate-800 game-title' 
              : 'text-white game-title-dark'
          }`}>
            <span className="inline-block animate-float">HyperPear </span>{' '}
            <span className="inline-block animate-float" style={{ animationDelay: '0.5s' }}>Strikers</span>
          </h1>
          <br/>
          <h3>P2P Real-Time Football Game</h3>
          <br/>
          <p className={`text-lg mb-6 ${
            dayMode === 'day' ? 'text-slate-700' : 'text-cyan-300'
          }`}>
            Challenge your friends to an exciting real-time football match!
          </p>
        </div>

        {!isPlaying ? (
          <div className={`p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-sm text-center border modern-card
            ${dayMode === 'day' 
                ? 'bg-white/90 border-gray-200' 
                : 'glass-morphism-dark border-slate-700'
            }`}>
            <div className="flex justify-center mb-4">
              <div className={`w-20 h-20 p-4 rounded-full ${
                dayMode === 'day' 
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600' 
                  : 'bg-gradient-to-br from-indigo-600 to-purple-700'
              } shadow-lg animate-float glow-effect`}>
                <Trophy className="w-full h-full text-white" />
              </div>
            </div>
            
            <h2 className={`text-3xl font-semibold mb-8 ${
              dayMode === 'day' ? 'text-slate-800' : 'text-white'
            }`}>Game Settings</h2>

            <div className={`p-6 rounded-xl mb-8 modern-card animate-fade-in ${
              dayMode === 'day' 
                ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900'
            }`} style={{ animationDelay: '0.1s' }}>
              <h3 className={`text-xl font-medium mb-4 flex items-center justify-center ${
                dayMode === 'day' ? 'text-slate-800' : 'text-white'
              }`}>
                <UserCircle className={`w-5 h-5 mr-2 ${
                  dayMode === 'day' ? 'text-blue-600' : 'text-blue-500'
                }`} />
                Your Name
              </h3>
              
              <div className="flex justify-center max-w-sm mx-auto">
                <Input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className={`${
                    dayMode === 'day'
                      ? 'bg-white border-slate-300 text-slate-800 shadow-sm'
                      : 'bg-slate-700 border-slate-600 text-white'
                  } focus:ring-2 focus:ring-offset-0 ${
                    dayMode === 'day' ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className={`p-6 rounded-xl modern-card animate-slide-in-left ${
                dayMode === 'day' 
                  ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-900'
              }`}>
                <h3 className={`text-xl font-medium mb-4 ${
                  dayMode === 'day' ? 'text-slate-800' : 'text-white'
                }`}>Display Mode</h3>
                
                <RadioGroup 
                  value={dayMode} 
                  onValueChange={(value: 'day' | 'night') => setDayMode(value)}
                  className="flex justify-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="day" id="day" className={dayMode === 'day' ? 'border-amber-500' : ''} />
                    <Label htmlFor="day" className="flex items-center cursor-pointer">
                      <Sun className={`w-5 h-5 mr-2 ${
                        dayMode === 'day' ? 'text-amber-500' : 'text-amber-400'
                      }`} />
                      <span className={dayMode === 'day' ? 'text-slate-800' : 'text-white'}>
                        Day
                      </span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="night" id="night" className={dayMode === 'night' ? 'border-blue-500' : ''} />
                    <Label htmlFor="night" className="flex items-center cursor-pointer">
                      <Moon className={`w-5 h-5 mr-2 ${
                        dayMode === 'day' ? 'text-slate-800' : 'text-blue-400'
                      }`} />
                      <span className={dayMode === 'day' ? 'text-slate-800' : 'text-white'}>
                        Night
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className={`p-6 rounded-xl modern-card animate-slide-in-right ${
                dayMode === 'day' 
                  ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-900'
              }`}>
                <h3 className={`text-xl font-medium mb-4 ${
                  dayMode === 'day' ? 'text-slate-800' : 'text-white'
                }`}>Game Speed</h3>
                
                <RadioGroup 
                  value={isFastMode ? 'fast' : 'normal'} 
                  onValueChange={(val) => setIsFastMode(val === 'fast')}
                  className="flex justify-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="flex items-center cursor-pointer">
                      <span className={dayMode === 'day' ? 'text-slate-800' : 'text-white'}>
                        Normal
                      </span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fast" id="fast" className={isFastMode ? 'border-amber-500' : ''} />
                    <Label htmlFor="fast" className="flex items-center cursor-pointer">
                      <Zap className={`w-5 h-5 mr-2 ${
                        dayMode === 'day' ? 'text-amber-500' : 'text-amber-400'
                      }`} />
                      <span className={dayMode === 'day' ? 'text-slate-800' : 'text-white'}>
                        Fast
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <div className={`p-6 rounded-xl mb-8 modern-card animate-fade-in ${
              dayMode === 'day' 
                ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900'
            }`} style={{ animationDelay: '0.2s' }}>
              <h3 className={`text-xl font-medium mb-4 flex items-center justify-center ${
                dayMode === 'day' ? 'text-slate-800' : 'text-white'
              }`}>
                <Users className={`w-5 h-5 mr-2 ${
                  dayMode === 'day' ? 'text-blue-600' : 'text-blue-500'
                }`} />
                Team Size
              </h3>
              
              <div className="px-8 mb-4">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center">
                    <UserCircle className={`w-4 h-4 mr-1 ${dayMode === 'day' ? 'text-slate-700' : 'text-slate-300'}`} />
                    <span className={dayMode === 'day' ? 'text-slate-700' : 'text-slate-300'}>1v1</span>
                  </div>
                  <div className="flex items-center">
                    <Users className={`w-4 h-4 mr-1 ${dayMode === 'day' ? 'text-slate-700' : 'text-slate-300'}`} />
                    <span className={dayMode === 'day' ? 'text-slate-700' : 'text-slate-300'}>3v3</span>
                  </div>
                </div>
                
                <Slider 
                  value={[playersPerTeam]} 
                  onValueChange={(values) => setPlayersPerTeam(values[0])}
                  min={1}
                  max={3}
                  step={1}
                  className={dayMode === 'day' ? 'bg-slate-200' : 'bg-slate-700'}
                />
                
                <div className="mt-4 text-center">
                  <span className={`font-medium text-lg ${dayMode === 'day' ? 'text-slate-800' : 'text-white'}`}>
                    {playersPerTeam} 
                    <span className={dayMode === 'day' ? 'text-blue-600' : 'text-blue-400'}> vs </span>
                    {playersPerTeam}
                  </span>
                  <div className={`text-xs mt-1 ${dayMode === 'day' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {playersPerTeam === 1 ? "Solo match" : 
                     playersPerTeam === 2 ? "Doubles match" : 
                     "Team match"}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-xl mb-8 modern-card animate-fade-in ${
              dayMode === 'day' 
                ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900'
            }`} style={{ animationDelay: '0.3s' }}>
              <h3 className={`text-xl font-medium mb-4 flex items-center justify-center ${
                dayMode === 'day' ? 'text-slate-800' : 'text-white'
              }`}>
                <Wifi className={`w-5 h-5 mr-2 ${
                  dayMode === 'day' ? 'text-green-600' : 'text-green-500'
                }`} />
                P2P Connection
              </h3>
              
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={handleHostGame}
                  className={`relative overflow-hidden gradient-button ${
                    dayMode === 'day'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-emerald-700 to-green-800 hover:from-emerald-800 hover:to-green-900'
                  } text-white font-medium py-2 px-4 rounded-lg`}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Host Game
                </Button>
                
                <span className={`px-2 py-1 rounded-full ${dayMode === 'day' ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-400'}`}>or</span>
                
                <div className="flex gap-2">
                  <div className={`relative overflow-hidden ${
                    dayMode === 'day' ? 'shadow-sm' : ''
                  }`}>
                    <Input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Enter room ID"
                      className={`px-3 py-2 rounded-lg ${
                        dayMode === 'day'
                          ? 'border border-slate-300 text-slate-800 bg-white'
                          : 'bg-slate-700 border-slate-600 text-white'
                      }`}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleJoinGame}
                    disabled={!roomId || isJoining}
                    className={`relative overflow-hidden gradient-button ${
                      dayMode === 'day'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                        : 'bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900'
                    } text-white font-medium py-2 px-4 rounded-lg`}
                  >
                    {isJoining ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="h-4 w-4 mr-2" />
                        Join
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {roomId && isHost && (
                <div className={`mt-6 p-3 rounded-lg text-center animate-scale-in ${
                  dayMode === 'day' 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' 
                    : 'bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600'
                }`}>
                  <p className={`font-medium ${dayMode === 'day' ? 'text-slate-800' : 'text-white'}`}>
                    Your Room ID:
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    <p className={`font-mono p-2 px-4 rounded ${
                      dayMode === 'day' 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'bg-slate-900 text-slate-100'
                    }`}>
                      {roomId}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`ml-2 h-9 w-9 p-0 rounded-full ${
                        dayMode === 'day' 
                          ? 'hover:bg-slate-200 text-slate-700' 
                          : 'hover:bg-slate-700 text-slate-200'
                      }`}
                      onClick={copyRoomId}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className={`text-sm mt-2 ${dayMode === 'day' ? 'text-slate-600' : 'text-slate-400'}`}>
                    Share this code with your friends to join your game
                  </p>
                  
                  {connectedPeers > 0 && (
                    <div className={`mt-3 py-1 px-3 rounded-full text-sm inline-flex items-center ${
                      dayMode === 'day' 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-green-900/30 text-green-400 border border-green-800/50'
                    }`}>
                      <Wifi className="h-3 w-3 mr-1" />
                      {connectedPeers} player{connectedPeers !== 1 ? 's' : ''} connected
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              onClick={startLocalGame}
              className={`relative overflow-hidden gradient-button text-white font-semibold py-4 px-10 rounded-xl transition-all text-lg shadow-lg hover:shadow-xl ${
                dayMode === 'day'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                  : 'bg-gradient-to-r from-purple-600 to-blue-700 hover:from-purple-700 hover:to-blue-800'
              }`}
            >
              <Gamepad2 className="mr-2 h-5 w-5 inline-block" />
              Start Game
              <ChevronRight className="ml-1 h-5 w-5 inline-block" />
            </Button>
          </div>
        ) : (
          <div className="game-container animate-fade-in">
            <div className={`p-5 rounded-xl shadow-lg mb-6 border-2 ${
              dayMode === 'day'
                ? 'glass-morphism border-blue-200/50'
                : 'glass-morphism-dark border-indigo-900/50'
            }`}>
              <div className="flex justify-between items-center">
                <div className={`flex items-center space-x-4 p-2 pr-5 rounded-xl ${
                  dayMode === 'day' ? 'bg-blue-500/90' : 'bg-blue-900/70'
                } animate-slide-in-left`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl
                    ${dayMode === 'day' ? 'bg-blue-600' : 'bg-blue-700'} border-4 ${
                      dayMode === 'day' ? 'border-blue-400/50' : 'border-blue-800/50'
                    }`}>
                    {player1Score}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-semibold">
                      Team Blue
                    </span>
                    <span className="text-xs text-blue-200">
                      {team1Count} Player{team1Count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <div className={`px-6 py-3 rounded-xl flex items-center justify-center ${
                  dayMode === 'day' ? 'bg-amber-100 text-amber-800' : 'bg-amber-900/20 text-amber-300'
                } animate-scale-in border ${
                  dayMode === 'day' ? 'border-amber-200' : 'border-amber-800/30'
                }`}>
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="font-mono font-semibold">
                    {formatTime(gameTime)}
                  </span>
                </div>
                
                <div className={`flex items-center space-x-4 p-2 pl-5 rounded-xl ${
                  dayMode === 'day' ? 'bg-red-500/90' : 'bg-red-900/70'
                } animate-slide-in-right`}>
                  <div className="flex flex-col items-end">
                    <span className="text-white font-semibold">
                      Team Red
                    </span>
                    <span className="text-xs text-red-200">
                      {team2Count} Player{team2Count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl
                    ${dayMode === 'day' ? 'bg-red-600' : 'bg-red-700'} border-4 ${
                      dayMode === 'day' ? 'border-red-400/50' : 'border-red-800/50'
                    }`}>
                    {player2Score}
                  </div>
                </div>
              </div>
              
              {/* Connected Players List */}
              {connectedPlayers.length > 0 && (
                <div className={`mt-4 p-3 rounded-lg ${
                  dayMode === 'day' ? 'bg-white/80' : 'bg-slate-800/50'
                }`}>
                  <div className={`text-sm flex items-center justify-center mb-2 ${
                    dayMode === 'day' ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    <Users className="h-4 w-4 mr-1" />
                    Connected Players
                  </div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {connectedPlayers.map((player) => (
                      <div 
                        key={player.id} 
                        className={`px-3 py-2 rounded-full text-sm player-tag ${
                          player.team === 'team1'
                            ? dayMode === 'day' 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                            : dayMode === 'day'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-red-900/30 text-red-300 border border-red-800/50'
                        }`}
                      >
                        <UserCircle className="h-3 w-3 inline mr-1" />
                        {player.name || 'Unknown Player'}
                        {player.id === networkManager.getLocalPlayerId() && (
                          <>
                            {" "}
                            <span className="font-medium">(You)</span>
                            <Star className="h-2.5 w-2.5 inline ml-1 text-yellow-500" />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Game controls help */}
              <div className={`mt-3 flex justify-center gap-4 text-xs animate-fade-in ${
                dayMode === 'day' ? 'text-slate-600' : 'text-slate-400'
              }`}>
                <div className="flex items-center">
                  <div className={`px-1.5 py-0.5 rounded border ${
                    dayMode === 'day' ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
                  }`}>W</div>
                  <div className={`mx-0.5 px-1.5 py-0.5 rounded border ${
                    dayMode === 'day' ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
                  }`}>A</div>
                  <div className={`px-1.5 py-0.5 rounded border ${
                    dayMode === 'day' ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
                  }`}>S</div>
                  <div className={`px-1.5 py-0.5 rounded border ${
                    dayMode === 'day' ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
                  }`}>D</div>
                  <span className="ml-2">to move</span>
                </div>
                
                {isFastMode && (
                  <div className="flex items-center">
                    <Zap className="h-3 w-3 mr-1 text-amber-500" />
                    <span>Fast Mode</span>
                  </div>
                )}
                
                <div className="flex items-center">
                  <Goal className="h-3 w-3 mr-1" />
                  <span>Score goals to win!</span>
                </div>
              </div>
            </div>
            
            <div className="relative group transition-all duration-300 gradient-border animate-fade-in">
              <div className={`absolute -inset-0.5 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-all duration-300 ${
                dayMode === 'day'
                  ? 'bg-gradient-to-r from-blue-400 to-red-400'
                  : 'bg-gradient-to-r from-blue-600 to-red-500'
              }`}></div>
              <div className="relative">
                <GameCanvas 
                  width={800} 
                  height={500} 
                  onScoreUpdate={handleScoreUpdate} 
                  onTimeUpdate={setGameTime}
                  dayMode={dayMode}
                  isFastMode={isFastMode}
                  playersPerTeam={playersPerTeam}
                  networkManager={networkManager}
                  isHost={isHost}
                />
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button 
                onClick={() => {
                  setIsPlaying(false);
                  setPlayer1Score(0);
                  setPlayer2Score(0);
                  setGameTime(0);
                  networkManager.disconnect();
                }}
                variant="outline"
                className={`px-6 py-2 flex items-center gap-2 ${
                  dayMode === 'day'
                    ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white'
                }`}
              >
                <ChevronsUp className="h-4 w-4" />
                Back to Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
