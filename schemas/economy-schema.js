const mongoose = require("mongoose");

const schemaObj = {
  type: String,
  required: false,
};

const requiredSchema = {
  type: String,
  required: true,
};

const numberSchema = {
  type: Number,
  required: false,
  min: 0,
};

const economySchema = mongoose.Schema({
  _id: requiredSchema,
  coins: numberSchema,
  lastdaily: numberSchema,
});

module.exports = mongoose.model("economy", economySchema);
