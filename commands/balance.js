const { GetBalance } = require("../utils/coin");
const { TruncateDecimals } = require("../utils/helper");
const numeral = require("numeral");

module.exports = {
  name: "balance",
  description: "get your balance",
  category: "Fun",
  alias: ["bal"],
  async execute(message, args) {
    GetBalance(message.author).then(balance => {
      message.reply(`your balance is **${numeral(balance).format("0,0.00")}**!`);
    });
  },
};
