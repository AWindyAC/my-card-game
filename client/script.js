
//Variables
  let playerNum = null; // Store the player's number (1 or 2)
  let opponent = null;
  let playerTurn = 1;
  let selectedCard = null;
  let skipCounter = 0;
  let lastSkippedPlayer = null;  // Tracks the player who last skipped
  let playerHand = [];
  let opponentHand = [];
  let currentTurn = null;

// ------------------------------------------SERVER--------------------------------------------
// Establish connection with the server
const socket = io();

  // Optionally, listen for connection events
  socket.on('connect', () => {
    console.log('Connected to server');
  });

// Listen for the player number assignment
socket.on('player-number', (number) => {
    playerNum = number;
    if (playerNum === 2) {
        console.log("You are Player 2.");
        opponent = 1;
    } else {
        console.log("You are Player 1.");
        opponent = 2; // The opponent is Player 2
    }
    
    // Update the UI to reflect the player number
    updatePlayerUI();
  });

  // Listen for the board initialization from the server. Keeping this for when I move the gameboard to being initialized on the server.
socket.on('initialize-board', (gameBoard) => {
    // Update the board UI
    for (const slotId in gameBoard) {
        const slotElement = document.getElementById(slotId);
        const { pawnCount, controlledBy } = gameBoard[slotId];
        if (slotElement) {
            // Update pawn count display
            slotElement.setAttribute('data-pawn-count', pawnCount);
            slotElement.innerHTML = `${pawnCount}`;
            
            // Update control classes
            slotElement.classList.remove('player1-control', 'player2-control');
            if (controlledBy === 1) {
                slotElement.classList.add('player1-control');
            } else if (controlledBy === 2) {
                slotElement.classList.add('player2-control');
            }
        }
    }
});


socket.on('player-update', (playerNum) => {
    playerNum = playerNum;
})

socket.on('game-start', (gameData) => {
    const { player1Hand, player2Hand } = gameData;

    if (playerNum === 1) {
        playerHand = player1Hand;
        opponentHand = player2Hand;
    } else if (playerNum === 2) {
        playerHand = player2Hand;
        opponentHand = player1Hand;
    }

    // Display both hands: detailed for the current player, hidden for the opponent
    displayHand(playerHand, playerNum);
    displayHand(opponentHand, opponent, true);  // The `true` flag indicates hidden cards
});

// Listen for turn updates
socket.on('turn-update', (data) => {
    playerTurn = data.currentTurn;
    console.log(`It's Player ${playerTurn}'s turn.`);
    const overlay = document.getElementById('overlay');
    if (playerTurn == 1) {
      overlay.classList.remove('player2turn');
      overlay.classList.add('player1turn');
    }
    if (playerTurn == 2) {
      overlay.classList.remove('player1turn');
      overlay.classList.add('player2turn');
    }

    // Update UI to show whose turn it is
    document.getElementById('turn-indicator').innerText = `It's Player ${playerTurn}'s turn`;
});

// Handle invalid move (if a player tries to play out of turn)
socket.on('invalid-move', (message) => {
    alert(message);
});

