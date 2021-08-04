const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const numeral = require("numeral");
const { awardMoney, getBalance, formatWager, formatMoney, toNumber } = require("@utils/economy");

const columns = 5;
const rows = 5;
const factorial = [
  1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000,
  20922789888000, 355687428096000, 6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000,
  1124000727777607680000, 25852016738884976640000, 620448401733239439360000, 15511210043330985984000000,
];

const hiddenButton = new MessageButton().setLabel(" ").setStyle("SECONDARY").setCustomId("hiddenButton");
const gemButton = new MessageButton().setEmoji("💎").setStyle("PRIMARY").setCustomId("gemButton");
const mineButton = new MessageButton().setEmoji("💣").setStyle("DANGER").setCustomId("mineButton");
const cashoutButton = new MessageButton().setLabel("Cash out").setStyle("SUCCESS").setCustomId("cashoutButton");

module.exports = {
  name: "mines",
  description: "you lose if you reveal a mine",
  usage: `${process.env.PREFIX}mines <number of mines> <bet>`,
  slash: true,
  options: [
    { name: "mines", type: "INTEGER", description: "the number of mines on the board (1-24)", required: true },
    { name: "bet", type: "STRING", description: "your wager", required: true },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    let numMines, wager, user;

    if (isSlash) {
      numMines = interaction.options.get("mines").value;
      wager = formatWager(interaction.options.getString("bet"));
      user = interaction.user;
    } else {
      user = interaction.author;

      if (args[0] && args[1]) {
        numMines = Math.floor(toNumber(args[0]));
        wager = formatWager(args[1]);
      } else {
        return interaction.reply({
          content: `⚠ **To play, use this command: \`${module.exports.usage}\`**`,
        });
      }
    }

    if (numMines < 1 || numMines > 24) {
      return interaction.reply({ content: "⚠ **You must choose between 1-24 mines.**", ephemeral: true });
    }

    const balance = await getBalance(user.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return interaction.reply({
        content: `🚫 **Insufficient balance! Your balance is ${formatMoney(balance)}**.`,
        ephemeral: true,
      });
    } else if (wager < 0.01) {
      return interaction.reply({ content: `🚫 **You must bet more than $0.00.**`, ephemeral: true });
    }

    // set up
    const grid = createArray(rows, columns);
    const cells = [];

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        grid[i][j] = new Cell(i, j);
        cells.push([i, j]);
      }
    }

    // randomly assign mines
    for (let n = 0; n < numMines; n++) {
      const index = Math.floor(Math.random() * cells.length);
      const i = cells[index][0];
      const j = cells[index][1];

      cells.splice(index, 1);
      grid[i][j].mine = true;
    }

    // create array of MessageActionRows
    let buttonRows = createButtonGrid(rows, columns, grid);

    const { currentProfit, currentMult, nextProfit, nextMult, winOdds } = calculateMultiplier(numMines, 0, wager);
    let minesEmbed = new MessageEmbed()
      .setTitle("💣 Mines")
      .setColor("#ffffff")
      .addField("**Mines**", numMines.toString(), true)
      .addField("**Total Profit**", `${formatMoney(currentProfit)} (${currentMult}x)`, true)
      .addField("**Profit on Next Tile**", `${formatMoney(nextProfit)} (${nextMult.toFixed(2)}x)`, true)
      .addField("**Win % of Next Tile**", `${numeral(winOdds).format("0.00%")}`, true);

    await interaction.defer?.();
    const msg = isSlash
      ? await interaction.editReply({
          components: buttonRows,
          embeds: [minesEmbed],
          allowedMentions: { repliedUser: false },
        })
      : await interaction.reply({
          components: buttonRows,
          embeds: [minesEmbed],
          allowedMentions: { repliedUser: false },
        });

    // have to send a second message for the 26th button
    // send a 1x1 image to get a small gap
    const cashoutMessage = await interaction.channel.send({
      components: [{ type: 1, components: [cashoutButton] }],
      files: ["https://cdn.discordapp.com/attachments/793778786943762434/858505668481515540/image.png"],
    });

    const btnFilter = button => button.user.id === user.id;
    const btnCollector = msg.createMessageComponentCollector({ filter: btnFilter });
    const cashoutCollector = cashoutMessage.awaitMessageComponent({ filter: btnFilter });

    let cellsRevealed = 0;

    btnCollector.on("collect", button => {
      const row = Math.floor(button.customId / rows);
      const col = button.customId % rows;
      if (!grid[row][col].revealed) {
        grid[row][col].reveal();
      } else {
        return;
      }

      // game over, reveal each cell
      if (grid[row][col].mine) {
        const { nextProfit, nextMult, winOdds } = calculateMultiplier(numMines, cellsRevealed, wager);

        btnCollector.stop();
        cashoutMessage.delete();
        revealGrid(grid);

        minesEmbed = new MessageEmbed()
          .setTitle("💣 Mines")
          .setDescription("**You lost!**")
          .setColor("ff0000")
          .addField("**Mines**", numMines.toString(), true)
          .addField("**Profit**", formatMoney(-wager), true)
          .addField("**Balance**", formatMoney(balance - wager), true)
          .addField("**Potential Profit**", `${formatMoney(nextProfit)} (${nextMult.toFixed(2)}x)`, true)
          .addField("**Win %**", numeral(winOdds).format("0.00%"), true);

        awardMoney(user.id, -wager);
      } else {
        cellsRevealed++;
        const res = calculateMultiplier(numMines, cellsRevealed, wager);
        const { currentProfit, currentMult, currentOdds, nextMult, nextProfit, winOdds } = res;

        // revealed all non-mines
        if (25 - numMines == cellsRevealed) {
          btnCollector.stop();
          cashoutMessage.delete();
          revealGrid(grid);

          minesEmbed = new MessageEmbed()
            .setDescription("**You won!**")
            .setTitle("💣 Mines")
            .setColor("#2bff00")
            .addField("**Profit**", `${formatMoney(currentProfit)} (${currentMult.toFixed(2)}x)`, true)
            .addField("**Balance**", formatMoney(balance + currentProfit), true)
            .addField("**Win %**", numeral(currentOdds).format("0.00%"), true);

          awardMoney(user.id, currentProfit);
        } else {
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Mines**", numMines.toString(), true)
            .addField("**Total Profit**", `${formatMoney(currentProfit)} (${currentMult}x)`, true)
            .addField("**Profit on Next Tile**", `${formatMoney(nextProfit)} (${nextMult.toFixed(2)}x)`, true)
            .addField("**Win % of Next Tile**", `${numeral(winOdds).format("0.00%")}`, true);
        }
      }

      buttonRows = createButtonGrid(rows, columns, grid);
      button.update({ components: buttonRows, embeds: [minesEmbed] });
    });

    cashoutCollector
      .then(button => {
        const res = calculateMultiplier(numMines, cellsRevealed, wager);
        btnCollector.stop();
        cashoutMessage.delete();
        revealGrid(grid);

        if (cellsRevealed > 0) {
          const { currentProfit, currentMult, currentOdds } = res;
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#2bff00")
            .addField("**Profit**", `${formatMoney(currentProfit)} (${currentMult.toFixed(2)}x)`, true)
            .addField("**Balance**", formatMoney(balance + currentProfit), true)
            .addField("**Win %**", numeral(currentOdds).format("0.00%"), true);

          awardMoney(user.id, currentProfit);

          buttonRows = createButtonGrid(rows, columns, grid);
          button.deferUpdate();
          msg.edit({ components: buttonRows, embeds: [minesEmbed] });
        } else {
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Profit**", `${formatMoney(0)} (1.00x)`, true)
            .addField("**Balance**", formatMoney(balance), true);

          buttonRows = createButtonGrid(rows, columns, grid);
          button.deferUpdate();
          msg.edit({ components: buttonRows, embeds: [minesEmbed] });
        }
      })
      .catch(() => {
        // ignore message delete error
      });
  },
};

