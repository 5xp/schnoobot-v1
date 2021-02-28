const { GetDaily } = require("../utils/coin");
const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "daily",
  description: "get daily reward",
  category: "Fun",
  async execute(message, args) {
    let data = await GetDaily(message.member);
    let dailyEmbed = new MessageEmbed();

    if (data.awarded === true) {
      dailyEmbed.setColor("#fc03d3");
      fields = [
        {
          name: "**Reward**",
          value: data.reward,
          inline: true,
        },
        {
          name: "**New Balance**",
          value: data.new_balance,
          inline: true,
        },
        {
          name: "**Streak**",
          value: data.streak + "🔥",
          inline: true,
        },
      ];
    } else {
      dailyEmbed.setColor("#ff0000").setDescription("You have already claimed your reward!");
      fields = [
        {
          name: "**Daily Available**",
          value: `in ${data.dailyAvailable}`,
          inline: true,
        },
        {
          name: "**Balance**",
          value: data.new_balance,
          inline: true,
        },
      ];
    }

    dailyEmbed.setTitle(`${message.member.displayName}'s daily reward`).addFields(fields);

    message.channel.send(dailyEmbed);
  },
};
