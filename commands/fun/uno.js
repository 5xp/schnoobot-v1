const { MessageEmbed, MessageButton, MessageActionRow, Util } = require("discord.js");

// TODO quit midgame
// TODO public lobbies and lobby list?
// TODO already in a game warning

const lobbies = new Map();

module.exports = {
  name: "uno",
  description: "starts an uno game",
  slash: true,
  options: [
    {
      name: "start",
      type: "SUB_COMMAND",
      description: "start a game of uno",
      options: [
        {
          name: "stack",
          type: "STRING",
          description: "stack +2s on +2s and +4s on +4s (default: on)",
          required: false,
          choices: [
            { name: "on", value: "on" },
            { name: "off", value: "off" },
          ],
        },
        {
          name: "draw",
          type: "STRING",
          description: "draw one card and end turn or draw multiple until you can play (default: draw multiple)",
          required: false,
          choices: [
            { name: "one", value: "one" },
            { name: "multiple", value: "multiple" },
          ],
        },
      ],
    },
    {
      name: "join",
      type: "SUB_COMMAND",
      description: "join a specific lobby",
      options: [{ name: "lobby", type: "STRING", description: "the code of the lobby to join", required: true }],
    },
  ],
  async execute(interaction) {
    const isSlash = interaction.isCommand?.();

    const joinButton = new MessageButton().setStyle("PRIMARY").setLabel("Join").setCustomId("join");
    const startButton = new MessageButton().setStyle("SUCCESS").setLabel("Start").setCustomId("start");
    const leaveButton = new MessageButton().setStyle("DANGER").setLabel("Quit").setCustomId("leave");
    const dmLinkButton = new MessageButton().setStyle("LINK").setLabel("Go to DM");

    if (interaction?.options?.getSubcommand() === "join") {
      const lobbyCode = interaction.options.getString("lobby").toUpperCase();

      if (!lobbies.has(lobbyCode)) {
        return await interaction.reply({ content: "🚫 **Invalid lobby code.**", ephemeral: true });
      }

      joinLobby(interaction, lobbies.get(lobbyCode));
    } else {
      if (!interaction.guild) {
        return interaction.reply("🚫 **You must start a game in a guild.**");
      }

      await interaction.deferReply?.();

      // pre-game lobby
      const players = [];

      const bStack = (interaction?.options?.getString("stack") ?? "on") === "on";
      const bDrawOne = (interaction?.options?.getString("draw") ?? "multiple") === "one";

      // create a random 4 character alphanumeric code
      const generateCode = () => Math.random().toString(36).slice(-4).toUpperCase();
      let lobbyCode = generateCode();

      // in case of a collision
      while (lobbies.has(lobbyCode)) {
        lobbyCode = generateCode();
      }

      const lobbyEmbed = new MessageEmbed()
        .setTitle(`Lobby \`${lobbyCode}\``)
        .addField("Player List", `\u200B`)
        .setDescription(`Users can also join with \`/uno join ${lobbyCode}\``)
        .setColor("AQUA")
        .setFooter(`Rules: stacking ${bStack ? "on" : "off"}, draw ${bDrawOne ? "once" : "multiple"}`);

      let lobbyMsg;
      if (isSlash) {
        lobbyMsg = await interaction.editReply({
          embeds: [lobbyEmbed],
          components: [{ type: 1, components: [joinButton] }],
        });
      } else {
        lobbyMsg = await interaction.reply({
          embeds: [lobbyEmbed],
          components: [{ type: 1, components: [joinButton] }],
        });
      }

      const filter = interaction => interaction.message.id === lobbyMsg.id;
      const buttonCollector = lobbyMsg.createMessageComponentCollector({ filter });

      lobbies.set(lobbyCode, {
        code: lobbyCode,
        players,
        msg: lobbyMsg,
        embed: lobbyEmbed,
        collector: buttonCollector,
        bStack,
        bDrawOne,
      });

      buttonCollector.on("collect", async i => {
        joinLobby(i, lobbies.get(lobbyCode));
      });
    }
    async function joinLobby(i, lobby) {
      const { players, msg, embed, collector, bStack, bDrawOne } = lobby;
      const player = players.find(player => player.id === i.user.id);

      if (player) {
        dmLinkButton.setURL(`https://discord.com/channels/@me/${player.message.channel.id}`);
        return i.reply({
          content: `⚠️ **You are already in the game.**`,
          components: [{ type: 1, components: [dmLinkButton] }],
          ephemeral: true,
        });
      }

      try {
        await i.deferReply({ ephemeral: true });

        const dmMsg = await i.user
          .send({
            embeds: [embed],
            components: [{ type: 1, components: [startButton, leaveButton] }],
          })
          .catch(() => {
            return i.editReply({
              content: "🚫 **Failed to join UNO. Please enable DMs in this server's privacy settings and try again.**",
              ephemeral: true,
            });
          });
        const player = new Player(players.length, i.member.user);
        players.push(player);

        embed.fields[0].value = players.map(player => `*${player.name}*`).join("\n") || "\u200B";
        msg.edit({ embeds: [embed], components: [{ type: 1, components: [joinButton] }] });

        player.setMsg(dmMsg);

        for (const p of players) {
          p.message.edit({ embeds: [embed], components: [{ type: 1, components: [startButton, leaveButton] }] });
        }

        dmLinkButton.setURL(`https://discord.com/channels/@me/${dmMsg.channel.id}`);

        i.followUp({
          content: `✅ **You have joined UNO!**`,
          components: [{ type: 1, components: [dmLinkButton] }],
          ephemeral: true,
        });

        try {
          // wait for start or leave button press
          const dmI = await dmMsg.awaitMessageComponent({
            filter: i => (!collector.ended && players.length > 1) || i.customId === "leave",
          });

          if (dmI.customId === "leave") {
            players.splice(players.indexOf(player));

            dmI.reply({ content: "✅ **You have left UNO.**", ephemeral: true });
            embed.fields[0].value = players.map(player => `*${player.name}*`).join("\n") || "\u200B";

            msg.edit({ embeds: [embed], components: [{ type: 1, components: [joinButton] }] });
            for (const p of players) {
              if (p !== player) {
                p.message.edit({ embeds: [embed], components: [{ type: 1, components: [startButton, leaveButton] }] });
              }
            }

            dmMsg.delete();
          } else {
            // start game
            dmI.deferUpdate();
            collector.stop();
            embed.setTitle("Game in progress");
            msg.edit({ embeds: [embed], components: [] });
            lobbies.delete(lobby.code);
            startGame(players, { bStack, bDrawOne: bDrawOne }, winner => {
              // game ended
              embed.setTitle(`${winner.name} won the game!`).setColor("ORANGE");
              embed.description = null;
              msg.edit({ embeds: [embed] });
              for (const p of players) {
                p.collector.stop();
              }
            });
          }
        } catch {
          // ignore message delete error
        }
      } catch (error) {
        await i.editReply({
          content: "🚫 **Failed to join UNO. Please enable DMs in this server's privacy settings and try again.**",
          ephemeral: true,
        });
        return;
      }
    }
  },
};

