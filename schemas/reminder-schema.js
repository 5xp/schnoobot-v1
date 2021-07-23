const mongoose = require("mongoose");

const schema = mongoose.Schema({
  _id: { type: String, required: true },
  channelId: { type: String, required: true },
  date: { type: Date, required: true },
  message: { type: String, required: true },
});

module.exports = mongoose.model("reminders", schema);
