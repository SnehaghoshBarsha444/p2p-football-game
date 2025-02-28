
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';

type Player = {
  id: string;
  x: number;
  y: number;
  team: 'team1' | 'team2';
  number: number;
  name?: string; // Add name property
};

type GameState = {
  players: Player[];
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  score: {
    team1: number;
    team2: number;
  };
  timestamp: number;
};

type MessageTypes = 'game-state' | 'player-join' | 'player-leave' | 'kick-ball' | 'goal-scored';

type Message = {
  type: MessageTypes;
  data: any;
  senderId: string;
  timestamp: number;
};

// Create a class to handle P2P connections and game state syncing
class P2PNetworkManager {
  private peers: Map<string, Peer.Instance> = new Map();
  private localPlayerId: string = uuidv4();
  private roomId: string | null = null;
  private isHost: boolean = false;
  private gameStateListeners: ((state: GameState) => void)[] = [];
  private playerJoinListeners: ((player: Player) => void)[] = [];
  private playerLeaveListeners: ((playerId: string) => void)[] = [];
  private ballKickListeners: ((ballState: { x: number, y: number, velocityX: number, velocityY: number }) => void)[] = [];
  private goalScoredListeners: ((team: 'team1' | 'team2') => void)[] = [];
  private connectedPlayers: Player[] = []; // Track connected players
  private localPlayerName: string = "You"; // Default local player name
  
  private lastGameState: GameState | null = null;
  
  constructor() {
    // Generate a unique ID for this peer
    console.log('P2P Network Manager initialized with ID:', this.localPlayerId);
    
    // Listen for unload to clean up peers
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }
  
  // Set the local player name
  public setLocalPlayerName(name: string): void {
    this.localPlayerName = name;
  }

  // Get the local player name
  public getLocalPlayerName(): string {
    return this.localPlayerName;
  }
  
  // Get the list of connected players
  public getConnectedPlayers(): Player[] {
    return this.connectedPlayers;
  }
  
  // Create a new game room (become the host)
  public hostGame(): string {
    this.isHost = true;
    this.roomId = uuidv4().substring(0, 8);
    console.log('Hosting game with room ID:', this.roomId);
    
    // Add yourself as the first player
    this.connectedPlayers = [{
      id: this.localPlayerId,
      x: 100,
      y: 100,
      team: 'team1',
      number: 1,
      name: this.localPlayerName
    }];
    
    return this.roomId;
  }
  
  // Connect to a host
  public async joinGame(roomId: string): Promise<boolean> {
    if (this.peers.size > 0) {
      console.warn('Already connected to peers. Disconnect first.');
      return false;
    }
    
    try {
      this.isHost = false;
      this.roomId = roomId;
      
      // In a real implementation, we would use a signaling server to exchange connection data
      // Since we're simulating P2P in the browser, we'll create a mock connection
      
      console.log('Joined game with room ID:', roomId);
      this.simulateConnection();
      
      return true;
    } catch (error) {
      console.error('Failed to join game:', error);
      return false;
    }
  }
  
  // Disconnect from all peers
  public disconnect(): void {
    this.peers.forEach(peer => {
      try {
        peer.destroy();
      } catch (e) {
        console.error('Error destroying peer:', e);
      }
    });
    
    this.peers.clear();
    this.isHost = false;
    this.roomId = null;
    this.connectedPlayers = [];
    console.log('Disconnected from all peers');
  }
  
  // Send game state to all connected peers
  public broadcastGameState(state: GameState): void {
    this.lastGameState = state;
    
    const message: Message = {
      type: 'game-state',
      data: state,
      senderId: this.localPlayerId,
      timestamp: Date.now()
    };
    
    this.broadcastMessage(message);
  }
  
  // Broadcast that a player has kicked the ball
  public broadcastBallKick(ballState: { x: number, y: number, velocityX: number, velocityY: number }): void {
    const message: Message = {
      type: 'kick-ball',
      data: ballState,
      senderId: this.localPlayerId,
      timestamp: Date.now()
    };
    
    this.broadcastMessage(message);
  }
  
  // Broadcast that a goal has been scored
  public broadcastGoalScored(team: 'team1' | 'team2'): void {
    const message: Message = {
      type: 'goal-scored',
      data: { team },
      senderId: this.localPlayerId,
      timestamp: Date.now()
    };
    
    this.broadcastMessage(message);
  }
  
  // Add a listener for game state updates
  public onGameState(callback: (state: GameState) => void): void {
    this.gameStateListeners.push(callback);
  }
  
  // Add a listener for player joins
  public onPlayerJoin(callback: (player: Player) => void): void {
    this.playerJoinListeners.push(callback);
  }
  
  // Add a listener for player leaves
  public onPlayerLeave(callback: (playerId: string) => void): void {
    this.playerLeaveListeners.push(callback);
  }
  
