const { findVoice } = require("@utils/helper.js");

// TODO if query matches multiple voice channels, give button options

module.exports = {
  name: ["moveall", "move", "m"],
  description: "move all members to another voice channel",
  usage: `${process.env.PREFIX}moveall <channel>`,
  required_perms: ["MOVE_MEMBERS"],
  slash: true,
  options: [
    { name: "destination", type: "CHANNEL", description: "the channel to move all users to", required: true },
    {
      name: "from",
      type: "CHANNEL",
      description: "the channel to move all users from-by default this is your current channel",
      required: false,
    },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    let destination, origin;

    if (isSlash) {
      await interaction.defer({ ephemeral: true });
      origin = interaction.options.getChannel("from") ?? interaction.member.voice.channel;
      destination = interaction.options.getChannel("destination");
      await moveToChannel(origin, destination);
    } else if (!args.length) {
      interaction.reply(`⚠ **To use this command: \`${module.exports.usage}\`**`);
    } else {
      origin = args.length > 1 ? findVoice(args[0], interaction) : interaction.member.voice.channel;
      destination = args.length > 1 ? findVoice(args[1], interaction) : findVoice(args[0], interaction);
      await moveToChannel(origin, destination);
    }

    async function moveToChannel() {
      try {
        checkValid(origin, destination);

        origin.members.each(user =>
          user.voice.setChannel(destination).catch(error => {
            console.error(error);
          })
        );

        if (isSlash) {
          interaction.editReply(
            `✅ **Moved ${origin.members.size} members from <#${origin.id}> to <#${destination.id}>!**`
          );
        } else {
          interaction.reply(
            `✅ **Moved ${origin.members.size} members from <#${origin.id}> to <#${destination.id}>!**`
          );
        }
      } catch (error) {
        if (isSlash) interaction.editReply(error.message);
        else interaction.reply(error.message);
        return;
      }

      function checkValid() {
        if (!interaction.member.voice.channel) {
          throw new Error("🚫 **You must be in a voice channel.**");
        } else if (!origin || !destination || destination.type !== "GUILD_VOICE") {
          throw new Error("🚫 **Invalid channel.**");
        } else if (!interaction.member.permissionsIn(destination).has("CONNECT")) {
          throw new Error("🚫 **You do not have permission to connect to this channel.**");
        } else if (origin === destination) {
          throw new Error("🚫 **Identical channel.**");
        }
      }
    }
  },
};