function createArray(rows, cols) {
  const arr = new Array(rows);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(cols);
  }
  return arr;
}

function Cell(x, y) {
  this.x = x;
  this.y = y;
  this.mine = false;
  this.revealed = false;
  this.disabled = false;
}

Cell.prototype.buttonState = function () {
  if (this.revealed) {
    if (this.mine) {
      const button = mineButton;
      button.setCustomId(`${this.x * columns + this.y}`);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    } else {
      const button = gemButton;
      button.setCustomId(`${this.x * columns + this.y}`);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    }
  } else {
    const button = hiddenButton;
    button.setCustomId(`${this.x * columns + this.y}`);
    return button;
  }
};

Cell.prototype.reveal = function (specific = true) {
  this.revealed = true;
  if (!specific) this.disabled = true;
};

function createButtonGrid(rows, columns, grid) {
  // create discord buttons
  const buttonRows = new Array(rows);
  for (let i = 0; i < rows; i++) {
    buttonRows[i] = new MessageActionRow();
    for (let j = 0; j < columns; j++) {
      buttonRows[i].addComponents([grid[i][j].buttonState()]);
    }
  }
  return buttonRows;
}

// bombs + clicked mines
function calculateMultiplier(mines, revealed, wager) {
  const currentOdds = winProbability(mines, revealed);
  const winOdds = winProbability(mines, revealed + 1);
  const currentMult = Math.round(100 * (1 / currentOdds)) / 100;
  const currentProfit = wager * currentMult - wager;
  const nextMult = Math.round(100 * (1 / winOdds)) / 100;
  const nextProfit = wager * nextMult - wager;
  return { currentProfit, currentMult, nextProfit, nextMult, winOdds, currentOdds, numMines: mines };
}

const winProbability = (mines, revealed) =>
  (factorial[25 - mines] * factorial[25 - revealed]) / (factorial[25] * factorial[25 - (mines + revealed)]);

function revealGrid(grid) {
  grid.forEach(row =>
    row.forEach(cell => {
      if (!cell.revealed) cell.reveal(false);
    })
  );
}