// Listen for the updated hand from the server when the opponent plays a card
socket.on('hand-updated', (data) => {
    const { playerNum, updatedHand } = data;

    console.log(`Player ${playerNum}'s hand was updated`, updatedHand);
    let isOpponent = false;
    if (playerNum === 1) {
      isOpponent = 2;
    } else {
      isOpponent = 1;
    }
    
    // Update the hand display for the opponent
    updateHandDisplay(updatedHand, playerNum, isOpponent);
});
  
  // Handle disconnection of the opponent
  socket.on('player-disconnected', () => {
    console.log(`Player ${opponent} has disconnected.`);
  });
  
  // Function to update the UI to reflect the current player
  function updatePlayerUI() {
    document.getElementById('player-info').innerText = `You are Player ${playerNum}`;
  }
  
  socket.on('game-full', () => {
    alert('The game is full. Please try again later.');
  });

  // Listen for card placement from the server
  socket.on('card-placed', (data) => {
    let { playerNum, selectedCard, slotDestination } = data;
    // Split the slotID string to extract row and column
    const slotRowColSplit = slotDestination.split('-');  // Parse row and column from slot ID
    const row = parseInt(slotRowColSplit[0].replace('slot', ''));
    const col = parseInt(slotRowColSplit[1]);
    console.log(`Card-Placed: Player ${playerNum} played ${selectedCard.name} at ${slotDestination}`);

    // Get the slot element where the card was placed
    console.log(slotDestination);
    const slotElement = document.getElementById(slotDestination);
    cardElement = document.createElement('div');
    cardElement.classList.add('card');

    if (slotElement) {
        // Place the card on the client-side for all players
        slotElement.innerHTML = '';
      slotElement.appendChild(cardElement);
        // Create the card name element
        const nameElement = document.createElement('div');
        nameElement.classList.add('card-name');
        nameElement.innerText = `${selectedCard.name}`;
        cardElement.appendChild(nameElement);

        slotElement.setAttribute('data-occupied', 'true');
        slotElement.setAttribute('data-points', selectedCard.points);
        slotElement.setAttribute('data-controlled-by', playerNum);


        // Apply effects to the relevant slots
        selectedCard.effectPattern.forEach((pattern) => {
            console.log(`This card's pattern is ${pattern}`);
            // Reverse the column offset for Player 2
            let [rowOffset, colOffset] = pattern;
            if (playerNum === 2) {
                colOffset = -colOffset;  // Mirror column offset for Player 2
            }
            const affectedSlotId = `slot${row + rowOffset}-${col + colOffset}`;
            const affectedSlotElement = document.getElementById(affectedSlotId);
            if (affectedSlotElement) {
                // Update the affected slot based on the card's ability
                // (e.g., adjust points, destroy the card, etc.)
                updatePawnCountDisplayForSlot(affectedSlotId);
            }
        });

        updateRowPointsDisplay(row);
    }
});

socket.on('update-board', ({ affectedSlots }) => {
  affectedSlots.forEach(({ row, col, points, controlledBy }) => {
    // Check if affectedSlots is received and not undefined
    if (!affectedSlots || !Array.isArray(affectedSlots)) {
      console.error('No affected slots received');
      return;
  }

  // Loop through affected slots and update the DOM accordingly
  affectedSlots.forEach(({ row, col, points, controlledBy }) => {
      const slotElement = document.querySelector(`#slot${row}-${col}`);
      
      if (slotElement) {
          // Update the DOM based on the affected slot data
          slotElement.dataset.points = points;
          slotElement.dataset.controlledBy = controlledBy;
          slotElement.innerHTML = `<div class="card">Points: ${points}</div>`;

          // Add or remove control classes
          slotElement.classList.remove('player1-control', 'player2-control');
          slotElement.classList.add(controlledBy === '1' ? 'player1-control' : 'player2-control');
      }
  });
  });
});


socket.on('game', (message) => {
    endGame();
})

socket.on('message', (message)=> {
    console.log(message);
});

// -------------------------------------------Game Logic-----------------------------------------

// Pawn counts for each slot
const pawnCounts = {
    'slot1-0': 1, 'slot1-1': 0, 'slot1-2': 0, 'slot1-3': 0, 'slot1-4': 1,
    'slot2-0': 1, 'slot2-1': 0, 'slot2-2': 0, 'slot2-3': 0, 'slot2-4': 1,
    'slot3-0': 1, 'slot3-1': 0, 'slot3-2': 0, 'slot3-3': 0, 'slot3-4': 1,
    
};


