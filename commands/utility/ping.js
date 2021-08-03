const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "ping",
  description: "ping command",
  slash: true,
  async execute(interaction) {
    const isSlash = interaction.isCommand?.();
    let ping, reply;

    if (!isSlash) {
      reply = await interaction.reply("**Pinging...**");
      ping = reply.createdTimestamp - interaction.createdTimestamp;
    } else {
      reply = await interaction.defer({ fetchReply: true });
      ping = reply.createdTimestamp - interaction.createdTimestamp;
    }

    const apiPing = interaction.client.ws.ping;

    const embed = new MessageEmbed().setColor("BLURPLE").setDescription(`⏱ ${ping} ms\n💓 ${apiPing} ms`);

    isSlash ? interaction.editReply({ embeds: [embed] }) : reply.edit({ embeds: [embed], content: null });
  },
};
