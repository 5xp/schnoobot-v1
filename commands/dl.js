const { MessageAttachment } = require("discord.js");
const helper = require("../helper.js");
const ytdl = require("youtube-dl");
const fs = require("fs");

module.exports = {
  name: "dl",
  description: "download and send videos",
  execute(message, args) {
    if (!args[0]) message.reply(`invalid args!`);
    const url = args[0].replace(/[<>]/g, "");
    const path = `./temp/video.mp4`;

    const video = ytdl(url)
      .pipe(fs.createWriteStream(path))
      .on("close", function () {
        let sendAttachment = new MessageAttachment(path);
        message.channel.send(sendAttachment).catch(error => {
          console.error(error);
          message.reply(error.message);
        });
        fs.unlink(path, err => {
          if (err) throw err;
        });
      });

    function DeleteVideo(path) {
      try {
        fs.unlink(path);
      } catch (err) {
        console.error(err);
      }
    }
  },
};