// Display the player's hand in the UI
function displayHand(hand, player, isOpponent = false) {
    const handElement = document.getElementById(`player${player}-hand`);
    handElement.innerHTML = '';  // Clear the current hand display

    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');

        // If this is the opponent's hand, show hidden cards
        if (isOpponent) {
            cardElement.innerText = 'Hidden Card';  // or use card back image
            cardElement.classList.add('hidden-card');  // You can style this class for a "card back" look
        } else {
            // Show full card details for the current player
            cardElement.dataset.cardId = card.id;

            // Add click event to select the card if it's the player's hand
            cardElement.addEventListener('click', () => selectCard(cardElement, card));

            const pointsElement = document.createElement('div');
            pointsElement.classList.add('card-points');
            pointsElement.innerText = card.points;
    
            // Append the points element to the card
            cardElement.appendChild(pointsElement);

            // Create the card name element
            const nameElement = document.createElement('div');
            nameElement.classList.add('card-name');
            nameElement.innerText = card.name;
            cardElement.appendChild(nameElement);

            // Add circles based on the card's rank
            const rankIcon = document.createElement('div');
            rankIcon.classList.add('rank-icon');

            // Generate circles based on the rank of the card
            for (let i = 0; i < card.rank; i++) {
                const circle = document.createElement('div');
                circle.classList.add('circle');
                rankIcon.appendChild(circle);
            }

            cardElement.appendChild(rankIcon); // Attach the rank circles to the card element

            // Create a canvas element for the effect pattern
            const effectCanvas = document.createElement('canvas');
            effectCanvas.classList.add('effect-canvas');
            effectCanvas.width = 60;
            effectCanvas.height = 60;
            cardElement.appendChild(effectCanvas);

            // Call drawEffectPattern to render the effect pattern on the canvas
            drawEffectPattern(effectCanvas, card.effectPattern, player);
        }

        handElement.appendChild(cardElement);
    });
}

function drawEffectPattern(canvas, effectPattern, playerNum) {
  const ctx = canvas.getContext('2d');
  const cellSize = 20;
  
  // Clear the canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw the grid (3x3)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // Set default color for grid cells
      ctx.fillStyle = '#c2c2c2';
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }

  // Reverse the effectPattern for Player 2
  const adjustedPattern = playerNum === 2
    ? effectPattern.map(([rOffset, cOffset]) => [rOffset, -cOffset])
    : effectPattern;
  
  // Highlight the effect cells based on the pattern
  adjustedPattern.forEach(([rOffset, cOffset]) => {
    const targetRow = 1 + rOffset;  // Offset from the center
    const targetCol = 1 + cOffset;  // Offset from the center

    // Highlight affected cell
    if (targetRow >= 0 && targetRow < 3 && targetCol >= 0 && targetCol < 3) {
      ctx.fillStyle = '#FF5722';  // Color for affected cells
      ctx.fillRect(targetCol * cellSize, targetRow * cellSize, cellSize, cellSize);
    }
  });

  // Highlight the center (card position)
  ctx.fillStyle = 'yellow'; // Center color
  ctx.fillRect(cellSize, cellSize, cellSize, cellSize);
}

// Function to update pawn count display (optional for visual feedback)
function showPawnCountDisplay() {
    for (const slotId in pawnCounts) {
      const slotElement = document.getElementById(slotId);
      if(slotElement){
        slotElement.setAttribute('data-pawn-count', pawnCounts[slotId]); // Optional: Show pawn count in slot
        slotElement.innerHTML = `${pawnCounts[slotId]}`;
      }
        // Get the value of data-controlled-by
        const controlledBy = slotElement.getAttribute('data-controlled-by');

        // Remove both control classes first to reset
        slotElement.classList.remove('player1-control', 'player2-control');

        // Add the appropriate class based on the player in control
        if (controlledBy === '1') {
            slotElement.classList.add('player1-control');
        } else if (controlledBy === '2') {
            slotElement.classList.add('player2-control');
        }
    }
}
// Call this function to show the initial pawn counts
showPawnCountDisplay();

// Function to skip a turn
function skipTurn() {
    socket.emit('skip', ({ playerNum}))
}