async function startGame(players, options, callback) {
  const { bStack, bDrawOne } = options;

  let iTurn = 0,
    isReverse = false,
    nStacked = 0,
    isGameOver = false,
    winner;

  let deck = shuffleDeck(createUnoDeck()),
    discarded = [];

  const history = [],
    // increments or decrements if reversed
    n = () => (isReverse ? -1 : 1),
    // wrap around if turn exceeds number of players
    nextTurn = () => (iTurn + n() + players.length) % players.length,
    // gets last played card
    topCard = () => discarded[discarded.length - 1],
    chatMessages = [];

  // randomize first turn
  iTurn = Math.floor(Math.random() * players.length);

  discarded.push(deck.pop());

  // deal cards
  for (const player of players) {
    drawCard(player.hand, 7);
  }

  // edit the dm
  for (const player of players) {
    const filter = m => !m.author.bot;
    const messageCollector = player.message.channel.createMessageCollector({ filter });

    // save collector so it can be stopped later
    player.setCollector(messageCollector);

    player.message.edit(playerUpdateObject(player));

    messageCollector.on("collect", async m => {
      chatMessages.push(`${m.author.toString()}: ${m.content}`);

      for (const p of players) {
        if (p !== player) {
          p.message.edit(playerUpdateObject(p));
        }
      }

      // resend game message so it doesn't get lost in chat

      const msg = await player.user.send({
        content: handEmojis(player.hand),
        embeds: createUnoEmbed(player),
        components: player.pickingColor ? [wildCardRow(player)] : createActionRows(player),
      });

      player.message.delete();
      player.setMsg(msg);

      if (player.i === iTurn || player.pickingColor) {
        startTurn(player);
      }
    });
  }

  startTurn(players[iTurn]);

  async function startTurn(player) {
    try {
      const i = await player.message.awaitMessageComponent();
      if (i.customId === "draw") {
        const drawnCard = drawCard(player.hand);

        // check if drawn card is playable and play it
        if (drawnCard.playable(topCard())) {
          player.hand.pop();
          discarded.push(drawnCard);

          if (!drawnCard.isWild()) history.push(`${player.user.toString()} drew and played ${drawnCard.label()}`);
          else history.push(`${player.user.toString()} drew and played ${drawnCard.face}`);
          await playSpecial(drawnCard, i);
        } else {
          history.push(`${player.user.toString()} drew a card`);

          // if drawing multiple, restart turn
          if (!bDrawOne) {
            await i.update(playerUpdateObject(player));

            for (const p of players) {
              if (p !== player) {
                p.message.edit(playerUpdateObject(p));
              }
            }

            startTurn(player);
            return;
          }
        }
        if (drawnCard.isWild()) return;
      } else if (i.customId.startsWith("wild")) {
        // handles wildcard color picking
        topCard().setColor(i.customId.substr(4));
        history.push(`${player.user.toString()} changed the color to ${topCard().color}`);
        player.pickingColor = false;
      } else if (i.customId.startsWith("m")) {
        i.customId === "mLeft" ? player.prevPage() : player.nextPage();
        await i.update({ components: createActionRows(player), content: handEmojis(player.hand) });
        startTurn(player);
        return;
      } else {
        const card = player.hand[i.customId];
        player.hand.splice(i.customId, 1);
        discarded.push(card);

        // let player pick a color
        if (card.isWild()) {
          history.push(`${player.user.toString()} played ${card.face}`);
          await playSpecial(card, i);
          return;
        } else {
          history.push(`${player.user.toString()} played ${card.label()}`);
        }
        await playSpecial(card, i);
      }

      if (player.hand.length === 0) {
        // player wins
        isGameOver = true;
        winner = player;
      }

      // advance turn and update each player
      iTurn = nextTurn();

      await i.update(playerUpdateObject(player));

      for (const p of players) {
        if (p !== player) {
          p.message.edit(playerUpdateObject(p));
        }
      }

      if (isGameOver) {
        callback(winner);
      } else {
        startTurn(players[iTurn]);
      }
    } catch {
      // ignore collector message delete error
    }
  }

  // handles special cards
  async function playSpecial(card, i) {
    const player = players[iTurn];
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
        if (bStack && players[nextTurn()].hand.map(card => card.face).includes("+2")) {
          nStacked++;
        } else {
          // if not, draw each +2 to next player
          drawCard(players[nextTurn()].hand, (nStacked + 1) * 2);
          nStacked = 0;
          iTurn = nextTurn();
        }
        break;

      case "+4":
        // check if next player has a +4
        player.pickingColor = true;

        await i.update({
          embeds: createUnoEmbed(player),
          components: [wildCardRow()],
          content: handEmojis(player.hand),
        });

        if (bStack && players[nextTurn()].hand.map(card => card.face).includes("+4")) {
          nStacked++;
        } else {
          // if not, draw each +4 to next player
          drawCard(players[nextTurn()].hand, (nStacked + 1) * 4);
          nStacked = 0;
          iTurn = nextTurn();
        }
        // restart the turn so player can pick a color
        startTurn(player);
        break;

      case "Wildcard":
        player.pickingColor = true;

        await i.update({
          embeds: createUnoEmbed(player),
          components: [wildCardRow()],
          content: handEmojis(player.hand),
        });

        startTurn(player);
        break;
    }
  }

  function createUnoEmbed(p) {
    const embed = new MessageEmbed()
      .setAuthor(
        `${players[iTurn].name}'s turn`,
        players[iTurn].user.avatarURL({ format: "png", dynamic: true, size: 2048 })
      )
      .setColor(topCard().color?.toUpperCase() || "NOT_QUITE_BLACK");

    // bold user's name and underline turn
    const fields = players.map(player => {
      let { name } = player;
      if (player === p) name = `**You**`;
      if (player.i === iTurn) name = `__${name}__`;
      return name;
    });

    let desc, joined, chat;

    if (isReverse) desc = fields.join(" < ");
    else desc = fields.join(" > ");
    if (isGameOver) desc = "";

    if (chatMessages.length) {
      chat = chatMessages.slice(-4);

      // shorten chat messages and remove newlines so you can't spam
      chat = chat.map(message => {
        message.substr(0, 170);
        return message.replace(/\n/g, "");
      });

      joined = chat.join("\n");

      joined = Util.escapeMarkdown(joined);

      desc = desc.concat(`\n\n**Chat**\n${joined}`);
    }

    if (history.length) {
      const shortHistory = history.slice(-4);

      joined = shortHistory.join("\n");

      desc = desc.concat(`\n\n*${joined}*`);
    }

    embed.setDescription(desc);

    embed.setImage(getEmojiLink(getEmojiId(topCard(), true)));

    for (let i = 0; i < players.length; i++) {
      const { hand } = players[i];
      if (hand.length === 0) {
        embed.addField(fields[i], "**🏆Winner**", true);
      } else {
        embed.addField(`${fields[i]} - ${hand.length} card${hand.length > 1 ? "s" : ""}`, handEmojis(hand, true), true);
      }
    }

    if (isGameOver) {
      embed.setAuthor("Uno Game");
      const chatEmbed = createChatEmbed(chatMessages);
      if (chatEmbed) return [embed, chatEmbed];
    }

    if (nStacked > 0) {
      embed.setFooter(`Current stack: +${topCard().face === "+2" ? nStacked * 2 : nStacked * 4}`);
    }

    return [embed];
  }

  function createChatEmbed(chat) {
    if (!chat.length) return;

    // shorten chat messages and remove newlines so you can't spam
    chat = chat.map(message => {
      message.substr(0, 170);
      return message.replace(/\n/g, "");
    });

    let joined = chat.join("\n");

    joined = Util.escapeMarkdown(joined);

    return new MessageEmbed().setTitle("Chat Log").setColor("BLURPLE").setDescription(joined);
  }

  // turns player hand into MessageActionRows and MessageButtons
  function createActionRows(p) {
    // player won
    if (isGameOver) return [];

    const { hand, handOffset } = p;

    const isTurn = p.i === iTurn;

    // clamp between 0 and hand.length - 24;
    const offset = Math.max(Math.min(handOffset, hand.length - 24), 0);
    p.handOffset = offset;

    // can only show 23-24 cards at a time
    const pageWidth = handOffset >= hand.length - 24 ? 24 : 23;

    const shallowHand = hand.slice(offset, offset + pageWidth);

    // start at 1 because of draw card button
    const rows = new Array(Math.ceil((shallowHand.length + 1) / 5));

    for (let i = 0; i < rows.length; i++) {
      rows[i] = new MessageActionRow();
    }

    const drawCardButton = new MessageButton()
      .setLabel("Draw")
      .setStyle("DANGER")
      .setCustomId("draw")
      .setDisabled(!isTurn);

    const rightButton = new MessageButton()
      .setStyle("PRIMARY")
      .setCustomId("mRight")
      .setEmoji("➡")
      .setDisabled(!isTurn);

    const leftButton = new MessageButton().setStyle("PRIMARY").setCustomId("mLeft").setEmoji("⬅️").setDisabled(!isTurn);

    if (offset === 0) {
      rows[0].addComponents([drawCardButton]);
    } else {
      rows[0].addComponents([leftButton]);
    }

    for (let j = 0; j < shallowHand.length; j++) {
      const r = Math.floor((j + 1) / 5);

      const button = new MessageButton()
        .setEmoji(getEmojiId(shallowHand[j]))
        .setStyle("SECONDARY")
        .setCustomId((j + offset).toString());

      if (!isTurn || !shallowHand[j].playable(topCard())) button.setDisabled();
      rows[r].addComponents([button]);
    }

    // don't show right button on last page
    if (hand.length > pageWidth && pageWidth === 23) {
      rows[4].addComponents(rightButton);
    }

    // if player can stack, don't let them play anything else
    if (nStacked > 0 && isTurn) {
      rows.forEach(row =>
        row.components.forEach(button => {
          // don't disable page buttons
          if (!button.customId.startsWith("m")) button.setDisabled(hand[button.customId]?.face !== topCard().face);
        })
      );
    }

    return rows;
  }

  function playerUpdateObject(p) {
    const obj = {
      content: handEmojis(p.hand),
      embeds: createUnoEmbed(p),
      components: createActionRows(p),
    };
    return obj;
  }

  function drawCard(hand, n = 1) {
    // if we run out of cards, replace with discarded pile and shuffle
    if (deck.length === 0) {
      console.log("We ran out of cards!");
      // swap deck and discarded pile
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
  const faces = [
    "0",
    "1",
    "1",
    "2",
    "2",
    "3",
    "3",
    "4",
    "4",
    "5",
    "5",
    "6",
    "6",
    "7",
    "7",
    "8",
    "8",
    "9",
    "9",
    "Skip",
    "Skip",
    "Reverse",
    "Reverse",
    "+2",
    "+2",
    "Wildcard",
    "+4",
  ];
  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < faces.length; j++) {
      const card = new Card(colors[i], faces[j]);
      if (card.isWild()) card.setColor(null);
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

Card.prototype.setColor = function (color) {
  this.color = color;
};

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
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
  this.message;
  this.handOffset = 0;
  this.pickingColor = false;
  this.collector;
}

Player.prototype.nextPage = function () {
  this.handOffset += 23;
};

Player.prototype.prevPage = function () {
  this.handOffset -= 23;
};

Player.prototype.setMsg = function (m) {
  this.message = m;
};

Player.prototype.setCollector = function (c) {
  this.collector = c;
};

function wildCardRow() {
  const colors = ["Red", "Yellow", "Green", "Blue"];
  const wildRow = new MessageActionRow();
  for (const color of colors) {
    const button = new MessageButton()
      .setStyle("PRIMARY")
      .setCustomId(`wild${color}`)
      .setEmoji(emojis[color[0].toLowerCase() + "b"]);
    wildRow.addComponents([button]);
  }

  // const backButton = new MessageButton().setStyle("DANGER").setEmoji("🔙").setCustomId("back");
  // wildRow.addComponents([backButton]);
  return wildRow;
}

// create a string of emojis to show your hand
const handEmojis = (hand, hidden = false) => {
  if (!hand.length) return null;

  // hidden for embed fields
  if (hidden) {
    // unlikely but over 42 cards and it will exceed 1024 character field limit
    const maxLength = 42;
    const emojiString = "<:b_:863057739546230814>".repeat(Math.min(hand.length, maxLength));
    if (emojiString.length >= maxLength * 24) return emojiString + " …";
    return emojiString;
  }

  // over 83 cards and it will exceed 2000 character limit
  const maxLength = 83;
  const emojiString = hand.map(card => getEmojiString(card));

  if (emojiString.length > 83) {
    return emojiString.slice(0, maxLength).join("") + " …";
  }

  return emojiString.join("");
};

const getEmojiId = card => {
  const clr = card.color?.[0]?.toLowerCase();
  switch (card.face) {
    case "Wildcard":
      if (!clr) return "863005935911043082";
      return emojis[clr + "b"];
    case "+4":
      if (!clr) return "863005936100835328";
      return emojis[clr + "f"];
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
  const clr = card.color?.[0]?.toLowerCase();
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
