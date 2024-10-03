// Display the cards in the player's hand
const playerHandElement = document.getElementById('player1-hand');

player1Hand.forEach(card => {
  const cardElement = document.createElement('div');
  cardElement.classList.add('card');
  cardElement.innerHTML = `${card.name} (${card.points}) Rank: ${card.rank}`;
  cardElement.dataset.cardId = card.id;
  
  // Add click event to select the card
  cardElement.addEventListener('click', () => selectCard(cardElement, card));
  
  playerHandElement.appendChild(cardElement);
});

// Display the cards in the Opponent's hand
const player2HandElement = document.getElementById('player2-hand');
player2Hand.forEach(card => {
  const cardElement = document.createElement('div');
  cardElement.classList.add('card');
  cardElement.innerHTML = `${card.name} (${card.points}) Rank: ${card.rank}`;
  cardElement.dataset.cardId = card.id;
  
  // Add click event to select the card
  cardElement.addEventListener('click', () => selectCard(cardElement, card));
  
  player2HandElement.appendChild(cardElement);
});