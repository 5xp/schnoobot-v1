const { MessageAttachment, MessageButton, MessageEmbed, Formatters } = require("discord.js");
module.exports = {
  name: "eval",
  description: "execute code",
  slash: true,
  options: [{ name: "code", type: "STRING", description: "the code to execute", required: true }],
  defaultPermission: false,
  slashPermissions: [
    {
      id: "181104522892935168",
      type: "USER",
      permission: true,
    },
  ],
  async execute(interaction, args, content) {
    if (interaction.member.id !== interaction.client.application?.owner.id) {
      return;
    }
    await interaction.deferReply?.({ ephemeral: true });
    try {
      const code = content || interaction?.options.get?.("code")?.value;
      let evaled = await eval(code);
      if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
      const cleaned = clean(evaled);

      if (cleaned.length > 4087) {
        const buffer = Buffer.from(cleaned, "utf-8");
        const attachment = new MessageAttachment(buffer, "response.xl");

        if (interaction.isCommand?.()) {
          const msg = await interaction.editReply({
            content: "⚠ **Response is too large - cannot respond ephemerally**",
            components: [
              {
                type: 1,
                components: [new MessageButton().setLabel("Send anyway").setStyle("DANGER").setCustomId("send")],
              },
            ],
          });

          msg.awaitMessageComponent({ time: 15000 }).then(async i => {
            await interaction.followUp({ files: [attachment] });
            i.deferUpdate();
          });
        } else {
          interaction.reply({ files: [attachment], allowedMentions: { repliedUser: false } });
        }
      } else {
        const embed = new MessageEmbed({ description: Formatters.codeBlock("xl", cleaned) });
        if (interaction.isCommand?.()) interaction.editReply({ embeds: [embed] });
        else interaction.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
    } catch (err) {
      if (interaction.isCommand?.()) {
        interaction.followUp({
          content: `\`ERROR\` ${Formatters.codeBlock("xl", clean(err))}`,
          allowedMentions: { repliedUser: false },
        });
      } else {
        interaction.reply({
          content: `\`ERROR\` ${Formatters.codeBlock("xl", clean(err))}`,
          allowedMentions: { repliedUser: false },
        });
      }
    }
  },
};

function clean(text) {
  if (typeof text === "string") {
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  } else {
    return text;
  }
}
