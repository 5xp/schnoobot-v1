const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");

// TODO rules settings
// TODO create unique lobby code

module.exports = {
  name: "uno",
  description: "starts an uno game",
  slash: true,
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    if (!interaction.inGuild?.()) {
      return interaction.reply("You must start a game in a guild!");
    }

    const joinButton = new MessageButton().setStyle("PRIMARY").setLabel("Join").setCustomId("join");
    const startButton = new MessageButton().setStyle("SUCCESS").setLabel("Start Game").setCustomId("start");
    const leaveButton = new MessageButton().setStyle("DANGER").setLabel("Leave Game").setCustomId("leave");

    // pre-game lobby
    const players = [];

    const lobbyEmbed = new MessageEmbed().setTitle("Lobby").addField("Player List", `\u200B`).setFooter(`${players.length} players`).setColor("AQUA");

    await interaction.defer?.();

    let lobbyMsg;
    if (isSlash) lobbyMsg = await interaction.editReply({ embeds: [lobbyEmbed], components: [[joinButton]] });
    else lobbyMsg = await interaction.reply({ embeds: [lobbyEmbed], components: [[joinButton]] });

    const filter = interaction => interaction.message.id === lobbyMsg.id;
    const buttonCollector = lobbyMsg.createMessageComponentCollector({ filter, time: 600000 });

    buttonCollector.on("collect", async i => {
      playerJoin(i);
    });

    async function playerJoin(i) {
      if (players.map(player => player.id).includes(i.user.id)) {
        return i.reply({ content: "You are already in the game!", ephemeral: true });
      }

      try {
        await i.defer({ ephemeral: true });
        const dmMsg = await i.user.send({ embeds: [new MessageEmbed().setColor("AQUA").setTitle("Waiting for players...")], components: [[startButton, leaveButton]] });

        const player = new Player(players.length, i.member.user);
        players.push(player);
        player.setCollector(dmMsg);

        lobbyEmbed.fields[0].value = players.map(player => `*${player.name}*`).join("\n");
        lobbyEmbed.setFooter(`${players.length} players`);

        lobbyMsg.edit({ embeds: [lobbyEmbed], components: [[joinButton]] });
        i.followUp({ content: `You have joined uno! Click here to open our DM: https://discord.com/channels/@me/${dmMsg.channel.id}`, ephemeral: true });

        // wait for start or leave button press
        const dmI = await dmMsg.awaitMessageComponent({ filter: i => (!buttonCollector.ended && players.length > 1) || i.customId === "leave" }); //ignore if game already started

        if (dmI.customId === "leave") {
          players.splice(players.indexOf(player));

          dmI.reply({ content: "You have left Uno", ephemeral: true });
          lobbyEmbed.fields[0].value = players.map(player => `*${player.name}*`).join("\n") || "\u200B";
          lobbyEmbed.setFooter(`${players.length} players`);

          lobbyMsg.edit({ embeds: [lobbyEmbed], components: [[joinButton]] });

          dmMsg.delete();
        } else {
          // start game
          dmI.deferUpdate();
          buttonCollector.stop();
          lobbyEmbed.setTitle("Game in progress");
          lobbyMsg.edit({ embeds: [lobbyEmbed], components: [] });
          startGame(players, { bStack: interaction?.options.get?.("stack")?.value, bDrawOne: interaction?.options.get?.("draw")?.value }, winner => {
            // game ended
            lobbyEmbed.setTitle(`${winner.name} won the game!`).setColor("ORANGE");
            lobbyMsg.edit({ embeds: [lobbyEmbed] });
          });
        }
      } catch (error) {
        console.log(error);
        await i.editReply({
          content: "Failed to join Uno! Please enable DMs in this server's privacy settings and try again.",
          ephemeral: true,
        });
        return;
      }
    }
  },
};

