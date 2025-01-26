const { Client, GatewayIntentBits } = require('discord.js');
const mineflayer = require('mineflayer');
const express = require('express');
const readline = require('readline');

// Discord token ve ALLOWED_USER_ID'yi konsoldan al
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Discord Token ve Kullanıcı ID'si soruluyor
rl.question('Discord Bot Tokeninizi girin: ', (token) => {
  rl.question('Sunucu Kurucusunun ID\'sini girin: ', (allowedUserId) => {
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
    const userLimits = {}; // Kullanıcı başına oluşturulabilen bot sayısı

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

        if (userLimits[message.author.id] && userLimits[message.author.id] >= 1) {
          return message.reply('Bir kullanıcı sadece 1 bot oluşturabilir. Premium kullanıcı değilseniz daha fazla bot oluşturamazsınız.');
        }

        const mcBot = mineflayer.createBot({
          host: serverIP,
          username: botName,
          version: '1.16.4',
        });

        minecraftBots[botName] = { bot: mcBot, serverIP, password };
        botStartTimes[botName] = Date.now();
        userLimits[message.author.id] = (userLimits[message.author.id] || 0) + 1;

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
          userLimits[message.author.id]--;
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
        userLimits[message.author.id]--;

        message.reply(`Bot ${botName} başarıyla kapatıldı.`);
      } else if (message.content.startsWith('qbilgi')) {
        if (message.author.id !== allowedUserId && !message.mentions.users.size) {
          return message.reply('Bu komutu sadece sunucu kurucusu kullanabilir.');
        }

        // Kullanıcı etiketlenmişse onun botlarını göster
        const targetId = message.mentions.users.first()?.id || message.author.id;

        const botInfo = Object.keys(minecraftBots)
          .map((botName) => {
            if (minecraftBots[botName].bot.username === targetId || targetId === allowedUserId) {
              const { serverIP, password } = minecraftBots[botName];
              const uptime = Math.floor((Date.now() - botStartTimes[botName]) / 60000);
              return `Bot İsmi: ${botName}\nSunucu: ${serverIP}\nŞifre: ${password}\nÇalışma Süresi: ${uptime} dakika\n`;
            }
            return null;
          })
          .filter(Boolean)
          .join('\n-----------------\n');

        message.reply(botInfo || 'Bu kullanıcının aktif botu yok.');
      } else if (message.content.startsWith('qduyuru')) {
        const args = message.content.split(' ');
        const duration = parseInt(args[1]);
        const announcementMessage = args.slice(2).join(' ');

        if (isNaN(duration) || duration <= 0) {
          return message.reply('Lütfen geçerli bir süre girin (dakika cinsinden).');
        }

        if (!announcementMessage) {
          return message.reply('Lütfen bir duyuru mesajı girin.');
        }

        // Duyuru mesajını belirli süre boyunca göndermeye başla
        const sendAnnouncement = () => {
          Object.keys(minecraftBots).forEach((botName) => {
            const bot = minecraftBots[botName].bot;
            bot.chat(announcementMessage);
          });
        };

        sendAnnouncement();  // Duyuru mesajını hemen gönder
        const interval = setInterval(sendAnnouncement, 60000); // 1 dakikada bir duyuruyu gönder

        // Süre bitince interval'i temizle
        setTimeout(() => {
          clearInterval(interval);
          message.reply(`Duyuru "${announcementMessage}" için belirlenen süre tamamlandı.`);
        }, duration * 60000); // Duyuruyu belirtilen süre boyunca gönder

      } else if (message.content.startsWith('qekle')) {
        if (message.author.id !== allowedUserId) {
          return message.reply('Bu komutu sadece sunucu kurucusu kullanabilir.');
        }

        // Premium özellikler: Süresiz bot ekleme
        const userId = message.mentions.users.first()?.id;
        if (!userId) {
          return message.reply('Bir kullanıcı etiketleyin.');
        }

        // Süresiz bot ekleme
        message.reply(`${userId} kullanıcısına sınırsız bot ekledi.`);
      } else if (message.content.startsWith('qban')) {
        const userId = message.mentions.users.first()?.id;
        if (!userId) {
          return message.reply('Bir kullanıcı etiketleyin.');
        }

        // Kişiyi botlardan banla
        Object.keys(minecraftBots).forEach((botName) => {
          const bot = minecraftBots[botName].bot;
          bot.chat(`/ban ${userId}`);
        });

        message.reply(`${userId} kullanıcısı botlardan banlandı.`);
      } else if (message.content.startsWith('qunban')) {
        const userId = message.mentions.users.first()?.id;
        if (!userId) {
          return message.reply('Bir kullanıcı etiketleyin.');
        }

        // Kişinin yasağını kaldır
        Object.keys(minecraftBots).forEach((botName) => {
          const bot = minecraftBots[botName].bot;
          bot.chat(`/unban ${userId}`);
        });

        message.reply(`${userId} kullanıcısının yasağı kaldırıldı.`);
      } else if (message.content.startsWith('qsay')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const messageToSend = args.slice(2).join(' ');

        if (!botName || !minecraftBots[botName]) {
          return message.reply('Geçerli bir bot ismi girin veya bot aktif değil.');
        }

        if (!messageToSend) {
          return message.reply('Bir mesaj yazın.');
        }

        // Bot mesajını Minecraft sunucusuna gönder
        const bot = minecraftBots[botName].bot;
        bot.chat(messageToSend);
        message.reply(`Mesaj "${messageToSend}" ${botName} botuna gönderildi.`);
      } else if (message.content.startsWith('qileri')) {
        const args = message.content.split(' ');
        const steps = parseInt(args[1]);

        if (isNaN(steps) || steps <= 0) {
          return message.reply('Geçerli bir sayı girin.');
        }

        // Botu ileri gönder
        Object.keys(minecraftBots).forEach((botName) => {
          const bot = minecraftBots[botName].bot;
          for (let i = 0; i < steps; i++) {
            bot.chat('/is go');
          }
        });

        message.reply(`${steps} adım ileri gönderildi.`);
      }
    });

    // Discord Botu
    discordClient.login(token); // Konsoldan alınan token ile giriş yap
    
    discordClient.on('ready', () => {
      console.log('Discord botu başarıyla giriş yaptı!');
    });
  });
});
