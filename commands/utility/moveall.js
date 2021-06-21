const helper = require("../../utils/helper.js");
module.exports = {
  name: ["moveall", "move", "m"],
  description: "move all members to another voice channel",
  usage: `${process.env.PREFIX}moveall <channel>`,
  category: "Utility",
  required_perms: ["MOVE_MEMBERS"],
  execute(message, args) {
    if (!args.length) {
      message.reply("missing arguments!");
    } else {
      let destination = args.length > 1 ? helper.FindVC(args[1], message) : helper.FindVC(args[0], message);
      let origin = args.length > 1 ? helper.FindVC(args[0], message) : message.member.voice.channel;
      MoveToChannel(origin, destination);
    }

    function MoveToChannel(origin, destination) {
      if (CheckValid(origin, destination)) {
        origin.members.each(user =>
          user.voice.setChannel(destination).catch(error => {
            console.error(error);
          })
        );
        console.log(`${message.member.displayName} moved ${origin.members.size} members from ${origin.name} to ${destination.name}!`.green);
        message.channel.send(`${message.member.displayName} moved ${origin.members.size} members from \`${origin.name}\` to \`${destination.name}\`!`).then(msg => {
          msg.delete({ timeout: 1000 });
          message.delete({ timeout: 1000 });
        });
      }
    }

    function CheckValid(origin, destination) {
      if (!message.member.voice.channel) {
        message.reply("you must be in a voice channel!");
        return false;
      } else if (origin == null || destination == null || destination.type !== "voice") {
        message.reply("invalid arguments!");
        return false;
      } else if (!message.member.permissionsIn(destination).has("CONNECT")) {
        return false;
      } else return true;
    }
  },
};
