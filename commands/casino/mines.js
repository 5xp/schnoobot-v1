const { MessageButton, MessageActionRow } = require("discord-buttons");
const { MessageEmbed } = require("discord.js");
const numeral = require("numeral");
const { AwardPoints, GetUserData } = require("../../utils/coin");

const columns = 5;
const rows = 5;

// beginning state of all buttons
const hiddenButton = new MessageButton().setLabel(" ").setStyle("gray").setID("hiddenButton");

// revealed gem
const gemButton = new MessageButton().setEmoji("💎").setStyle("blurple").setID("gemButton"); //.setDisabled(true);

// revealed mine
const mineButton = new MessageButton().setEmoji("💣").setStyle("red").setID("mineButton"); //.setDisabled(true);

module.exports = {
  name: "mines",
  description: "you lose if you reveal a mine",
  usage: `${process.env.PREFIX}mines <number of mines> <bet>`,
  async execute(message, args) {
    if (args[0] !== undefined && args[1] !== undefined) {
      var numMines = Math.round(numeral(args[0]).value());
      var wager = args[1].toLowerCase() === "all" ? "all" : numeral(numeral(args[1]).format("0.00")).value();
    } else {
      return message.reply(`to play, use this command: \`${module.exports.usage}\``);
    }

    if (numMines < 1 || numMines > 24) return message.reply("you must have between 1-24 mines!");

    const data = await GetUserData(message.author);
    var balance = data === null ? 0 : +data.coins.toString();
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    // set up
    let grid = createArray(rows, columns);
    let cells = [];
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < columns; j++) {
        grid[i][j] = new Cell(i, j);
        cells.push([i, j]);
      }
    }

    // randomly assign mines
    for (var n = 0; n < numMines; n++) {
      let index = Math.floor(Math.random() * cells.length);
      let i = cells[index][0];
      let j = cells[index][1];

      cells.splice(index, 1);
      grid[i][j].mine = true;
    }

    // create discord buttons
    var buttonRows = createButtonGrid(rows, columns, grid);

    let [, , nextProfit, nextMult] = calculateMultiplier(numMines, wager);

    let minesEmbed = new MessageEmbed()
      .setTitle("💣 Mines")
      .setColor("#ffffff")
      .addField("**Mines**", numMines, true)
      .addField("**Total Profit**", `${numeral(0).format("$0,0.00")} (1.00x)`, true)
      .addField("**Profit on Next Tile**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true);

    const msg = await message.channel.send({ components: buttonRows, embed: minesEmbed });

    const btnFilter = button => button.clicker.user.id === message.author.id;
    const btnCollector = msg.createButtonCollector(btnFilter);
    let collectorFlag = false;

    let cellsRevealed = 0;

    btnCollector.on("collect", button => {
      const row = Math.floor(button.id / rows);
      const col = button.id % rows;
      if (!grid[row][col].revealed) {
        grid[row][col].reveal();
      } else {
        return;
      }

      // game over, reveal each cell
      if (grid[row][col].mine) {
        btnCollector.stop();
        revealGrid(grid);
        minesEmbed = new MessageEmbed()
          .setTitle("💣 Mines")
          .setDescription("**You lost!**")
          .setColor("ff0000")
          .addField("**Mines**", numMines, true)
          .addField("**Profit**", numeral(-wager).format("$0,0.00"), true)
          .addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);
      } else {
        cellsRevealed++;

        // revealed all non-mines
        if (25 - numMines == cellsRevealed) {
          btnCollector.stop();
          revealGrid(grid);
          minesEmbed = new MessageEmbed()
            .setDescription("**You won!**")
            .setTitle("💣 Mines")
            .setColor("#2bff00")
            .addField("**Profit**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
            .addField("**Balance**", numeral(balance + nextProfit).format("$0,0.00"), true);
        } else {
          let [currentProfit, currentMult, nextProfit, nextMult] = calculateMultiplier(numMines + cellsRevealed, wager);

          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Mines**", numMines, true)
            .addField("**Total Profit**", `${numeral(currentProfit).format("$0,0.00")} (${currentMult}x)`, true)
            .addField("**Profit on Next Tile**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
            .setFooter('Type "cashout" to cash out');

          if (!collectorFlag) {
            collectorFlag = true;
            const msgFilter = msg => msg.author.id === message.author.id && msg.content.toLowerCase().includes("cashout");
            const msgCollector = message.channel.createMessageCollector(msgFilter);
            msgCollector.on("collect", m => {
              revealGrid(grid);
              minesEmbed = new MessageEmbed()
                .setDescription("**You won!**")
                .setTitle("💣 Mines")
                .setColor("#2bff00")
                .addField("**Profit**", `${numeral(currentProfit).format("$0,0.00")} (${currentMult.toFixed(2)}x)`, true)
                .addField("**Balance**", numeral(balance + currentProfit).format("$0,0.00"), true);
              msgCollector.stop();
              btnCollector.stop();

              buttonRows = createButtonGrid(rows, columns, grid);
              msg.edit({ components: buttonRows, embed: minesEmbed });
            });
          }
        }
      }

      buttonRows = createButtonGrid(rows, columns, grid);
      msg.edit({ components: buttonRows, embed: minesEmbed });
    });
  },
};

function createArray(rows, cols) {
  let arr = new Array(rows);
  for (var i = 0; i < arr.length; i++) {
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
      let button = mineButton;
      button.setID(this.x * columns + this.y);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    } else {
      let button = gemButton;
      button.setID(this.x * columns + this.y);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    }
  } else {
    let button = hiddenButton;
    button.setID(this.x * columns + this.y);
    return button;
  }
};

Cell.prototype.reveal = function (specific = true) {
  this.revealed = true;
  if (!specific) this.disabled = true;
};

function createButtonGrid(rows, columns, grid) {
  // create discord buttons
  let buttonRows = new Array(rows);
  for (var i = 0; i < rows; i++) {
    buttonRows[i] = new MessageActionRow();
    for (var j = 0; j < columns; j++) {
      buttonRows[i].addComponent(grid[i][j].buttonState());
    }
  }
  return buttonRows;
}

// bombs + clicked mines
function calculateMultiplier(sum, wager) {
  let currentMult = Math.round(100 * (25 / (26 - sum))) / 100;
  let currentProfit = wager * currentMult - wager;
  let nextMult = Math.round(100 * (25 / (25 - sum))) / 100;
  let nextProfit = wager * nextMult - wager;
  return [currentProfit, currentMult, nextProfit, nextMult];
}

function revealGrid(grid) {
  grid.forEach(row =>
    row.forEach(cell => {
      if (!cell.revealed) cell.reveal(false);
    })
  );
}
