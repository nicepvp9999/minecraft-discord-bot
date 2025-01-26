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
const userBots = {}; // Kullanıcıların sahip olduğu botları saklar
const bannedUsers = {}; // Banlanan kullanıcıları saklar

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

        // Kullanıcıları botla ilişkilendir
        if (!userBots[message.author.id]) {
          userBots[message.author.id] = [];
        }
        userBots[message.author.id].push(botName);

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

        // Eğer bot sahibi kişi değilse, botu kapatma
        if (userBots[message.author.id] && !userBots[message.author.id].includes(botName)) {
          return message.reply('Bu bot size ait değil!');
        }

        const bot = minecraftBots[botName].bot;
        bot.end();
        delete minecraftBots[botName];
        delete botStartTimes[botName];

        // Kullanıcıdan bot ismini sil
        userBots[message.author.id] = userBots[message.author.id].filter(name => name !== botName);
        message.reply(`Bot ${botName} başarıyla kapatıldı.`);
      } else if (message.content.startsWith('qsay')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const text = args.slice(2).join(' ');

        if (!botName || !minecraftBots[botName]) {
          // Bot ismi belirtilmemişse, tüm botlara gönder
          Object.keys(minecraftBots).forEach(name => {
            minecraftBots[name].bot.chat(text);
          });
        } else {
          // Belirtilen botun Minecraft sunucusuna mesaj gönder
          minecraftBots[botName].bot.chat(text);
        }

        message.reply(`Mesaj gönderildi: ${text}`);
      } else if (message.content.startsWith('qduyuru')) {
        const args = message.content.split(' ');
        const text = args.slice(1, -1).join(' ');
        const duration = parseInt(args[args.length - 1]);

        if (!text || isNaN(duration)) {
          return message.reply('Kullanım: qduyuru <mesaj> <süre (saniye cinsinden)>');
        }

        // Süre boyunca sürekli olarak mesajı gönder
        setInterval(() => {
          Object.keys(minecraftBots).forEach(name => {
            minecraftBots[name].bot.chat(text);
          });
        }, duration * 1000);

        message.reply(`Duyuru başlatıldı. Mesaj, ${duration} saniye boyunca gönderilecek.`);
      } else if (message.content.startsWith('qileri')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const steps = parseInt(args[2]);

        if (!minecraftBots[botName]) {
          return message.reply('Bu isimde bir bot yok.');
        }

        // Botu belirtilen sayıda ileri gönder
        const bot = minecraftBots[botName].bot;
        for (let i = 0; i < steps; i++) {
          bot.setControlState('forward', true);
          setTimeout(() => bot.setControlState('forward', false), 1000);
        }

        message.reply(`${botName} botu ${steps} adım ileri gitti.`);
      } else if (message.content.startsWith('qgeri')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const steps = parseInt(args[2]);

        if (!minecraftBots[botName]) {
          return message.reply('Bu isimde bir bot yok.');
        }

        // Botu belirtilen sayıda geri gönder
        const bot = minecraftBots[botName].bot;
        for (let i = 0; i < steps; i++) {
          bot.setControlState('back', true);
          setTimeout(() => bot.setControlState('back', false), 1000);
        }

        message.reply(`${botName} botu ${steps} adım geri gitti.`);
      } else if (message.content.startsWith('qekle')) {
        // Sunucu kurucusu 30 günlük sınırsız bot ekleyebilir
        if (message.author.id !== ALLOWED_USER_ID) {
          return message.reply('Bu komutu sadece sunucu kurucusu kullanabilir.');
        }

        const user = message.mentions.users.first();
        if (!user) {
          return message.reply('Bir kullanıcı etiketlemeniz gerekiyor.');
        }

        // 30 gün boyunca sınırsız bot ekleyebilme
        const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        // Sınırsız bot ekleme yetkisini kaydediyoruz
        userBots[user.id] = { canAddBotsUntil: expirationTime };
        message.reply(`${user.tag} 30 günlük sınırsız bot ekleyebilme hakkı verildi.`);
      } else if (message.content.startsWith('qban')) {
        // Etiketlenen kişiyi bottan banlar
        const user = message.mentions.users.first();
        if (!user) {
          return message.reply('Bir kullanıcı etiketlemeniz gerekiyor.');
        }

        // Banlama işlemi
        if (!userBots[user.id]) {
          return message.reply('Bu kişi daha önce hiç bot eklemedi.');
        }

        userBots[user.id].forEach(botName => {
          if (minecraftBots[botName]) {
            minecraftBots[botName].bot.end();
            delete minecraftBots[botName];
          }
        });

        delete userBots[user.id];
        bannedUsers[user.id] = true;

        message.reply(`${user.tag} botlarından banlandı.`);
      } else if (message.content.startsWith('qunban')) {
        // Banlanan kişiyi serbest bırakır
        const user = message.mentions.users.first();
        if (!user || !bannedUsers[user.id]) {
          return message.reply('Banlı olmayan bir kullanıcıyı serbest bırakamazsınız.');
        }

        delete bannedUsers[user.id];
        message.reply(`${user.tag} banı kaldırıldı.`);
      }
    });

    discordClient.login(token); // Token ile giriş yap

    rl.close(); // readline'ı kapat
  });
});
