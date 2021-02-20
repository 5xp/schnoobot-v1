const mongoose = require("mongoose");

const schemaObj = {
  type: String,
  required: false,
};

const requiredSchema = {
  type: String,
  required: true,
};

const leaderboardSchema = mongoose.Schema({
  _id: requiredSchema,
  name: requiredSchema,
  wpm: requiredSchema,
  gamesplayed: { type: Number, required: true },
  wpmsum: { type: Number, required: true },
});

module.exports = mongoose.model("typeracer-leaderboard", leaderboardSchema);
