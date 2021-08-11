const fs = require("fs");
const levenshtein = require("js-levenshtein");
const Discord = require("discord.js");
const leaderboardSchema = require("@schemas/typeracer-leaderboard-schema");
const { findMember } = require("@utils/helper.js");

module.exports = {
  name: ["typeracer", "type", "t"],
  description: "typing contest",
  usage: `${process.env.PREFIX}typeracer\n${process.env.PREFIX}typeracer top\n${process.env.PREFIX}typeracer me\n${process.env.PREFIX}typeracer <@user>`,
  async execute(message, args) {
    const prompts = JSON.parse(fs.readFileSync("./prompts.json"));
    const currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const t = Math.floor((currentPrompt.length / 4.5) * 1.7);
    let timeStarted;
    let filter = m => !m.author.bot;
    let counter = 4;
    let finishedIDs = [];

    const countdownText = () => {
      return `**${counter}**...`;
    };

    if (!args.length) {
      let initialEmbed = new Discord.MessageEmbed()
        .setColor("#6a00ff")
        .setDescription(`🕑 You will have ${t} seconds to finish this prompt.`);
      message.channel.send({ embed: [initialEmbed] }).then(countdown());
    } else {
      switch (args[0]) {
        case "top":
          showStats();
          break;
        case "me":
          showStats(message.author);
          break;
        default:
          showStats(findMember(args[0], message));
          break;
      }
    }

    async function countdown() {
      const msg = await message.channel.send(countdownText());
      const updateTime = finished => {
        if (finished) return;
        msg.edit(countdownText());

        if (counter <= 1) {
          finished = true;
          setTimeout(() => {
            let promptEmbed = new Discord.MessageEmbed()
              .setColor("#2af7ed")
              .setDescription(currentPrompt.replace(/ /g, " \u200B"));
            msg.edit({ embeds: [promptEmbed] }).then(startGame());
          }, 1000);
        }

        counter--;

        // loop until finished counting down
        setTimeout(() => {
          updateTime(finished);
        }, 1000);
      };
      updateTime();
    }

    function startGame() {
      collector = message.channel.createMessageCollector(filter, { time: t * 1000 });
      timeStarted = Date.now();

      collector.on("collect", m => {
        answerLogic(m);
      });
      collector.on("end", collected => {});
    }

    async function answerLogic(msg) {
      if (finishedIDs.includes(msg.author.id)) return;

      let response = msg.content;
      let distance = levenshtein(currentPrompt, response);
      if (distance > currentPrompt.length / 25) return;
      let elapsedTime = (Date.now() - timeStarted) / 1000;
      let wpm = (currentPrompt.length / 4.5 / elapsedTime) * 60;
      finishedIDs.push(msg.author.id);
      let pb;

      await leaderboardSchema
        .findOneAndUpdate(
          {
            _id: message.author.id,
          },
          {
            _id: message.author.id,
            name: message.author.username,
            $max: {
              wpm: wpm.toFixed(1),
            },
            $inc: {
              gamesplayed: 1,
              wpmsum: wpm,
            },
          },
          {
            upsert: true,
            new: true,
          }
        )
        .then(result => {
          pb = result.wpm;
        });

      const summaryEmbed = new Discord.MessageEmbed()
        .setColor("#80ff80")
        .setTitle(`${msg.author.username} finished the race!`)
        .addField("**Place**", `#${finishedIDs.length}`, true)
        .addField("**WPM**", wpm.toFixed(1), true)
        .addField("**Errors**", distance, true)
        .addField("**Best WPM**", pb, true);

      message.channel.send({ embeds: [summaryEmbed] });
    }

    async function showStats(user) {
      const index = await leaderboardSchema.find().sort({ wpm: -1 });
      var statEmbed;

      if (!user) {
        // top 10 leaderboard
        let top = 10;
        let j = Math.min(top, index.length);
        let str = "";

        for (i = 0; i < j; i++) {
          str += `**#${i + 1}**: <@${index[i]._id}> | **${index[i].wpm}** wpm\n`;
        }

        statEmbed = new Discord.MessageEmbed()
          .setColor("#80ff80")
          .addFields({ name: `Showing top ${j} typeracer scores`, value: str });
      } else {
        // specific user stats
        const matchId = obj => obj._id == user.id;
        let i = index.findIndex(matchId);

        if (!index[i]) {
          message.reply("there are no stats for this user!");
          return;
        }

        statEmbed = new Discord.MessageEmbed()
          .setColor("#80ff80")
          .setTitle(`Showing stats for ${index[i].name}`)
          .addField("**Best WPM**", index[i].wpm, true)
          .addField("**WPM Rank**", `#${i + 1}`, true)
          .addField("**Average WPM**", (index[i].wpmsum / index[i].gamesplayed).toFixed(1));
      }

      message.reply({ embeds: [statEmbed], allowedMentions: { repliedUser: false } });
    }
  },
};
