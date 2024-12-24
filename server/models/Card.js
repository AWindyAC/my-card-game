const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  points: { type: Number, required: true },
  ability: { type: String, required: true },
  rank: { type: Number, required: true },
  effectPattern: { type: [[Number]], required: true } // Assuming a 2D array for effect pattern
});

module.exports = mongoose.model('Card', cardSchema);
