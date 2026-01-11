const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin for this demo
    methods: ["GET", "POST"]
  }
});

// --- GAME LOGIC UTILS (Inlined for standalone server) ---
const COLORS = ['red', 'blue', 'green', 'yellow'];

const createDeck = () => {
  const deck = [];
  COLORS.forEach(color => {
    deck.push({ id: uuidv4(), color, value: '0' });
    const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    values.forEach(value => {
      deck.push({ id: uuidv4(), color, value });
      deck.push({ id: uuidv4(), color, value });
    });
  });
  for (let i = 0; i < 4; i++) {
    deck.push({ id: uuidv4(), color: 'black', value: 'wild' });
    deck.push({ id: uuidv4(), color: 'black', value: 'wild4' });
  }
  return shuffleDeck(deck);
};

const shuffleDeck = (deck) => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

const isValidMove = (card, topCard, activeColor) => {
  if (card.color === 'black') return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
};

// --- STATE MANAGEMENT ---
const rooms = {}; // { roomId: { players, deck, discardPile, ... } }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ playerName }) => {
    const roomId = Math.random().toString(36).substring(7).toUpperCase();
    const player = { id: socket.id, name: playerName, cardCount: 0, hand: [], isBot: false };
    
    rooms[roomId] = {
      roomId,
      status: 'LOBBY',
      players: [player],
      currentPlayerIndex: 0,
      direction: 1,
      discardPile: [],
      drawPile: [],
      currentColor: 'red',
      winner: null,
      waitingForColorSelection: false
    };

    socket.join(roomId);
    socket.emit('room_joined', { roomId, playerId: socket.id });
    io.to(roomId).emit('game_state_update', getPublicState(rooms[roomId]));
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (rooms[roomId].status !== 'LOBBY') {
        socket.emit('error', 'Game already started');
        return;
    }

    const player = { id: socket.id, name: playerName, cardCount: 0, hand: [], isBot: false };
    rooms[roomId].players.push(player);
    
    socket.join(roomId);
    socket.emit('room_joined', { roomId, playerId: socket.id });
    io.to(roomId).emit('game_state_update', getPublicState(rooms[roomId]));
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.drawPile = createDeck();
    
    // Deal 7 cards
    room.players.forEach(p => {
      p.hand = room.drawPile.splice(0, 7);
      p.cardCount = 7;
    });

    // Flip first card
    let firstCard = room.drawPile.shift();
    while(firstCard.color === 'black') {
        room.drawPile.push(firstCard);
        firstCard = room.drawPile.shift();
    }
    room.discardPile = [firstCard];
    room.currentColor = firstCard.color;
    room.status = 'PLAYING';

    io.to(roomId).emit('game_state_update', getPublicState(room));
    
    // Send private hands
    room.players.forEach(p => {
        io.to(p.id).emit('hand_update', p.hand);
    });
  });

  socket.on('play_card', ({ roomId, cardId, selectedColor }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== room.currentPlayerIndex) return; // Not your turn

    const player = room.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];

    if (!isValidMove(card, topCard, room.currentColor)) return;

    // Logic for playing card
    player.hand.splice(cardIndex, 1);
    player.cardCount = player.hand.length;
    room.discardPile.push(card);

    // Check Win
    if (player.hand.length === 0) {
        room.status = 'GAME_OVER';
        room.winner = player;
        io.to(roomId).emit('game_state_update', getPublicState(room));
        return;
    }

    // Process Card Effects
    let nextIndex = (room.currentPlayerIndex + room.direction) % room.players.length;
    if (nextIndex < 0) nextIndex += room.players.length;

    let nextColor = card.color;
    if (card.color === 'black') {
        nextColor = selectedColor || 'red'; // Should validate selectedColor
    }

    let skipTurn = false;
    let cardsToDraw = 0;

    if (card.value === 'skip') skipTurn = true;
    if (card.value === 'reverse') {
        if (room.players.length === 2) {
            skipTurn = true;
        } else {
            room.direction *= -1;
            nextIndex = (room.currentPlayerIndex + room.direction) % room.players.length;
            if (nextIndex < 0) nextIndex += room.players.length;
        }
    }
    if (card.value === 'draw2') cardsToDraw = 2;
    if (card.value === 'wild4') cardsToDraw = 4;

    room.currentColor = nextColor;

    // Handle Draw Effects on Next Player
    if (cardsToDraw > 0) {
        // Simple logic: Next player draws and loses turn
        // Refill deck if needed
        for(let i=0; i<cardsToDraw; i++) {
             if (room.drawPile.length === 0) recycleDeck(room);
             if (room.drawPile.length > 0) {
                 const nextPlayer = room.players[nextIndex];
                 nextPlayer.hand.push(room.drawPile.shift());
                 nextPlayer.cardCount = nextPlayer.hand.length;
                 io.to(nextPlayer.id).emit('hand_update', nextPlayer.hand);
             }
        }
        // Skip next player
        nextIndex = (nextIndex + room.direction) % room.players.length;
        if (nextIndex < 0) nextIndex += room.players.length;
    } else if (skipTurn) {
        nextIndex = (nextIndex + room.direction) % room.players.length;
        if (nextIndex < 0) nextIndex += room.players.length;
    }

    room.currentPlayerIndex = nextIndex;
    
    // Broadcast
    io.to(roomId).emit('game_state_update', getPublicState(room));
    io.to(socket.id).emit('hand_update', player.hand);
  });

  socket.on('draw_card', ({ roomId }) => {
     const room = rooms[roomId];
     if (!room) return;
     if (room.players[room.currentPlayerIndex].id !== socket.id) return;

     if (room.drawPile.length === 0) recycleDeck(room);
     
     if (room.drawPile.length > 0) {
         const card = room.drawPile.shift();
         const player = room.players[room.currentPlayerIndex];
         player.hand.push(card);
         player.cardCount++;
         
         io.to(socket.id).emit('hand_update', player.hand);
         
         // Simple rule: pass turn after drawing (unless we add 'play immediately' logic)
         // For now, let's keep turn to allow playing the drawn card if valid, 
         // BUT standard UNO often passes turn or allows play.
         // Let's AUTO PASS for simplicity in this server version if not playable?
         // No, let user decide or simple pass for v1
         
         let nextIndex = (room.currentPlayerIndex + room.direction) % room.players.length;
         if (nextIndex < 0) nextIndex += room.players.length;
         
         // Let's assume we pass turn for now to keep flow fast
         // room.currentPlayerIndex = nextIndex; 
         
         // Actually, let's NOT pass turn, give user 1 chance (UI handles it)
         // But to simplify the server loop, let's just emit state. User has to play or 'pass' (we need a pass action then).
         // To make it identical to old logic: we just pass turn.
         room.currentPlayerIndex = nextIndex;

         io.to(roomId).emit('game_state_update', getPublicState(room));
     }
  });

  socket.on('disconnect', () => {
    // Basic cleanup - remove player from rooms or mark as disconnected
    console.log('User disconnected', socket.id);
  });
});

function recycleDeck(room) {
    if (room.discardPile.length <= 1) return;
    const top = room.discardPile.pop();
    room.drawPile = shuffleDeck(room.discardPile);
    room.discardPile = [top];
}

function getPublicState(room) {
    // Return state without full hands of other players
    return {
        roomId: room.roomId,
        status: room.status,
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            cardCount: p.cardCount,
            isBot: p.isBot,
            hand: [] // Hide opponents hands
        })),
        currentPlayerIndex: room.currentPlayerIndex,
        direction: room.direction,
        discardPile: [room.discardPile[room.discardPile.length-1]], // Only top card
        drawPileCount: room.drawPile.length,
        currentColor: room.currentColor,
        winner: room.winner,
        waitingForColorSelection: room.waitingForColorSelection
    };
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});