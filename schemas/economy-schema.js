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

const decimalSchema = {
  type: mongoose.Decimal128,
  set: v => mongoose.Types.Decimal128.fromString(v.toFixed(2)),
  required: false,
  default: 0,
};

const integerSchema = {
  type: Number,
  get: v => Math.round(v),
  set: v => Math.round(v),
};

const economySchema = mongoose.Schema({
  _id: requiredSchema,
  coins: decimalSchema,
  lastdaily: numberSchema,
  dailystreak: integerSchema,
});

module.exports = mongoose.model("economy", economySchema);