// Function to calculate the total points for all rows
function calculateTotalPoints() {
  let player1Total = 0;
  let player2Total = 0;

  // Sum the points from all rows
  for (let row = 1; row <= 3; row++) {
      const { player1Points, player2Points } = calculateRowPoints(row);
      player1Total += player1Points;
      player2Total += player2Points;
  }

  return { player1Total, player2Total };
}

// Function to end the game
function endGame() {
  const { player1Total, player2Total } = calculateTotalPoints();
  console.log(`Player 1 Total Points: ${player1Total}`);
  console.log(`Player 2 Total Points: ${player2Total}`);

  if (player1Total > player2Total) {
      alert('Player 1 Wins!');
  } else if (player2Total > player1Total) {
      alert('Player 2 Wins!');
  } else {
      alert('It\'s a tie!');
  }
    // After displaying the result, reset the game
    setTimeout(resetGame(), 3000); // Wait 3 seconds before resetting the game
  // You can add more logic to reset or restart the game here
}

// Function to place the selected card in a slot
const placeCard = (slotElement) => { 
  let cardPoints = selectedCard.points;
  const slotDestination = slotElement.id;
  let spotValue = document.getElementById(slotDestination).getAttribute('data-pawn-count');
  let spotOwnership = document.getElementById(slotDestination).getAttribute('data-controlled-by');

  // Emit the move to the server
  socket.emit('place-card', { playerNum, selectedCard, slotDestination, spotValue, spotOwnership });

  };

// Function to update the player's hand display after a card is removed
function updateHandDisplay(hand, playerNum, isOpponent) {
    const handElement = document.getElementById(`player${playerNum}-hand`);
    handElement.innerHTML = '';  // Clear the current hand display

    // Extract the number from the hand's ID to determine which hand to hide
    const handId = handElement.id;  // Example: "player1-hand"
    const extractedPlayerNum = parseInt(handId.match(/\d+/)[0], 10);  // Extract the number, e.g., 1 or 2
    
    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');

        // Show full card details for the current player
        cardElement.dataset.cardId = card.id;
        cardElement.addEventListener('click', () => selectCard(cardElement, card));
        // Add Points display
        const pointsElement = document.createElement('div');
        pointsElement.classList.add('card-points');
        pointsElement.innerText = card.points;
        cardElement.appendChild(pointsElement);
        // Create the card name element
        const nameElement = document.createElement('div');
        nameElement.classList.add('card-name');
        nameElement.innerText = card.name;
        cardElement.appendChild(nameElement);
        // Add circles based on the card's rank
        const rankIcon = document.createElement('div');
        rankIcon.classList.add('rank-icon');

        // Generate circles based on the rank of the card
        for (let i = 0; i < card.rank; i++) {
            const circle = document.createElement('div');
            circle.classList.add('circle');
            rankIcon.appendChild(circle);
        }

        cardElement.appendChild(rankIcon); // Attach the rank circles to the card element
        // Add canvas for effect pattern
        const effectCanvas = document.createElement('canvas');
        effectCanvas.classList.add('effect-canvas');
        effectCanvas.width = 60;  // Adjust the width of the canvas
        effectCanvas.height = 60;  // Adjust the height of the canvas
        cardElement.appendChild(effectCanvas);

        // Draw the effect pattern on the canvas
        drawEffectPattern(effectCanvas, card.effectPattern, playerNum);

        handElement.appendChild(cardElement);
        
    });
}

// Function to handle card selection
function selectCard(cardElement, card) {
  const cardPlayer = cardElement.closest(".player-hand").getAttribute("data-player"); // Get the player's hand
    console.log(`A card was selected from Player ${cardPlayer}'s hand`);
    if (parseInt(cardPlayer, 10) !== playerNum) {
        alert("You cannot select cards from the other player's hand!");
        return; // Prevent selecting the card if it's not the current player's hand
    }
    // Deselect any previously selected card
    document.querySelectorAll('.card').forEach(el => el.classList.remove('P1selected'));
    document.querySelectorAll('.card').forEach(el => el.classList.remove('P2selected'));

    
    // Mark this card as selected
    if (cardElement.classList.contains('P1selected') || cardElement.classList.contains('P2selected')) {
      cardElement.classList.remove('P1selected');
      cardElement.classList.remove('P2selected');
      selectedCard = null;
    }
    if (playerNum == 1) {
      cardElement.classList.add('P1selected');
    }
    if (playerNum == 2) {
      cardElement.classList.add('P2selected');
    }
    selectedCard = card;
    console.log(`${selectedCard.name} was selected`);
}

