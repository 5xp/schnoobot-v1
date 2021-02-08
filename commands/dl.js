const { MessageAttachment } = require("discord.js");
const helper = require("../helper.js");
const ytdl = require("youtube-dl");
const fs = require("fs");

module.exports = {
  name: "dl",
  description: "download and send videos",
  execute(message, args) {
    if (!args[0]) {
      message.reply(`invalid arguments!`);
      return;
    }

    const url = args[0].replace(/[<>]/g, "");
    const path = `./temp/video.mp4`;

    if (args.length > 1) options = helper.JoinArgs(args.slice(1)).split(", ");
    else options = ["--dump-json", "-f best"];

    message.channel.send("Attempting to download file...").then(console.log(`${message.author.username} is downloading a video from ${url}`.yellow));

    const video = ytdl(url, options)
      .pipe(fs.createWriteStream(path))
      .on("close", function () {
        let sendAttachment = new MessageAttachment(path);
        message.channel
          .send(sendAttachment)
          .then(message.channel.send("Uploading file..."))
          .catch(error => {
            console.error(error);
            message.reply(error.message);
          });
        //setTimeout(() => {
        //  fs.unlink(path, err => {
        //    if (err) throw err;
        //  });
        //}, 16000);
      });
  },
};
