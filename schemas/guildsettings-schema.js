const mongoose = require("mongoose");

const string = {
  type: String,
  required: false,
};

const requiredString = {
  type: String,
  required: true,
};

const settingsSchema = mongoose.Schema({
  _id: requiredString,
  prefix: string,
});

module.exports = mongoose.model("guild-settings", settingsSchema);
