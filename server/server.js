const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Variables to store player hands and player connections
let player1Hand = null;
let player2Hand = null;
// Game state variables
let players = {}; // To track connected players
let spectators = [];
let playerCount = 0; // To track the number of players
let gameBoard = {}; // This will store the state of each slot on the game board
let currentTurn = 1;
let consecutiveSkips = 0;
let player1Points = 0;
let player2Points = 0;

class Card {
  constructor(name, points, ability, rank, effectPattern) {
      this.name = name;
      this.points = points;
      this.ability = ability;
      this.rank = rank;
      this.effectPattern = effectPattern;
  }

  applyAbility(board, row, col, playerNum) {
      switch (this.ability) {
          case 'buff':
              this.applyEffects(board, row, col, playerNum, (slot) => {
                  const points = parseInt(slot.dataset.points, 10);
                  slot.dataset.points = points + 2;
              });
              break;
          case 'destroy':
              this.applyEffects(board, row, col, playerNum, (slot) => {
                  if (slot.dataset.controlledBy !== '0') {
                      slot.innerHTML = ''; 
                      slot.dataset.points = 0;
                  }
              });
              break;
          // Other abilities...
      }
  }

  applyEffects(board, row, col, playerNum) {
    let patternP2 = this.effectPattern;
    const affectedSlots = [];

    // Reverse pattern for Player 2 (mirror the columns horizontally)
    if (playerNum === 2) {
        patternP2 = patternP2.map(([rOffset, cOffset]) => [rOffset, -cOffset]);
    }

    // Apply effects based on the effect pattern
    patternP2.forEach(([rOffset, cOffset]) => {
        const targetRow = row + rOffset;
        const targetCol = col + cOffset;
        const targetSlot = board[`slot${targetRow}-${targetCol}`];
        console.log(`Row: ${targetRow} Col: ${targetCol}`);
        console.log(`Target slot: ${targetSlot}`);


        if (targetSlot) {
            // Modify the board (example: update points or control)
            const points = parseInt(targetSlot.dataset.points, 10) + 2; // Example effect
            targetSlot.dataset.points = points;
            targetSlot.controlledBy = playerNum;

            // Add affected slot to the array
            console.log(`Slot affected by the card played is at row ${targetRow} column ${targetCol}`);
            affectedSlots.push({
                row: targetRow,
                col: targetCol,
                points: targetSlot.dataset.points,
                controlledBy: targetSlot.controlledBy,
            });
        }
    });

    // Return the affected slots array
    return affectedSlots;
}

}

// Function to reset the game
function resetGame() {
  player1Hand = null;
  player2Hand = null;
  gameBoard = {}; // Reset the board
  player1Points = 0;
  player2Points = 0;
  consecutiveSkips = 0;
  currentTurn = 1;
  
  // Notify clients to reset the game
  io.emit('game-reset', { message: 'Game has been reset. Player 1 starts!' });
  console.log("The game has been reset.");
}

// Function to calculate the winner
function calculateWinner() {
  if (player1Points > player2Points) {
      io.emit('game-over', { winner: 1, player1Points, player2Points });
  } else if (player2Points > player1Points) {
      io.emit('game-over', { winner: 2, player1Points, player2Points });
  } else {
      io.emit('game-over', { winner: 'draw', player1Points, player2Points });
  }
  resetGame(); // Reset the game after announcing the winner
}

// Function to generate a shuffled deck and deal hands
function dealHand(deck) {
  const shuffledDeck = deck.sort(() => Math.random() - 0.5);
  return shuffledDeck.slice(0, 5); // Deal the first 5 cards for the hand
}

// Your predefined deck of cards
const p1Deck = [
  { name: 'Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[0, 1], [1, 1],[-1, 1]]},
  { name: 'Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[0, 1], [1, 1],[-1, 1]]},
  { name: 'Knight', points: 5, ability: 'destroy', rank: 2, effectPattern: [[-1, 0], [-1, -1],[-1, 1]] },
  { name: 'Knight', points: 5, ability: 'destroy', rank: 2, effectPattern: [[-1, 0], [-1, -1],[-1, 1]] },
  { name: 'Bishop', points: 3, ability: 'buff', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'King', points: 4, ability: 'buff', rank: 2, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Queen', points: 4, ability: 'destroy', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Queen', points: 3, ability: 'buff', rank: 2, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Bishop', points: 5, ability: 'destroy', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Knight', points: 3, ability: 'buff', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Bishop', points: 4, ability: 'buff', rank: 4, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Rook', points: 4, ability: 'destroy', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Rook', points: 4, ability: 'buff', rank: 4, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]}
];
const p2deck = [
  { name: 'Dark Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[0, 1], [1, 1],[-1, 1]]},
  { name: 'Dark Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[0, 1], [1, 1],[-1, 1]]},
  { name: 'Dark Knight', points: 5, ability: 'destroy', rank: 2, effectPattern: [[-1, 0], [-1, -1],[-1, 1]]},
  { name: 'Dark Knight', points: 5, ability: 'destroy', rank: 2, effectPattern: [[-1, 0], [-1, -1],[-1, 1]]},
  { name: 'Dark Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[0, 1], [1, 1],[-1, 1]]},
  { name: 'Dark King', points: 4, ability: 'buff', rank: 4, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Dark Queen', points: 4, ability: 'destroy', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Dark Queen', points: 3, ability: 'buff', rank: 2, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]]},
  { name: 'Dark Rook', points: 5, ability: 'destroy', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]] },
  { name: 'Dark Bishop', points: 3, ability: 'buff', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]] },
  { name: 'Dark Knight', points: 4, ability: 'buff', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]] },
  { name: 'Dark Knight', points: 4, ability: 'destroy', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]] },
  { name: 'Dark King', points: 4, ability: 'buff', rank: 4, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]] },
  { name: 'Dark Pawn', points: 3, ability: 'buff', rank: 1, effectPattern: [[-1, 0], [0, -1],[1, 0], [0, 1]] }
];