  // Add a listener for ball kicks
  public onBallKick(callback: (ballState: { x: number, y: number, velocityX: number, velocityY: number }) => void): void {
    this.ballKickListeners.push(callback);
  }
  
  // Add a listener for goals scored
  public onGoalScored(callback: (team: 'team1' | 'team2') => void): void {
    this.goalScoredListeners.push(callback);
  }
  
  // Get the local player ID
  public getLocalPlayerId(): string {
    return this.localPlayerId;
  }
  
  // Check if this peer is the host
  public isGameHost(): boolean {
    return this.isHost;
  }
  
  // Get the room ID
  public getRoomId(): string | null {
    return this.roomId;
  }
  
  // Get the number of connected peers
  public getPeerCount(): number {
    return this.peers.size;
  }
  
  // Get the last known game state
  public getLastGameState(): GameState | null {
    return this.lastGameState;
  }
  
  // Simulate a peer connection (for demonstration purposes)
  private simulateConnection(): void {
    // Generate a mock peer ID
    const mockPeerId = uuidv4();
    
    // Create a fake peer connection
    const mockPeer = {
      id: mockPeerId,
      send: (data: any) => {
        console.log('Sending data to mock peer:', data);
        // Simulate network delay
        setTimeout(() => {
          this.handleIncomingMessage(data, mockPeerId);
        }, 50 + Math.random() * 50);
      },
      on: (event: string, callback: any) => {
        console.log(`Registered listener for ${event} event`);
      },
      destroy: () => {
        console.log('Mock peer destroyed');
      }
    } as unknown as Peer.Instance;
    
    this.peers.set(mockPeerId, mockPeer);
    
    console.log('Connected to mock peer:', mockPeerId);
    
    // Simulate player join
    const mockPlayer: Player = {
      id: mockPeerId,
      x: 300,
      y: 200,
      team: 'team2',
      number: 1,
      name: "Player 2" // Add a name for the mock player
    };
    
    // Add to connected players
    this.connectedPlayers.push(mockPlayer);
    
    setTimeout(() => {
      this.playerJoinListeners.forEach(listener => listener(mockPlayer));
    }, 1000);
    
    // Also create a few more simulated players
    setTimeout(() => {
      const player3: Player = {
        id: uuidv4(),
        x: 150,
        y: 300,
        team: 'team1',
        number: 2,
        name: "Player 3"
      };
      
      this.connectedPlayers.push(player3);
      this.playerJoinListeners.forEach(listener => listener(player3));
    }, 2000);
    
    // If we're not the host, send a join message
    if (!this.isHost) {
      const joinMessage: Message = {
        type: 'player-join',
        data: {
          player: {
            id: this.localPlayerId,
            team: 'team1',
            number: 1,
            name: this.localPlayerName
          }
        },
        senderId: this.localPlayerId,
        timestamp: Date.now()
      };
      
      // Add ourselves to connected players
      this.connectedPlayers.push({
        id: this.localPlayerId,
        x: 100,
        y: 100,
        team: 'team1',
        number: 1,
        name: this.localPlayerName
      });
      
      setTimeout(() => {
        mockPeer.send(joinMessage);
      }, 500);
    }
  }
  
  // Send a message to all connected peers
  private broadcastMessage(message: Message): void {
    if (this.peers.size === 0) {
      console.warn('No peers connected. Cannot broadcast message.');
      return;
    }
    
    const messageString = JSON.stringify(message);
    
    this.peers.forEach((peer, id) => {
      try {
        peer.send(messageString);
      } catch (e) {
        console.error(`Error sending message to peer ${id}:`, e);
      }
    });
  }
  
  // Handle an incoming message from a peer
  private handleIncomingMessage(messageData: string | Message, senderId: string): void {
    try {
      const message = typeof messageData === 'string' ? JSON.parse(messageData) as Message : messageData;
      
      // console.log('Received message from peer:', senderId, message);
      
      switch (message.type) {
        case 'game-state':
          this.gameStateListeners.forEach(listener => listener(message.data));
          break;
          
        case 'player-join':
          // Update our connected players list
          if (!this.connectedPlayers.some(p => p.id === message.data.player.id)) {
            this.connectedPlayers.push(message.data.player);
          }
          this.playerJoinListeners.forEach(listener => listener(message.data.player));
          break;
          
        case 'player-leave':
          // Remove player from connected players
          this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== message.data.playerId);
          this.playerLeaveListeners.forEach(listener => listener(message.data.playerId));
          break;
          
        case 'kick-ball':
          this.ballKickListeners.forEach(listener => listener(message.data));
          break;
          
        case 'goal-scored':
          this.goalScoredListeners.forEach(listener => listener(message.data.team));
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (e) {
      console.error('Error handling incoming message:', e);
    }
  }
}

// Create a singleton instance
const networkManager = new P2PNetworkManager();

export default networkManager;
