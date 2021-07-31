const { awardPoints, getUserData } = require("@utils/coin");
const numeral = require("numeral");
const { findMember } = require("@utils/helper");
const Discord = require("discord.js");

module.exports = {
  name: "transfer",
  description: "transfer coins",
  usage: `${process.env.PREFIX}transfer <@user> <amount>`,
  slash: true,
  options: [
    { name: "user", type: "USER", description: "the user to transfer money to", required: true },
    { name: "amount", type: "STRING", description: "the amount of money to transfer", required: true },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    let transferAmount = isSlash
      ? +numeral(interaction.options.getString("amount").toLowerCase()).format("0.00")
      : +numeral(args[1]?.toLowerCase()).format("0.00");

    let transferee = isSlash ? interaction.options.getMember("user") : await findMember(args[0], interaction);

    if (!transferee) {
      interaction.reply(`🚫 **To transfer, use this command: \`${module.exports.usage}\`**`);
      return;
    } else if (interaction.member === transferee) {
      interaction.reply("🚫 **You cannot transfer to yourself.**");
      return;
    }

    const data = await getUserData(interaction.member);
    const transfereeData = await getUserData(transferee);

    const balance = +data.coins.toString();
    const transfereeBalance = transfereeData?.coins ? +transfereeData.coins.toString() : 0;

    if (transferAmount > balance) {
      return interaction.reply(`insufficient balance! Your balance is **${numeral(balance).format("0,0.00")}**.`);
    } else if (transferAmount < 0.01) {
      return interaction.reply(`you must transfer more than $0!`);
    }

    let transferEmbed = new Discord.MessageEmbed()
      .setColor("#00e394")
      .setTitle(`${interaction.member.displayName}'s transfer to ${transferee.displayName}`)
      .addField("**Transfer**", numeral(transferAmount).format("$0,0.00"), true)
      .addField("**New Balance**", numeral(balance - transferAmount).format("$0,0.00"), true)
      .addField(
        `**${transferee.displayName}'s Balance**`,
        numeral(transfereeBalance + transferAmount).format("$0,0.00"),
        true
      );

    interaction.reply({ embeds: [transferEmbed], allowedMentions: { repliedUser: false } });

    awardPoints(interaction.member, -transferAmount);
    awardPoints(transferee, transferAmount);
  },
};
