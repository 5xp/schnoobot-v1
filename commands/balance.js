const { GetBalance } = require("../utils/coin");
const { TruncateDecimals } = require("../utils/helper");

module.exports = {
  name: "balance",
  description: "get your balance",
  category: "Fun",
  alias: ["bal"],
  async execute(message, args) {
    GetBalance(message.author).then(balance => {
      message.reply(`your balance is **${TruncateDecimals(balance, 2)}**!`);
    });
  },
};
