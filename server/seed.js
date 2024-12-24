const mongoose = require('mongoose');
const connectDB = require('./database');
const Card = require('./models/Card');

const seedCards = async () => {
  await connectDB();

  const cards = [
    { name: 'Warrior', points: 5, ability: 'buff', rank: 1, effectPattern: [[0, 1], [1, 0]] },
    { name: 'Mage', points: 3, ability: 'destroy', rank: 2, effectPattern: [[0, -1], [-1, 0]] },
    // Add more cards here
  ];

  try {
    await Card.insertMany(cards);
    console.log('Cards seeded successfully');
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

seedCards();