async function startGame(players, options, callback) {
  const { bStack = true, bDrawOne = true } = options;

  let iTurn = 0,
    isReverse = false,
    nStacked = 0,
    isGameOver = false,
    winner;

  let deck = shuffleDeck(createUnoDeck()),
    discarded = [],
    history = [],
    // increments or decrements if reversed
    n = () => (isReverse ? -1 : 1),
    // wrap around if turn exceeds number of players
    nextTurn = () => (iTurn + n() + players.length) % players.length,
    // gets last played card
    topCard = () => discarded[discarded.length - 1];

  // randomize first turn
  iTurn = Math.floor(Math.random() * players.length);

  discarded.push(deck.pop());

  // deal cards
  for (const player of players) {
    drawCard(player.hand, 7);
  }

  // send a message and collect buttons from each player
  for (var i = 0; i < players.length; i++) {
    const player = players[i];

    const msg = await player.collector.edit({ content: handEmojis(player.hand), embeds: [createUnoEmbed(player)], components: createActionRows(player) });

    // attach collector to player object so it can be updated later
    const collector = await msg.createMessageComponentCollector();
    player.setCollector(collector);

    collector.on("collect", async i => {
      if (i.customId == "draw") {
        const drawnCard = drawCard(player.hand);

        // check if drawn card is playable and play it
        if (drawnCard.playable(topCard())) {
          player.hand.pop();
          await playSpecial(drawnCard, i);
          discarded.push(drawnCard);

          if (!drawnCard.isWild()) history.push(`${player.name} drew and played ${drawnCard.label()}`);
          else history.push(`${player.name} drew and played ${drawnCard.face}`);
        } else history.push(`${player.name} drew a card`);
        if (drawnCard.isWild()) return;
      } else if (i.customId.startsWith("wild")) {
        // handles wildcard color picking
        topCard().color = i.customId.substr(4);
        history.push(`${player.name} changed the color to ${topCard().color}`);
      } else {
        const card = player.hand[i.customId];
        player.hand.splice(i.customId, 1);
        await playSpecial(card, i);
        discarded.push(card);

        // let player pick a color
        if (card.isWild()) {
          history.push(`${player.name} played ${card.face}`);
          return;
        } else history.push(`${player.name} played ${card.label()}`);
      }

      if (player.hand.length === 0) {
        // player wins
        isGameOver = true;
        winner = player;
      }

      // advance turn and update each player
      iTurn = nextTurn();

      // update button user first so interaction doesn't fail
      await i.update({ content: handEmojis(player.hand), embeds: [createUnoEmbed(player)], components: createActionRows(player) });

      for (const p of players) {
        if (p !== player) {
          p.collector.message.edit({ content: handEmojis(p.hand), embeds: [createUnoEmbed(p)], components: createActionRows(p) });
        }
        if (isGameOver) p.collector.stop();
      }
      if (isGameOver) {
        collector.stop();
        callback(winner);
      }
    });
  }

  // handles special cards
  async function playSpecial(card, i) {
    switch (card.face) {
      case "Skip":
        iTurn = nextTurn();
        break;

      case "Reverse":
        isReverse = !isReverse;
        if (players.length === 2) iTurn = nextTurn();
        break;

      case "+2":
        // check if next player has a +2
        if (players[nextTurn()].hand.map(card => card.face).includes("+2")) {
          nStacked++;
        } else {
          // if not, draw each +2 to next player
          drawCard(players[nextTurn()].hand, (nStacked + 1) * 2);
          nStacked = 0;
          iTurn = nextTurn();
        }
        break;

      case "+4":
        if (players[nextTurn()].hand.map(card => card.face).includes("+4")) {
          nStacked++;
        } else {
          // if not, draw each +2 to next player
          drawCard(players[nextTurn()].hand, (nStacked + 1) * 4);
          nStacked = 0;
          iTurn = nextTurn();
        }
        await i.update({ components: [wildCardRow()] });
        break;

      case "Wildcard":
        await i.update({ components: [wildCardRow()] });
        break;
    }
  }

  function createUnoEmbed(p) {
    const embed = new MessageEmbed().setAuthor(`${players[iTurn].name}'s turn`, players[iTurn].user.avatarURL({ format: "png", dynamic: true, size: 2048 })).setColor(topCard().color.toUpperCase());

    // bold user's name and underline turn
    const fields = players.map(player => {
      let { name } = player;
      if (player === p) name = `**You**`;
      if (player.i === iTurn) name = `__${name}__`;
      return name;
    });

    let desc, joined;

    if (isReverse) desc = fields.join(" < ");
    else desc = fields.join(" > ");

    if (history.length > 0) {
      if (history.length > 4) {
        history.splice(0, history.length - 4);
      }
      joined = history.join("\n");
      desc = desc.concat(`\n\n*${joined}*`);
    }

    embed.setDescription(desc);

    embed.setImage(getEmojiLink(getEmojiId(topCard(), true)));

    for (var i = 0; i < players.length; i++) {
      if (players[i].hand.length === 0) embed.addField(fields[i], "**🏆Winner**", true);
      else embed.addField(fields[i], handEmojis(players[i].hand, true), true);
    }

    if (isGameOver) embed.setAuthor("Uno Game").setDescription(joined);

    return embed;
  }

  // turns player hand into MessageActionRows and MessageButtons
  function createActionRows(p) {
    // player won
    if (isGameOver) return [];
    const { hand } = p;
    const isTurn = p.i !== iTurn;

    // TODO create left and right buttons if someone has too many cards
    // start at 1 because of draw card button
    const rows = new Array(Math.ceil((hand.length + 1) / 5));

    for (var i = 0; i < rows.length; i++) {
      rows[i] = new MessageActionRow();
    }

    const drawCardButton = new MessageButton().setLabel("Draw Card").setStyle("DANGER").setCustomId("draw").setDisabled(isTurn);
    rows[0].addComponents([drawCardButton]);

    for (var j = 0; j < hand.length; j++) {
      const r = Math.floor((j + 1) / 5);
      const button = new MessageButton().setEmoji(getEmojiId(hand[j])).setStyle("SECONDARY").setCustomId(j.toString());
      if (isTurn || !hand[j].playable(topCard())) button.setDisabled(true);
      rows[r].addComponents([button]);
    }

    return rows;
  }

  function drawCard(hand, n = 1) {
    // if we run out of cards, replace with discarded pile and shuffle
    if (deck.length === 0) {
      console.log("We ran out of cards!");
      [deck, discarded] = [discarded, deck];
      discarded.push(deck.pop());
      shuffleDeck(deck);
    }

    // rare - should only happen if discarded pile is also empty
    if (deck.length === 0) {
      console.log("Deck is still empty - refilling");
      deck = shuffleDeck(createUnoDeck());
    }

    const card = deck.pop();
    hand.push(card);

    if (n > 1) {
      drawCard(hand, n - 1);
    }

    return card;
  }
}

