const fs = require("fs");
const levenshtein = require("js-levenshtein");
const { MessageEmbed } = require("discord.js");
const leaderboardSchema = require("@schemas/typeracer-leaderboard-schema");
const { findMember } = require("@utils/helper.js");

module.exports = {
  name: ["typeracer", "type", "t"],
  description: "typing contest",
  usage: `${process.env.PREFIX}typeracer\n${process.env.PREFIX}typeracer top\n${process.env.PREFIX}typeracer me\n${process.env.PREFIX}typeracer <@user>`,
  async execute(interaction, args) {
    const prompts = JSON.parse(fs.readFileSync("./prompts.json"));
    const currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    const averageWordLength = 4.5;

    // allot more time for longer prompts
    const time = Math.floor((currentPrompt.length / averageWordLength) * 1.7);

    let timeStarted;
    const filter = m => !m.author.bot;
    let counter = 4;
    const finishedIDs = [];

    const countdownText = () => `**${counter}**...`;

    if (!args.length) {
      const initialEmbed = new MessageEmbed({
        color: "#6a00ff",
        description: `🕑 You will have ${time} seconds to finish this prompt.`,
      });

      await interaction.channel.send({ embeds: [initialEmbed] });
      countdown();
    } else {
      switch (args[0]) {
        case "top":
          showStats();
          break;
        case "stats":
        case "me":
          showStats(interaction.author);
          break;
        default:
          showStats(findMember(args[0], interaction));
          break;
      }
    }

    async function countdown() {
      const msg = await interaction.channel.send(countdownText());

      const updateTime = finished => {
        if (finished) return;
        msg.edit(countdownText());

        if (counter <= 1) {
          finished = true;
          setTimeout(() => {
            const promptEmbed = new MessageEmbed()
              .setColor("#2af7ed")
              .setDescription(currentPrompt.replace(/ /g, " \u200B"));
            msg.edit({ embeds: [promptEmbed], content: null }).then(startGame());
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
      const collector = interaction.channel.createMessageCollector({ filter, time: time * 1000 });
      timeStarted = Date.now();

      collector.on("collect", m => {
        answerLogic(m);
      });
    }

    async function answerLogic(msg) {
      if (finishedIDs.includes(msg.author.id)) return;

      const { content: response } = msg;

      // minimum edit distance (errors)
      const distance = levenshtein(currentPrompt, response);

      // ignore response if too many errors
      if (distance > currentPrompt.length / 25) return;

      const elapsedTime = (Date.now() - timeStarted) / 1000;
      const wpm = (currentPrompt.length / 4.5 / elapsedTime) * 60;
      finishedIDs.push(msg.author.id);
      let pb;

      await leaderboardSchema
        .findOneAndUpdate(
          {
            _id: msg.author.id,
          },
          {
            _id: msg.author.id,
            name: msg.author.username,
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

      const summaryEmbed = new MessageEmbed()
        .setColor("#80ff80")
        .setTitle(`${msg.author.username} finished the race!`)
        .addField("**Place**", `#${finishedIDs.length}`, true)
        .addField("**WPM**", wpm.toFixed(1), true)
        .addField("**Errors**", distance.toString(), true)
        .addField("**Best WPM**", pb.toString(), true);

      interaction.channel.send({ embeds: [summaryEmbed] });
    }

    async function showStats(user) {
      const index = await leaderboardSchema.find().sort({ wpm: -1 });
      let statEmbed;

      if (!user) {
        // top 10 leaderboard
        const top = 10;
        const j = Math.min(top, index.length);

        let str = "";
        for (let i = 0; i < j; i++) {
          str += `**#${i + 1}**: <@${index[i]._id}> | **${index[i].wpm}** wpm\n`;
        }

        statEmbed = new MessageEmbed()
          .setColor("#80ff80")
          .addFields({ name: `Showing top ${j} typeracer scores`, value: str });
      } else {
        // specific user stats
        const matchId = obj => obj._id == user.id;
        const i = index.findIndex(matchId);

        if (!index[i]) {
          interaction.reply("there are no stats for this user!");
          return;
        }

        statEmbed = new MessageEmbed()
          .setColor("#80ff80")
          .setTitle(`Showing stats for ${index[i].name}`)
          .addField("**Best WPM**", index[i].wpm, true)
          .addField("**WPM Rank**", `#${i + 1}`, true)
          .addField("**Average WPM**", (index[i].wpmsum / index[i].gamesplayed).toFixed(1));
      }

      interaction.reply({ embeds: [statEmbed], allowedMentions: { repliedUser: false } });
    }
  },
};
