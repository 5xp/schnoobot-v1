const mongoose = require("mongoose");

const schemaObj = {
  type: String,
  required: false,
};

const settingsSchema = mongoose.Schema({
  _id: schemaObj,
  prefix: schemaObj,
});

module.exports = mongoose.model("guild-settings", settingsSchema);
