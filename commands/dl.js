const Discord = require("discord.js");
const helper = require("../helper.js");
const ytdl = require("youtube-dl");
const fs = require("fs");
const client = new Discord.Client();

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

    options = args.length > 1 ? helper.JoinArgs(args.slice(1)).split(", ") : ["--dump-json", "-f best"];

    message.channel.send("Getting video information...").then(console.log(`${message.author.username} is attempting to download a video from ${url}`.yellow));

    const video = ytdl(url, options)
      // check for error before we download file
      .on("error", function error(error) {
        message.reply(error.stderr);
        console.log(error);
      })
      .on("info", function (info) {
        message.channel.send("Downloading file...");
      })
      .pipe(fs.createWriteStream(path))

      // wait to send after it finishes downloading
      .on("close", function () {
        let sendAttachment = new Discord.MessageAttachment(path);
        message.channel
          .send(sendAttachment)
          .then(message.channel.send("Uploading file..."))
          // delete file after it finishes sending
          .then(() => {
            fs.unlink(path, err => {
              if (err) throw err;
            });
          })
          .catch(error => {
            console.error(error);
            message.reply(error.message);
          });
      });
  },
};