// Serve static files from the "client" directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});


// Function to switch turns
function switchTurn() {
  currentTurn = currentTurn === 1 ? 2 : 1;
  drawCard(currentTurn);
  io.emit('turn-update', { currentTurn });  // Notify clients about the new turn
}

function drawCard(playerNum) {
  let drawnCard;
  if (playerNum === 1 && p1Deck.length > 0) {
      drawnCard = p1Deck.shift(); // Draw the top card from Player 1's deck
      console.log(`A card is being added to Player ${currentTurn}'s hand. It is ${drawnCard.name}`);
      player1Hand.push(drawnCard);     // Add it to Player 1's hand
  } else if (playerNum === 2 && p2deck.length > 0) {
      drawnCard = p2deck.shift(); // Draw the top card from Player 2's deck
      player2Hand.push(drawnCard);     // Add it to Player 2's hand
  }

  // Notify the player about the new card
  io.emit('hand-updated', {
      playerNum,
      updatedHand: playerNum === 1 ? player1Hand : player2Hand
  });

  // return drawnCard; // Return the drawn card (if needed)
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected.');
  let playerNum;
      // Ask the user if they are a player or a spectator
      // socket.emit('choose-role');

      // socket.on('role-chosen', (role) =>{})

      // Handle joining a room
      socket.on('join-room', (roomName, role) => {
        socket.join(roomName);  // Join the specified room
        console.log(`User ${socket.id} joined room ${roomName} as ${role}`);

        // Emit a message to just the room
        io.to(roomName).emit('room-message', `${socket.id} has joined as ${role}`);
        
        // If player, assign player role in that room, if spectator, notify room
        if (role === 'player') {
            // Handle player-specific setup, e.g., start game logic
        } else if (role === 'spectator') {
            // Handle spectator setup, e.g., join chat
        }
      });

      // Handle leaving a room
      socket.on('leave-room', (roomName) => {
        socket.leave(roomName);
        console.log(`User ${socket.id} left room ${roomName}`);
        io.to(roomName).emit('room-message', `${socket.id} has left the room`);
      });



      // Broadcast a message to a specific room
      socket.on('send-message', (roomName, message) => {
        io.to(roomName).emit('chat-message', message);
      });

      
      // Check if there are less than 2 players
      if (playerCount < 2) {        
        // Assign player number
        if (playerCount === 0) {
            playerCount++;
            playerNum = playerCount;
            players[socket.id] = { playerNum }; // Store player number against socket ID
            console.log(`Players: ${playerCount}`);
            player1Hand = dealHand(p1Deck);
            console.log('Player 1 hand is dealt.');
            socket.emit('player-number', playerNum);
        } else if (playerCount === 1) {
            playerCount++;
            playerNum = playerCount;
            players[socket.id] = { playerNum }; // Store player number against socket ID
            console.log(`Players: ${playerCount}`);
            player2Hand = dealHand(p2deck);
            console.log('Player 2 hand is dealt.');
            console.log(`The hand for ${socket.id}`);
            socket.emit('player-number', playerNum);
        } else {
            socket.emit('game-full');
            return;
        }
      }

    // When both players are connected, send hands to both clients
    if (playerCount === 2) {
      console.log('Starting game');
      gameBoard = {};
      io.emit('game-start', { player1Hand, player2Hand }); // Send hands to both clients
      io.emit('turn-update', { currentTurn });  // Notify that it's Player 1's turn initially
    }
  
    socket.on('update-player', (playerNum) => {
      if (playerNum == 1) {
        playerNum = 2;
    }else{
        playerNum = 1;
    }
    io.emit('player-update', playerNum);
    console.log(`Active player has been updated to ${playerNum}`);
    })

    // Handle card placement
    socket.on('place-card', ({playerNum, selectedCard, slotDestination, spotValue, spotOwnership}) => {
        console.log(`Server received card placement from Player ${playerNum}`);
        console.log(`Player is attempting to place a card at ${slotDestination}`);
        const slotRowColSplit = slotDestination.split('-');  // Parse row and column from slot ID
        const row = parseInt(slotRowColSplit[0].replace('slot', ''));
        const col = parseInt(slotRowColSplit[1]);

        // Ensure it's the correct player's turn
        if (playerNum !== currentTurn) {
          socket.emit('invalid-move', "It's not your turn!");
          console.log(`Server rejected player ${playerNum}'s action as it was not their turn.`);
          return; // Reject the move
        }
        console.log(`The intended space has a pawn value of ${spotValue} and the card has a rank of ${selectedCard.rank}`);
        if (spotValue < selectedCard.rank) {
          socket.emit('invalid-move', "There are not enough pawns at this spot.");
          return //reject the move
        }
        console.log(`This space is controlled by ${spotOwnership}`);
        if(playerNum != spotOwnership){
          socket.emit('invalid-move', "This space is controlled by your opponent.");
          console.log(`Your player number is ${playerNum}`);
          return; // Reject the move
        }



        // Validate the move (server-side validation of the board state)
        const slot = gameBoard[slotDestination];
        if (slot && slot.controlledBy && slot.controlledBy !== playerNum) {
            socket.emit('invalid-move', "This slot is already controlled by another player!");
            console.log('Invalid move. This slot is already controlled by another player!');
            return;
        }

        // Update the game board state
        console.log(`Server: ${gameBoard[slotDestination]}`);
        gameBoard[slotDestination] = {
            card: selectedCard,
            controlledBy: playerNum,
        };
        // Apply card's effect (the spaces they change) based on effectPattern
        const card = new Card(
          selectedCard.name, 
          selectedCard.points, 
          selectedCard.ability, 
          selectedCard.rank, 
          selectedCard.effectPattern
      );

        // Update player hands
        if (playerNum === 1) {
            const cardIndex = player1Hand.findIndex(card => card.id === selectedCard.id);
            if (cardIndex !== -1) {
              player1Hand.splice(cardIndex, 1);  // Remove only the selected card by its unique id
          }
        } else {
          const cardIndex = player1Hand.findIndex(card => card.id === selectedCard.id);

            if (cardIndex !== -1) {
              player2Hand.splice(cardIndex, 1);  // Remove only the selected card by its unique id
          }
        }

        // Broadcast the card placement to both players
        console.log(`Server: Player ${playerNum} is emitting ${selectedCard.name} at ${slotDestination}`);
        io.emit('card-placed', { playerNum, selectedCard, slotDestination });
        io.emit('hand-updated', {
          playerNum,
          updatedHand: playerNum === 1 ? player1Hand : player2Hand
        });

        // Switch turns and notify both players
        consecutiveSkips = 0;
        switchTurn();
      });

      socket.on('chat-message', (msg) => {
        io.emit('chat-message', msg);
      })

    // Handle skip turn
    socket.on('skip', ({ playerNum }) => {
      // Is it the player's turn?
      if (playerNum !== currentTurn) {
        socket.emit('invalid-move', 'It is not your turn to skip.');
        return;
      }

      consecutiveSkips++;

      if (consecutiveSkips >= 2) {
        // If both players skipped consecutively, end the game
        socket.emit('game', 'The game is over.');
        console.log("Both players skipped consecutively. Ending the game.");
    } else {
        // Switch to the other player's turn
        switchTurn();
    }
    })

      // Listen for game-over event (both players skipped consecutively)
      socket.on('game-over', (data) => {
        const { winner, player1Points, player2Points } = data;

        if (winner === 'draw') {
            alert(`The game is a draw! Player 1: ${player1Points} points, Player 2: ${player2Points} points.`);
        } else {
            alert(`Player ${winner} wins! Player 1: ${player1Points} points, Player 2: ${player2Points} points.`);
        }
      });
      
      // Handle hand updates
      socket.on('update-hand', (data) => {
          const { playerNum, updatedHand } = data;
          if (playerNum === 1) {
              player1Hand = updatedHand;
          } else if (playerNum === 2) {
              player2Hand = updatedHand;
          }

          // Broadcast the updated hand to the other player
          socket.broadcast.emit('hand-updated', { playerNum, updatedHand });
      });
  
      // Handle disconnection
      socket.on('disconnect', () => {
          console.log(`Player ${playerNum} disconnected`);
          delete players[socket.id];
          playerCount--;

          // Reset game if a player disconnects
          player1Hand = null;
          player2Hand = null;
          gameBoard = {}; // Clear the board
          currentTurn = 1;
          io.emit('player-update', { players }); // Notify players of disconnection
      });

    socket.on('message', (message) => {
      console.log(message);
      socket.broadcast.emit('message', message);
    })
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
