const fs = require('node:fs');
const path = require('node:path');
// ❗ ActivityType modülü buraya güvenle eklendi kanka
const { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const { Rcon } = require('rcon-client');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

const rcon = new Rcon({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT || "25575"), // Çökme riskine karşı yedek port eklendi
    password: process.env.MC_PASSWORD
});

rcon.on("connect", () => console.log("⚙️ Minecraft RCON bağlantısı başarılı!"));
rcon.on("error", (err) => console.error("Minecraft RCON Hatası:", err));

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} aktif ve hazır!`);
    
    // 👑 Orta Çağ temasına uyması için bot durumunu Rahatsız Etmeyin (Kırmızı) yapıyoruz
    // Not: Yayın modu aktifken sağ alttaki nokta mor olur ama profil içinde bu statü kalır kanka
    client.user.setStatus('dnd'); 

    // 🌟 .env dosyanda TWITCH_URL varsa onu alır, yoksa yedek linki kullanır
    const twitchUrl = process.env.TWITCH_URL || 'https://www.twitch.tv/insta_kaancxlik';

    // 🔄 10 saniyede bir dönecek Twitch linkli dinamik durum yazıları listesi
    const durumlar = [
        { text: 'Klan Savaşlarını ⚔️', type: ActivityType.Streaming, url: twitchUrl },
        { text: '/klan-kur ile ekibini kur! 🛡️', type: ActivityType.Streaming, url: twitchUrl },
        { text: 'Sunucu Başvurularını 📜', type: ActivityType.Streaming, url: twitchUrl },
        { text: 'Minecraft Dünyasını ⚙️', type: ActivityType.Streaming, url: twitchUrl }
    ];

    let i = 0;
    // Bot açılır açılmaz ilk mor durum yazısını hemen aktif etsin kanka
    client.user.setActivity(durumlar[i].text, { type: durumlar[i].type, url: durumlar[i].url });
    
    // Döngüyü 10 saniyede bir tetiklenecek şekilde başlatıyoruz
    setInterval(() => {
        i = (i + 1) % durumlar.length;
        client.user.setActivity(durumlar[i].text, { type: durumlar[i].type, url: durumlar[i].url });
    }, 10000);

    try {
        await rcon.connect();
    } catch (err) {
        console.error("Minecraft sunucusuna bağlanılamadı. RCON ayarlarını kontrol edin.");
    }
});

client.on('interactionCreate', async interaction => {
    // 1. SLASH KOMUTLARINI ÇALIŞTIRMA
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, rcon);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true });
        }
    }

    // 2. BAŞVURU YAP BUTONUNA TIKLANDIĞINDA MODAL AÇMA
    if (interaction.isButton() && interaction.customId === 'basvuru_ac') {
        const modal = new ModalBuilder()
            .setCustomId('basvuru_modal')
            .setTitle('Sunucu Başvuru Formu');

        const mcNameInput = new TextInputBuilder()
            .setCustomId('mc_username')
            .setLabel("Minecraft Kullanıcı Adınız")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ageInput = new TextInputBuilder()
            .setCustomId('user_mic')
            .setLabel("Mikrofonunuz var mı?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('apply_reason')
            .setLabel("Ekibiniz kaç kişi ve amacınız nedir?")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(mcNameInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(modal);
    }

    // 3. FORM GÖNDERİLDİĞİNDE: YETKILI KANALINA COMPONENTS V2 PANELİ GÖNDERME
    if (interaction.isModalSubmit() && interaction.customId === 'basvuru_modal') {
        const mcName = interaction.fields.getTextInputValue('mc_username');
        const age = interaction.fields.getTextInputValue('user_mic');
        const reason = interaction.fields.getTextInputValue('apply_reason');

        const kanalId = process.env.YETKILI_KANAL_ID || "BURAYA_DIREKT_KANAL_ID_YAZABILIRSIN";

        try {
            const yetkiliKanal = await client.channels.fetch(kanalId).catch(() => null);

            if (!yetkiliKanal) {
                return await interaction.reply({ 
                    content: `❌ **Hata:** Bot yetkili kanalını bulamadı. Aranan Kanal ID: \`${kanalId}\`. Lütfen ID'yi veya botun kanal izinlerini kontrol et kanka!`, 
                    ephemeral: true 
                });
            }

            await yetkiliKanal.send({
                flags: 32768,
                components: [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                avatar_url: 'https://media.discordapp.net/attachments/1482066608838017217/1507827183023030302/minecraft_title_1.png',
                                content: `# <a:88103minecraftcube:1507752049079750666> YENİ BAŞVURU GELDİ!\n\n` +
                                         `### <:87389steve:1507752047766671510> Başvuran\n• ${interaction.user} (${interaction.user.tag})\n\n` +
                                         `### <a:8969parrotvibe:1507751926815789277> Discord ID\n• \`${interaction.user.id}\`\n\n` +
                                         `### <a:20756irongolem:1507751974299242496> MC Kullanıcı Adı\n• \`${mcName}\`\n\n` +
                                         `### <a:7982rainbowminecraftparrotdances:1507751907295498342> Mikrofon Durumu\n• \`${age}\`\n\n` +
                                         `### <a:2996frogwalk:1507751800445468742> Ekip ve Amaç Detayları\n> ${reason}`
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 3,
                                        label: 'Onayla',
                                        custom_id: `onay_${interaction.user.id}_${mcName}`,
                                        emoji: { name: '✅' }
                                    },
                                    {
                                        type: 2,
                                        style: 4,
                                        label: 'Reddet',
                                        custom_id: `redtetik_${interaction.user.id}_${mcName}`,
                                        emoji: { name: '❌' }
                                    },
                                    {
                                        type: 2,
                                        style: 2,
                                        label: 'Uzaklaştır (Kick)',
                                        custom_id: `ykick_${interaction.user.id}_${mcName}`,
                                        emoji: { name: '👢' }
                                    },
                                    {
                                        type: 2,
                                        style: 2,
                                        label: 'Yasakla (Ban)',
                                        custom_id: `yban_${interaction.user.id}_${mcName}`,
                                        emoji: { name: '🔨' }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            
            await interaction.reply({ content: '<a:1099433252382584953:1507752202482225382> Başvurunuz başarıyla yetkililere iletildi!', ephemeral: true });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `❌ **Discord Red Hatası:** Mesaj gönderilirken bir yetki veya arayüz hatası oluştu. Detay: \`${error.message}\``, 
                ephemeral: true 
            });
        }
    }

    // 4. REDDET BUTONUNA BASILDIĞINDA SEBEP MODALINI TETİKLEME
    if (interaction.isButton() && interaction.customId.startsWith('redtetik_')) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '<a:986721633832149022:1507752193527250944> Bu işlemi yapmaya yetkiniz yok!', ephemeral: true });
        }
        const [, userId, mcName] = interaction.customId.split('_');

        const redModal = new ModalBuilder()
            .setCustomId(`redmodalsubmit_${userId}_${mcName}`)
            .setTitle('Reddetme Sebebi');

        const reasonInput = new TextInputBuilder()
            .setCustomId('red_sebebi')
            .setLabel("Reddetme Sebebi (İsteğe Bağlı)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        redModal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(redModal);
    }

    // 5. SEBEP GİRİLDİKTEN SONRA RED İŞLEMİNİ TAMAMLAMA
    if (interaction.isModalSubmit() && interaction.customId.startsWith('redmodalsubmit_')) {
        const [, userId, mcName] = interaction.customId.split('_');
        let redSebebi = interaction.fields.getTextInputValue('red_sebebi') || 'Belirtilmedi';

        const targetUser = await client.users.fetch(userId).catch(() => null);
        const logKanal = await client.channels.fetch(process.env.LOG_KANAL_ID).catch(() => null);

        if (targetUser) {
            await targetUser.send(`<a:1439619909863735477:1507752215270527036> Maalesef sunucu başvurunuz reddedildi.\n**Neden:** \`${redSebebi}\``).catch(() => {});
        }

        if (logKanal) {
            const logEmbed = new EmbedBuilder()
                .setTitle('<a:960733infested:1507752176758292602> BAŞVURU SONUCU: REDDEDİLDİ')
                .setColor('#ff0000')
                .setDescription(
                    `• <:87389steve:1507752047766671510> **Oyuncu:** ${targetUser || `\`${userId}\``} (\`${mcName}\`)\n` +
                    `• <a:919406slowness:1507752168566821105> **Durum:** Başvuru reddedildi.\n` +
                    `• 📝 **Reddedilme Nedeni:** \`${redSebebi}\``
                );
            await logKanal.send({ embeds: [logEmbed] }).catch(() => {});
        }

        const guncelEmbed = new EmbedBuilder()
            .setTitle('<a:960733infested:1507752176758292602> BAŞVURU REDDEDİLDİ')
            .setColor('#2f3136')
            .setDescription(
                `• <:87389steve:1507752047766671510> **Oyuncu Adı:** \`${mcName}\`\n` +
                `• <a:20756irongolem:1507751974299242496> **Reddeden Yetkili:** ${interaction.user}\n` +
                `• 📝 **Verilen Sebep:** \`${redSebebi}\``
            );

        await interaction.update({ embeds: [guncelEmbed], components: [] });
    }

    // 6. ONAYLA BUTON AKSİYONU
    if (interaction.isButton() && interaction.customId.startsWith('onay_')) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '<a:986721633832149022:1507752193527250944> Bu işlemi yapmaya yetkiniz yok!', ephemeral: true });
        }

        const [, userId, mcName] = interaction.customId.split('_');
        const targetUser = await client.users.fetch(userId).catch(() => null);
        const logKanal = await client.channels.fetch(process.env.LOG_KANAL_ID).catch(() => null);

        try {
            await rcon.send(`whitelist add ${mcName}`);
            if (targetUser) {
                await targetUser.send(`<a:1087065457560912082:1507752200523219166> Tebrikler! **${mcName}** hesabınız onaylandı. Sunucuya girebilirsiniz!`).catch(() => {});
            }
            
            if (logKanal) {
                const onayLogEmbed = new EmbedBuilder()
                    .setTitle('<a:1087065457560912082:1507752200523219166> BAŞVURU SONUCU: ONAYLANDI')
                    .setColor('#00ff00')
                    .setDescription(
                        `• <:87389steve:1507752047766671510> **Oyuncu:** ${targetUser || `\`${userId}\``} (\`${mcName}\`)\n` +
                        `• <a:8969parrotvibe:1507751926815789277> **Durum:** Başvuru onaylandı ve Whitelist listesine eklendi!`
                    );
                await logKanal.send({ embeds: [onayLogEmbed] }).catch(() => {});
            }

            const onayGuncelEmbed = new EmbedBuilder()
                .setTitle('<a:64587jebspinning:1507752020759674931> BAŞVURU ONAYLANDI')
                .setColor('#2f3136')
                .setDescription(
                    `• <:87389steve:1507752047766671510> **Oyuncu Adı:** \`${mcName}\`\n` +
                    `• <a:20756irongolem:1507751974299242496> **Onaylayan Yetkili:** ${interaction.user}\n` +
                    `• <a:8969parrotvibe:1507751926815789277> **Sonuç:** Oyuncu whitelist'e başarıyla eklendi.`
                );

            await interaction.update({ embeds: [onayGuncelEmbed], components: [] });
        } catch (err) {
            await interaction.reply({ content: `RCON Hatası: ${err.message}`, ephemeral: true });
        }
    }

    // 7. YETKİLİ HIZLI CEZA BUTONLARI (KICK / BAN)
    if (interaction.isButton() && (interaction.customId.startsWith('ykick_') || interaction.customId.startsWith('yban_'))) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '<a:986721633832149022:1507752193527250944> Bu işlemi yapmaya yetkiniz yok!', ephemeral: true });
        }

        const [actionPrefix, userId, mcName] = interaction.customId.split('_');
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!member) return interaction.reply({ content: 'Kullanıcı Discord sunucusunda bulunamadı.', ephemeral: true });

        if (actionPrefix === 'ykick') {
            await member.kick('Başvuru panelinden yetkili kararıyla uzaklaştırıldı.').catch(err => console.error(err));
            await interaction.reply({ content: `<:85890netherquartz:1507752043241279529> \`${mcName}\` kullanıcısı başarıyla sunucudan uzaklaştırıldı (Kick).`, ephemeral: true });
        } else if (actionPrefix === 'yban') {
            await member.ban({ reason: 'Başvuru panelinden yetkili kararıyla yasaklandı.' }).catch(err => console.error(err));
            await interaction.reply({ content: `<:7803minecraftdogo:1507751902547542196> \`${mcName}\` kullanıcısı başarıyla sunucudan yasaklandı (Ban).`, ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);