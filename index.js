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
    runningGame = new DiscordSecretHitler(
      message.author,
      message.mentions.users,
      client
    );
    runningGame.guild = message.guild;
    runningGame.textChannel = message.channel;
  } else if (command === 'start') {
    console.log('Starting a new game');
    runningGame.startGame();
  } else if (command === 'stop') {
    console.log('Stopping the current game');
    runningGame = null;
    client.user.setActivity();
  } else if (command === 'info') {
    return message.reply(
      'My current job is to offer a Discord Version of https://www.secrethitler.com/'
    );
  }
});

client.login(process.env.BOT_TOKEN);