const slots = document.querySelectorAll('.slot');
// Add click event listener to each slot
slots.forEach(slot => {
      slot.addEventListener('click', function() {
        console.log("Clicked Slot ID:", this.id);
        placeCard(this);
        // Pass the clicked selected card to the placeCard function
      });
});

//  Scoring system
function calculateRowPoints(row) {
  let player1Points = 0;
  let player2Points = 0;
  
  document.querySelectorAll(`#row${row} .slot`).forEach(slot => {
      const points = parseInt(slot.getAttribute('data-points'), 10);
      const controlledBy = slot.getAttribute('data-controlled-by');

      if (controlledBy === '1') {
          player1Points += points;
      } else if (controlledBy === '2') {
          player2Points += points;
      }
  });
  return { player1Points, player2Points };
}

// Call this function whenever a card is placed to update the points
const updateRowPointsDisplay = (row) => {
  const { player1Points, player2Points } = calculateRowPoints(row);
  
  document.getElementById(`row${row}-player1-points`).innerText = `${player1Points} points`;
  document.getElementById(`row${row}-player2-points`).innerText = `${player2Points} points`;
};

// Function to update all row points (call this after a card is placed)
function updateAllRowPoints() {
    calculateRowPoints(1);  // Update row 1 points
    calculateRowPoints(2);  // Update row 2 points
    calculateRowPoints(3);  // Update row 3 points
}

// Need to update this later on. Currently calculates scores wrong
const checkWinner = () => {
    const player1Score = calculateRowPoints(1) + calculateRowPoints(2);
    const player2Score = calculateRowPoints(3);
  
    if (player1Score > player2Score) {
      console.log('Player 1 wins!');
    } else {
      console.log('Player 2 wins!');
    }
};

//Updating Pawn count
function updateAdjacentPawnCounts(slotId) {
    // slotId = String(slotId);
   const slotDes = slotId.id;
   
    // Split the slotDes string to extract row and column
    const splitResult = slotDes.split('-'); // ["slot1", "2"]
    const row = parseInt(splitResult[0].replace('slot', ''), 10); // Extract row number from "slotX"
    const col = parseInt(splitResult[1], 10); // Extract column number

    // Update the left slot (if it's not the first column)
    if (col > 1) {
      const leftSlotId = `slot${row}-${col - 1}`;
      if (pawnCounts[leftSlotId] !== undefined) {
        pawnCounts[leftSlotId]++;
        updatePawnCountDisplayForSlot(leftSlotId);
      }
    }
  
    // Update the right slot (if it's not the last column)
    if (col < 5) { // Assuming 5 columns
      const rightSlotId = `slot${row}-${col + 1}`;
      if (pawnCounts[rightSlotId] !== undefined) {
        pawnCounts[rightSlotId]++;
        updatePawnCountDisplayForSlot(rightSlotId);
      }
    }
  
    // Update the top slot (if it's not the first row)
    if (row > 1) {
      const topSlotId = `slot${row - 1}-${col}`;
      if (pawnCounts[topSlotId] !== undefined) {
        pawnCounts[topSlotId]++;
        updatePawnCountDisplayForSlot(topSlotId);
      }
    }
  
    // Update the bottom slot (if it's not the last row)
    if (row < 3) { // Assuming 3 rows
      const bottomSlotId = `slot${row + 1}-${col}`;
      if (pawnCounts[bottomSlotId] !== undefined) {
        pawnCounts[bottomSlotId]++;
        updatePawnCountDisplayForSlot(bottomSlotId);
      }
    }
}
  
