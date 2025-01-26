const { Client, GatewayIntentBits } = require('discord.js');
const mineflayer = require('mineflayer');
const express = require('express');
const readline = require('readline');

// Express Sunucusu (UptimeRobot için)
const app = express();
app.get('/', (req, res) => res.send('Bot çalışıyor!'));
app.listen(3000, () => console.log('Express sunucusu başlatıldı.'));

// Discord Bot Ayarları
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Bot Verileri
const minecraftBots = {}; // Minecraft botlarını saklar
const botStartTimes = {}; // Botların çalışma sürelerini saklar

// Kullanıcıdan Token ve User ID Alma
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Discord Bot Tokenini girin: ', (token) => {
  rl.question('Sunucu kurucusunun ID\'sini girin: ', (allowedUserId) => {
    const ALLOWED_USER_ID = allowedUserId; // Kullanıcı ID'sini kaydet

    // Discord Bot Mesaj Olayı
    discordClient.on('messageCreate', (message) => {
      if (message.content.startsWith('qbot')) {
        const args = message.content.split(' ');
        const serverIP = args[1];
        const password = args[2];
        const botName = args[3];

        if (!serverIP || !password || !botName) {
          return message.reply('Kullanım: qbot <sunucu-ip> <şifre> <isim>');
        }

        if (minecraftBots[botName]) {
          return message.reply(`Bu isimde bir bot zaten aktif: ${botName}`);
        }

        const mcBot = mineflayer.createBot({
          host: serverIP,
          username: botName,
          version: '1.16.4',
        });

        minecraftBots[botName] = { bot: mcBot, serverIP, password };
        botStartTimes[botName] = Date.now();

        mcBot.once('spawn', () => {
          message.reply(`Bot sunucuya bağlandı: ${botName}`);
          mcBot.chat(`/register ${password} ${password}`);
          mcBot.chat(`/login ${password}`);
          setInterval(() => mcBot.chat('/is go'), 60000);
          setInterval(() => mcBot.chat('/çiftçi sell all'), 300000);
        });

        mcBot.on('end', () => {
          delete minecraftBots[botName];
          delete botStartTimes[botName];
          message.reply(`Bot bağlantısı kesildi: ${botName}`);
        });

        mcBot.on('error', (err) => {
          console.error('Minecraft botu bağlantı hatası:', err);
          message.reply(`Bot bağlantı hatası: ${err.message}`);
        });
      } else if (message.content.startsWith('qbotkapat')) {
        const args = message.content.split(' ');
        const botName = args[1];

        if (!botName || !minecraftBots[botName]) {
          return message.reply('Geçerli bir bot ismi girin veya bot aktif değil.');
        }

        const bot = minecraftBots[botName].bot;
        bot.end();
        delete minecraftBots[botName];
        delete botStartTimes[botName];

        message.reply(`Bot ${botName} başarıyla kapatıldı.`);
      } else if (message.content.startsWith('qbilgi')) {
        if (message.author.id !== ALLOWED_USER_ID) {
          return message.reply('Bu komutu sadece sunucu kurucusu kullanabilir.');
        }

        const botInfo = Object.keys(minecraftBots)
          .map((botName) => {
            const { serverIP, password } = minecraftBots[botName];
            const uptime = Math.floor((Date.now() - botStartTimes[botName]) / 60000);
            return `Bot İsmi: ${botName}\nSunucu: ${serverIP}\nŞifre: ${password}\nÇalışma Süresi: ${uptime} dakika\n`;
          })
          .join('\n-----------------\n');

        message.reply(botInfo || 'Aktif bot yok.');
      }
    });

    discordClient.login(token); // Token ile giriş yap

    rl.close(); // readline'ı kapat
  });
});
