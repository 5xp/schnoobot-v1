const { AwardPoints, GetUserData } = require("../../utils/coin");
const numeral = require("numeral");
const { FindMember } = require("../../utils/helper");
const Discord = require("discord.js");

module.exports = {
  name: "transfer",
  description: "transfer coins",
  usage: `${process.env.PREFIX}transfer <@user> <amount>`,
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

    const data = await GetUserData(message.member);
    const transferee_data = await GetUserData(transferee);

    balance = +data.coins.toString();
    transferee_balance = +transferee_data.coins.toString();

    if (transfer > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("0,0.00")}**.`);
    } else if (transfer < 0.01) {
      return message.reply(`you must transfer more than $0!`);
    }

    let transferEmbed = new Discord.MessageEmbed()
      .setColor("#00e394")
      .setTitle(`${message.member.displayName}'s transfer to ${transferee.displayName}`)
      .addField("**Transfer**", numeral(transfer).format("$0,0.00"), true)
      .addField("**New Balance**", numeral(balance - transfer).format("$0,0.00"), true)
      .addField(`**${transferee.displayName}'s Balance**`, numeral(transferee_balance + transfer).format("$0,0.00"), true);

    message.channel.send(transferEmbed);

    AwardPoints(message.author, -transfer);
    AwardPoints(transferee, transfer);
  },
};
