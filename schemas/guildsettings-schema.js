const mongoose = require("mongoose");

const requiredString = {
  type: String,
  required: true,
};

const settingsSchema = mongoose.Schema({
  _id: requiredString,
  prefix: String,
  autodl: Array,
});

module.exports = mongoose.model("guild-settings", settingsSchema);
