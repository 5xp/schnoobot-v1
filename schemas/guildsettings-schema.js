const mongoose = require("mongoose");

const schemaObj = {
  type: String,
  required: false,
};

const requiredSchema = {
  type: String,
  required: true,
};

const settingsSchema = mongoose.Schema({
  _id: requiredSchema,
  prefix: schemaObj,
});

module.exports = mongoose.model("guild-settings", settingsSchema);