// Helper function to update the display for a single slot
function updatePawnCountDisplayForSlot(slotId) {
    console.log(`Updating Pawns for ${slotId}`);
    const slotElement = document.getElementById(slotId);
    let slotCount = parseInt(slotElement.getAttribute('data-pawn-count'), 10);
    if (slotElement && slotElement.getAttribute('data-occupied') !== 'true') {
        slotCount++;
        slotElement.setAttribute('data-pawn-count', slotCount);
        slotElement.innerHTML = `${slotCount}`;
    }
    if(slotElement.getAttribute('data-occupied') == 'false'){
      if (playerTurn == 1) {
        if (slotElement.classList.contains('player2-control')) {
          slotElement.classList.remove('player2-control');
        }
        slotElement.classList.add('player1-control');
        slotElement.setAttribute('data-controlled-by', playerTurn)
      }
      else{
        if (slotElement.classList.contains('player1-control')) {
          slotElement.classList.remove('player1-control');
        }
        slotElement.classList.add('player2-control');
        slotElement.setAttribute('data-controlled-by', playerTurn);
      }
    }
}

function dealHand(deck) {
    const shuffledDeck = deck.sort(() => Math.random() - 0.5);
    return shuffledDeck.slice(0, 5); // Deal the first 5 cards for the hand
  }

// Function to reset the game
function resetGame() {
  // Reset the board
  const slots = document.querySelectorAll('.slot');
  slots.forEach(slot => {
      slot.innerHTML = ''; // Remove any cards from slots
      slot.setAttribute('data-occupied', 'false');
      slot.setAttribute('data-points', '0');
      slot.setAttribute('data-controlled-by', '0');
      slot.classList.remove('player1-control', 'player2-control');
      // Reset pawn counts: first and last slot of each row to 1, others to 0
      const slotId = slot.id; // Get the slot ID (e.g., slot1-0, slot1-4)
      const [row, col] = slotId.split('-').map(part => parseInt(part.replace('slot', ''))); // Extract row and col

      if (col === 0 || col === 4) {
          // First and last slot in the row
          slot.setAttribute('data-pawn-count', '1');
          slot.innerHTML = '1';
      } else {
          // Other slots
          slot.setAttribute('data-pawn-count', '0');
          slot.innerHTML = '0';
      }
  });

  // Reset player points display
  for (let row = 1; row <= 3; row++) {
      document.getElementById(`row${row}-player1-points`).innerText = '0 points';
      document.getElementById(`row${row}-player2-points`).innerText = '0 points';
  }

  // Reset game variables
  skipCounter = 0;
  lastSkippedPlayer = null;
  playerTurn = 1;

  // Reset player hands (generate new hands)
  player1Hand = dealHand(p1Deck); // Generate a new hand for Player 1
  player2Hand = dealHand(p2deck); // Generate a new hand for Player 2

  // Clear and update the hand display for Player 1
  const player1HandElement = document.getElementById('player1-hand');
  player1HandElement.innerHTML = ''; // Clear previous hand
  player1Hand.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.classList.add('card');
      cardElement.innerHTML = `${card.name} (${card.points}) Rank: ${card.rank}`;
      cardElement.dataset.cardId = card.id;

      // Add click event to select the card
      cardElement.addEventListener('click', () => selectCard(cardElement, card));

      player1HandElement.appendChild(cardElement);
  });

  // Clear and update the hand display for Player 2
  const player2HandElement = document.getElementById('player2-hand');
  player2HandElement.innerHTML = ''; // Clear previous hand
  player2Hand.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.classList.add('card');
      cardElement.innerHTML = `${card.name} (${card.points}) Rank: ${card.rank}`;
      cardElement.dataset.cardId = card.id;

      // Add click event to select the card
      cardElement.addEventListener('click', () => selectCard(cardElement, card));

      player2HandElement.appendChild(cardElement);
  });

  console.log("The game has been reset. Player 1 starts.");
}