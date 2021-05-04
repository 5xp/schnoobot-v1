const { GetDaily } = require("../utils/coin");
const { MessageEmbed } = require("discord.js");
const economySchema = require("../schemas/economy-schema");

module.exports = {
  name: "daily",
  description: "get daily reward",
  category: "Fun",
  async execute(message, args) {
    if (args[0] == "top") {
      const index = await economySchema.find().sort({ dailystreak: -1 });
      const top = 10;
      const j = Math.min(top, index.length);
      let str = "\n";

      for (var i = 0; i < j; i++) {
        let streak = +index[i].dailystreak.toString();
        str += `**#${i + 1}: <@${index[i]._id}> | **${streak}🔥\n`;
      }

      const topEmbed = new MessageEmbed().setColor("#80ff80").addFields({ name: `Top ${j} streaks`, value: str });
      message.channel.send(topEmbed);
    } else {
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

      dailyEmbed
        .setTitle(`Daily Reward`)
        .addFields(fields)
        .setFooter(message.member.displayName, message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
        .setTimestamp();

      message.channel.send(dailyEmbed);
    }
  },
};
