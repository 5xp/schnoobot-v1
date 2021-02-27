const { GetBalance } = require("../utils/coin");
const { FindMember } = require("../utils/helper");
const numeral = require("numeral");

module.exports = {
  name: "balance",
  description: "get your balance",
  category: "Fun",
  alias: ["bal"],
  async execute(message, args) {
    if (!args.length) {
      GetBalance(message.author).then(balance => {
        message.reply(`your balance is **${numeral(balance).format("$0,0.00")}**!`);
      });
    } else {
      let member = FindMember(args[0], message);
      if (member) {
        GetBalance(member).then(balance => {
          message.reply(`${member.displayName}'s balance is **${numeral(balance).format("$0,0.00")}**!`);
        });
      } else {
        message.reply("invalid user!");
        return;
      }
    }
  },
};
