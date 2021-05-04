const Discord = require("discord.js");
const helper = require("../utils/helper.js");
const youtubedl = require("youtube-dl");
const fs = require("fs");
const { getVideoDurationInSeconds } = require("get-video-duration");
const { getAudioDurationInSeconds } = require("get-audio-duration");
const ffmpeg = require("ffmpeg");

const format1 = "--format=bestvideo[ext=mp4][filesize<8M]+bestaudio[ext=m4a]";
const format2 = "--format=worstvideo[ext=mp4][filesize>8M]+bestaudio[ext=m4a]";
const format3 = "--format=bestvideo[ext=mp4][filesize<200M]+bestaudio[ext=m4a]";

module.exports = {
  name: "dl",
  alias: ["download", "tiktok", "youtube"],
  description: "download and send videos",
  usage: `\`${process.env.PREFIX}dl <url>\``,
  category: "Utility",
  async execute(message, args, silent = false) {
    if (!args[0]) {
      message.reply(`invalid arguments!`);
      return;
    }

    const url = args.shift().replace(/[<>]/g, "");
    const dir = `${process.cwd()}/temp`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    console.log(`${message.author.username} is attempting to download a video from ${url}`.yellow);
    message.channel.startTyping();

    youtubedl.exec(url, ["-o", `${dir}/${message.id}.%(ext)s`, `${format1}/${format2}/${format3}/best[ext=mp4][filesize<200M]/bestvideo+bestaudio/best`], {}, async (err, output) => {
      if (err) {
        console.log(err);
        const err_str = err.stderr.match(/^ERROR.*$/gm);
        return message.reply(err_str.join("\n"));
      }

      console.log(output.join("\n"));

      let path = `${dir}/${message.id}`;

      // probably a better way to get the file extension
      if (fs.existsSync(`${path}.mp4`)) var ext = "mp4";
      else if (fs.existsSync(`${path}.mp3`)) var ext = "mp3";
      path = `${path}.${ext}`;
      const originalpath = path;

      const stats = fs.statSync(path);
      const megabytes = stats.size / (1024 * 1024);

      if (megabytes > 8) {
        console.log(`Filesize is greater than 8 megabytes! (${megabytes.toFixed(2)}M)`.red);
        var msg = await message.channel.send(`File is too large - compressing... (${megabytes.toFixed(2)} MB)`);
        await compress(path, ext);
        path = path.slice(0, -4) + `_new.${ext}`;
      }

      // msg.edit("Sending...");
      const attachment = new Discord.MessageAttachment(path);
      await message.reply(attachment).catch(error => {
        if (!silent) message.reply(error.message);
      });
      if (msg) msg.delete();
      message.channel.stopTyping();
      fs.unlink(path, error => {
        if (error) throw error;
      });
      if (path !== originalpath)
        fs.unlink(originalpath, error => {
          if (error) throw error;
        });
    });
  },
};

const getDuration = async (path, ext) => {
  switch (ext) {
    case "mp4":
      return await getVideoDurationInSeconds(path);
    case "mp3":
      return await getAudioDurationInSeconds(path);
  }
};

async function compress(path, ext) {
  const duration = (await getDuration(path, ext)) * 1.5;
  const bitrate = (8 * 8196) / duration - 128;

  var process = new ffmpeg(path);
  video = await process;
  video.addCommand("-b:v", bitrate + "k");
  return video.save(path.slice(0, -4) + `_new.${ext}`);
}
