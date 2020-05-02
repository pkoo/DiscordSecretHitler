'use strict';
require('dotenv').config();
const prefix = process.env.BOT_PREFIX;
const Discord = require('discord.js');
const client = new Discord.Client();
const DiscordSecretHitler = require('./DiscordSecretHitler');
let runningGame = null;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'new') {
    console.log('Preparing a new game');
    runningGame = new DiscordSecretHitler(message.author, message.mentions.users, client);
    runningGame.guild = message.guild;
    runningGame.textChannel = message.channel;
  } else if (command === 'add') {
    if (!runningGame) {
      return message.reply(`Currently there is no game running. You can start ony with ${prefix}new`);
    }
    if (runningGame.game.currentPresident !== null) {
      return message.reply('The game is already running, you can`t join them now.');
    }
    message.mentions.users.forEach((u) => runningGame.game.addPlayer(u));
    return message.reply('Added all users');
  } else if (command === 'start') {
    console.log('Starting a new game');
    runningGame.startGame();
  } else if (command === 'stop') {
    console.log('Stopping the current game');
    if (runningGame) runningGame.stopGame();
    runningGame = null;
  } else if (command === 'info' || command === 'help') {
    return message.reply(
      'My current job is to offer a Discord Version of https://www.secrethitler.com/ ' +
        '\n\nCommands:\n' +
        '!new <Mention Players> - start a new game and add all mentioned players\n' +
        '!add <mention players> - add the mentioned players to the game' +
        '!start - starts the game' +
        '!stop - the gameAdmin (initiator of !new) can always stop the game' +
        '!info - this information'
    );
  }
});

client.login(process.env.BOT_TOKEN);
