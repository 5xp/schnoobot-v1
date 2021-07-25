const mongoose = require("mongoose");

const string = {
  type: String,
  required: false,
};

const requiredString = {
  type: String,
  required: true,
};

const number = {
  type: Number,
  required: false,
  min: 0,
};

const decimal = {
  type: mongoose.Decimal128,
  set: v => mongoose.Types.Decimal128.fromString(v.toFixed(2)),
  required: false,
  default: 0,
};

const integer = {
  type: Number,
  get: v => Math.round(v),
  set: v => Math.round(v),
};

const economySchema = mongoose.Schema({
  _id: requiredString,
  coins: decimal,
  lastdaily: number,
  dailystreak: integer,
});

module.exports = mongoose.model("economy", economySchema);