function createUnoDeck() {
  const deck = [];
  const colors = ["Red", "Yellow", "Green", "Blue"];
  const faces = ["0", "1", "1", "2", "2", "3", "3", "4", "4", "5", "5", "6", "6", "7", "7", "8", "8", "9", "9", "Skip", "Skip", "Reverse", "Reverse", "+2", "+2", "Wildcard", "+4"];
  for (var i = 0; i < colors.length; i++) {
    for (var j = 0; j < faces.length; j++) {
      const card = new Card(colors[i], faces[j]);
      deck.push(card);
    }
  }
  return deck;
}

function Card(color, face) {
  this.color = color;
  this.face = face;
}

Card.prototype.label = function () {
  return this.color + " " + this.face;
};

Card.prototype.playable = function (topCard) {
  if (this.isWild()) return true;

  if (this.color === topCard.color || this.face === topCard.face) return true;

  return false;
};

Card.prototype.isWild = function () {
  return this.face === "+4" || this.face === "Wildcard";
};

function shuffleDeck(deck) {
  for (var i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function Player(i, user) {
  this.i = i;
  this.user = user;
  this.id = this.user.id;
  this.name = this.user.username;
  this.hand = [];
  this.collector;
}

Player.prototype.setCollector = function (c) {
  this.collector = c;
};

function wildCardRow() {
  const colors = ["Red", "Yellow", "Green", "Blue"];
  const wildRow = new MessageActionRow();
  for (color of colors) {
    const button = new MessageButton().setLabel(color).setStyle("SECONDARY").setCustomId(`wild${color}`);
    wildRow.addComponents([button]);
  }
  return wildRow;
}

// create a string of emojis to show your hand
const handEmojis = (hand, hidden = false) => {
  if (hidden) {
    return "<:b_:863057739546230814> ".repeat(hand.length) || null;
  }
  const strings = hand.map(card => getEmojiString(card)).join(" ");
  return strings || null;
};

const getEmojiId = (card, played = false) => {
  const clr = card.color[0].toLowerCase();
  switch (card.face) {
    case "Wildcard":
      if (played) return emojis[clr + "b"];
      return "863005935911043082";
    case "+4":
      if (played) return emojis[clr + "f"];
      return "863005936100835328";
    case "Skip":
      return emojis[clr + "s"];
    case "+2":
      return emojis[clr + "t"];
    case "Reverse":
      return emojis[clr + "r"];
    default:
      return emojis[clr + card.face];
  }
};

const getEmojiString = card => {
  const clr = card.color[0].toLowerCase();
  switch (card.face) {
    case "Wildcard":
      return "<:w:863005935911043082>";
    case "+4":
      return "<:f_:863005936100835328>";
    case "Skip":
      return `<:${clr}s:${emojis[clr + "s"]}>`;
    case "+2":
      return `<:${clr}t:${emojis[clr + "t"]}>`;
    case "Reverse":
      return `<:${clr}r:${emojis[clr + "r"]}>`;
    default:
      return `<:${clr}${card.face}:${emojis[clr + card.face]}>`;
  }
};

const getEmojiLink = id => `https://cdn.discordapp.com/emojis/${id}.png?v=1`;

const emojis = {
  b0: "863001558139535381",
  b1: "863001558392111144",
  b2: "863001558551101440",
  b3: "863001559884759040",
  b4: "863001559566385193",
  b5: "863001559877156914",
  b6: "863001560128028693",
  b7: "863001559902322688",
  b8: "863001559910449182",
  b9: "863001559654596629",
  bb: "863001559948591154",
  bf: "863001559940202506",
  br: "863001559604658177",
  bs: "863001559994204170",
  bt: "863001559599546369",
  g0: "863001613395296306",
  g1: "863001613497008168",
  g2: "863001613219528715",
  g3: "863001613483376640",
  g4: "863001613567000606",
  g5: "863001613581025290",
  g6: "863001613634895912",
  g7: "863001613999276052",
  g8: "863001613619036170",
  g9: "863001613290962985",
  gb: "863001613760987136",
  gf: "863001613781958687",
  gr: "863001613744603167",
  gs: "863001614016184330",
  gt: "863001614058389524",
  r0: "863001644220022794",
  r1: "863001644143738900",
  r2: "863001643783553035",
  r3: "863001644136792084",
  r4: "863001643946737685",
  r5: "863001644232999002",
  r6: "863001644206391306",
  r7: "863001644110708737",
  r8: "863001644383862804",
  r9: "863001644300238868",
  rb: "863001644445597696",
  rf: "863001644102189057",
  rr: "863001644358303784",
  rs: "863001644349653002",
  rt: "863001644345982976",
  y0: "863001662016061441",
  y1: "863001673331900466",
  y2: "863001689242075146",
  y3: "863001702001016862",
  y4: "863001719038672896",
  y5: "863005877132722176",
  y6: "863005877161164840",
  y7: "863005877250555924",
  y8: "863005876943192066",
  y9: "863005877215428629",
  yb: "863005877182136321",
  yf: "863005877145567272",
  yr: "863005877144911892",
  ys: "863005877203763200",
  yt: "863005877241118720",
  f: "863005936100835328",
  w: "863005935911043082",
  b_: "863057739546230814",
};