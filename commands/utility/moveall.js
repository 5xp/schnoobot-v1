const helper = require("@utils/helper.js");
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
      origin = interaction.options.get("from")?.channel || interaction.member.voice.channel;
      destination = interaction.options.get("destination").channel;
      await moveToChannel(origin, destination);
    } else {
      if (!args.length) {
        interaction.reply("missing arguments!");
      } else {
        origin = args.length > 1 ? helper.FindVC(args[0], interaction) : interaction.member.voice.channel;
        destination = args.length > 1 ? helper.FindVC(args[1], interaction) : helper.FindVC(args[0], interaction);
        await moveToChannel(origin, destination);
      }
    }

    async function moveToChannel(origin, destination) {
      try {
        checkValid(origin, destination);

        origin.members.each(user =>
          user.voice.setChannel(destination).catch(error => {
            console.error(error);
          })
        );

        console.log(
          `${interaction.member.displayName} moved ${origin.members.size} members from ${origin.name} to ${destination.name}!`
            .green
        );
        if (isSlash)
          interaction.editReply(
            `✅ **Successfully moved ${origin.members.size} members from <#${origin.id}> to <#${destination.id}>**`
          );
        else
          interaction.reply(
            `✅ **Successfully moved ${origin.members.size} members from <#${origin.id}> to <#${destination.id}>**`
          );
      } catch (error) {
        if (isSlash) interaction.editReply(`🚫 **${error}**`);
        else interaction.reply(`🚫 **${error}**`);
        return;
      }

      function checkValid(origin, destination) {
        if (!interaction.member.voice.channel) {
          throw new Error("you must be in a voice channel");
        } else if (origin == null || destination == null || destination.type !== "voice") {
          throw new Error("invalid channel");
        } else if (!interaction.member.permissionsIn(destination).has("CONNECT")) {
          throw new Error("you do not have permission to connect to this channel");
        } else if (origin === destination) {
          console.log({ origin, destination });
          throw new Error("identical channel");
        }
      }
    }
  },
};
