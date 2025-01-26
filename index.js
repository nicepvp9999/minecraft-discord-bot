const { Client, GatewayIntentBits } = require('discord.js');
const mineflayer = require('mineflayer');
const express = require('express');
const readline = require('readline');

// Express Sunucusu (UptimeRobot için)
const app = express();
app.get('/', (req, res) => res.send('Bot çalışıyor!'));
app.listen(3000, () => console.log('Express sunucusu başlatıldı.'));

// Kullanıcıdan veri almak için readline arayüzü
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Kullanıcıdan token ve kurucu ID'sini almak
rl.question('Discord Bot Tokeninizi Girin: ', (token) => {
  rl.question('Sunucu Kurucusunun ID\'sini Girin: ', (allowedUserId) => {
    // Discord Bot Ayarları
    const discordClient = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });

    // Bot Verileri
    const minecraftBots = {}; // Minecraft botlarını saklar
    const botStartTimes = {}; // Botların çalışma sürelerini saklar
    let specialUserId = null; // Sınırsız bot ekleyebilen kullanıcıyı tutar

    // Discord Bot Mesaj Olayı
    discordClient.on('messageCreate', (message) => {
      if (message.author.bot) return; // Botların mesajlarını yok sayar

      // qbot komutu ile Minecraft botu başlatma
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

        // Kullanıcı bir bot oluşturabilir mi kontrol etme
        if (!specialUserId || specialUserId !== message.author.id) {
          const userBots = Object.keys(minecraftBots).filter(botName => minecraftBots[botName].ownerId === message.author.id);
          if (userBots.length >= 1) {
            return message.reply('Birden fazla bot oluşturamazsınız. Sunucu sahibinin izni ile sınırsız bot ekleme hakkınız var.');
          }
        }

        const mcBot = mineflayer.createBot({
          host: serverIP,
          username: botName,
          version: '1.16.4',
        });

        minecraftBots[botName] = { bot: mcBot, serverIP, password, ownerId: message.author.id };
        botStartTimes[botName] = Date.now();

        mcBot.once('spawn', () => {
          message.reply(`Bot sunucuya bağlandı: ${botName}`);
          mcBot.chat(`/register ${password} ${password}`);
          mcBot.chat(`/login ${password}`);
          // /is go komutu
          setInterval(() => mcBot.chat('/is go'), 60000); // 1 dakikada bir /is go komutunu gönder
          // /çiftçi sell all komutu
          setInterval(() => mcBot.chat('/çiftçi sell all'), 300000); // 5 dakikada bir /çiftçi sell all komutunu gönder
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
      }

      // qbotkapat komutu ile botu kapatma
      else if (message.content.startsWith('qbotkapat')) {
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
      }

      // qbilgi komutu ile bot bilgilerini gösterme
      else if (message.content.startsWith('qbilgi')) {
        if (message.author.id !== allowedUserId) {
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

      // qsay komutu ile Minecraft sunucusuna mesaj gönderme
      else if (message.content.startsWith('qsay')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const text = args.slice(2).join(' ');

        if (!botName) {
          // Mesaj tüm botlara gönderilir
          Object.keys(minecraftBots).forEach(botName => {
            minecraftBots[botName].bot.chat(text);
          });
          return message.reply('Mesaj tüm botlara gönderildi.');
        }

        if (!minecraftBots[botName]) {
          return message.reply('Bu isimde bir bot aktif değil.');
        }

        minecraftBots[botName].bot.chat(text);
        message.reply(`${botName} botuna mesaj gönderildi.`);
      }

      // qduyuru komutu ile Minecraft sunucusuna duyuru gönderme
      else if (message.content.startsWith('qduyuru')) {
        const args = message.content.split(' ');
        const text = args.slice(1).join(' ');
        const duration = args[0]; // Duyuru süresi

        if (!text || !duration) {
          return message.reply('Kullanım: qduyuru <süre> <mesaj>');
        }

        const durationMs = parseInt(duration) * 1000;
        if (isNaN(durationMs)) {
          return message.reply('Geçerli bir süre girin.');
        }

        // Süre boyunca sürekli olarak mesaj gönderme
        setInterval(() => {
          Object.keys(minecraftBots).forEach(botName => {
            minecraftBots[botName].bot.chat(text);
          });
        }, durationMs);

        message.reply('Duyuru yapılıyor.');
      }

      // qileri komutu ile Minecraft botunu ileri gönderme
      else if (message.content.startsWith('qileri')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const steps = parseInt(args[2]);

        if (!botName || !minecraftBots[botName]) {
          return message.reply('Geçerli bir bot ismi girin veya bot aktif değil.');
        }

        if (isNaN(steps) || steps <= 0) {
          return message.reply('Geçerli bir sayı girin.');
        }

        const bot = minecraftBots[botName].bot;
        for (let i = 0; i < steps; i++) {
          bot.lookAt(bot.entity.position.offset(0, 0, 1));  // Bu örnekte botu ileri göndermek için
          bot.setControlState('forward', true);
          setTimeout(() => {
            bot.setControlState('forward', false);
          }, 1000);
        }
        message.reply(`${botName} botu ${steps} adım ileri gönderildi.`);
      }

      // qgeri komutu ile Minecraft botunu geri gönderme
      else if (message.content.startsWith('qgeri')) {
        const args = message.content.split(' ');
        const botName = args[1];
        const steps = parseInt(args[2]);

        if (!botName || !minecraftBots[botName]) {
          return message.reply('Geçerli bir bot ismi girin veya bot aktif değil.');
        }

        if (isNaN(steps) || steps <= 0) {
          return message.reply('Geçerli bir sayı girin.');
        }

        const bot = minecraftBots[botName].bot;
        for (let i = 0; i < steps; i++) {
          bot.lookAt(bot.entity.position.offset(0, 0, -1));  // Bu örnekte botu geri göndermek için
          bot.setControlState('back', true);
          setTimeout(() => {
            bot.setControlState('back', false);
          }, 1000);
        }
        message.reply(`${botName} botu ${steps} adım geri gönderildi.`);
      }

      // qban komutu ile botu banlama
      else if (message.content.startsWith('qban')) {
        const args = message.content.split(' ');
        const botName = args[1];

        if (!botName || !minecraftBots[botName]) {
          return message.reply('Geçerli bir bot ismi girin veya bot aktif değil.');
        }

        const bot = minecraftBots[botName].bot;
        bot.end();
        delete minecraftBots[botName];
        delete botStartTimes[botName];

        message.reply(`${botName} botu banlandı ve Minecraft sunucusundan çıkarıldı.`);
      }

      // qekle komutu ile sınırsız bot ekleme hakkı verme
      else if (message.content.startsWith('qekle')) {
        if (message.author.id !== allowedUserId) {
          return message.reply('Bu komutu sadece sunucu sahibi kullanabilir.');
        }

        const taggedUser = message.mentions.users.first();
        if (!taggedUser) {
          return message.reply('Bir kullanıcıyı etiketleyin.');
        }

        // Sınırsız bot ekleme hakkı verme
        specialUserId = taggedUser.id;
        setTimeout(() => {
          specialUserId = null; // 30 gün sonra hakkı sıfırlama
        }, 30 * 24 * 60 * 60 * 1000); // 30 gün (ms cinsinden)

        message.reply(`${taggedUser.username} adlı kullanıcıya sınırsız bot ekleme hakkı verildi!`);
      }
    });

    // Discord Bot'u Çalıştırma
    discordClient.login(token);
    rl.close();
  });
});
