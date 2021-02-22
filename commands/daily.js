const { GetDaily } = require("../utils/coin");
module.exports = {
  name: "daily",
  description: "get daily reward",
  category: "Fun",
  async execute(message, args) {
    GetDaily(message.author).then(result => {
      message.reply(result);
    });
  },
};
