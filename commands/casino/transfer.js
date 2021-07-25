const { awardPoints, getUserData } = require("@utils/coin");
const numeral = require("numeral");
const { FindMember } = require("@utils/helper");
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

    let transfer = isSlash
      ? numeral(interaction.options.get("amount").value).value()
      : numeral(numeral(args[1]).format("0.00")).value();
    let transferee = isSlash ? interaction.options.get("user").member : FindMember(args[0], interaction);

    if (!transferee) {
      interaction.reply(`To transfer, use this command: \`\`${module.exports.usage}\`\``);
      return;
    } else if (interaction.member === transferee) {
      interaction.reply(`you cannot transfer to yourself!`);
      return;
    }

    const data = await getUserData(interaction.member);
    const transfereeData = await getUserData(transferee);

    const balance = +data.coins.toString();
    const transfereeBalance = transfereeData?.coins ? +transfereeData.coins.toString() : 0;

    if (transfer > balance) {
      return interaction.reply(`insufficient balance! Your balance is **${numeral(balance).format("0,0.00")}**.`);
    } else if (transfer < 0.01) {
      return interaction.reply(`you must transfer more than $0!`);
    }

    let transferEmbed = new Discord.MessageEmbed()
      .setColor("#00e394")
      .setTitle(`${interaction.member.displayName}'s transfer to ${transferee.displayName}`)
      .addField("**Transfer**", numeral(transfer).format("$0,0.00"), true)
      .addField("**New Balance**", numeral(balance - transfer).format("$0,0.00"), true)
      .addField(
        `**${transferee.displayName}'s Balance**`,
        numeral(transfereeBalance + transfer).format("$0,0.00"),
        true
      );

    interaction.reply({ embeds: [transferEmbed], allowedMentions: { repliedUser: false } });

    awardPoints(interaction.member, -transfer);
    awardPoints(transferee, transfer);
  },
};
