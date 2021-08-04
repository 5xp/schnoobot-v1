const mongoose = require("mongoose");

const requiredString = {
  type: String,
  required: true,
};

const leaderboardSchema = mongoose.Schema({
  _id: requiredString,
  name: requiredString,
  wpm: requiredString,
  gamesplayed: { type: Number, required: true },
  wpmsum: { type: Number, required: true },
});

module.exports = mongoose.model("typeracer-leaderboard", leaderboardSchema);
