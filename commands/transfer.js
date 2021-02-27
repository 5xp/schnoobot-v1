const { AwardPoints, GetBalance } = require("../utils/coin");
const numeral = require("numeral");
const { FindMember } = require("../utils/helper");
const Discord = require("discord.js");

module.exports = {
  name: "transfer",
  description: "transfer coins",
  category: "Fun",
  usage: `\`${process.env.PREFIX}transfer <user> <amount>\``,
  async execute(message, args) {
    let transfer = numeral(numeral(args[1]).format("0.00")).value();
    let transferee = FindMember(args[0], message);

    if (!transferee) {
      message.reply(`To transfer, use this command: \`${this.usage}\``);
      return;
    } else if (message.member == transferee) {
      message.reply(`you cannot transfer to yourself!`);
      return;
    }

    GetBalance(message.author).then(balance => {
      GetBalance(transferee).then(transferee_balance => {
        balance = +balance.toString();
        transferee_balance = +transferee_balance.toString();

        if (transfer > balance) {
          message.reply(`insufficient balance! Your balance is **${numeral(balance).format("0,0.00")}**.`);
          return;
        } else if (transfer < 0.01) {
          message.reply(`you must transfer more than 0!`);
          return;
        }

        // message.reply(`transferred **${numeral(transfer).format("0,0.00")}** to **${transferee.displayName}**! Your new balance is **${numeral(balance - transfer).format("0,0.00")}**.`);
        let transferEmbed = new Discord.MessageEmbed()
          .setColor("#00e394")
          .setTitle(`${message.member.displayName}'s transfer to ${transferee.displayName}`)
          .addField("**Transfer**", numeral(transfer).format("$0,0.00"), true)
          .addField("**New Balance**", numeral(balance - transfer).format("$0,0.00"), true)
          .addField(`**${transferee.displayName}'s Balance**`, numeral(transferee_balance + transfer).format("$0,0.00"), true);

        message.channel.send(transferEmbed);

        AwardPoints(message.author, -transfer);
        AwardPoints(transferee, transfer);
      });
    });
  },
};
