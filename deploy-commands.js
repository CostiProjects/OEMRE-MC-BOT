const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
	}
}

// ⚠️ .env DOSYASININ EZEMEMESİ İÇİN ÖZEL İSİMLENDİRME YAPTIK:
// Buraya tırnakların içine Discord Developer Portal'dan aldığın güncel tokenı yapıştır kanka.
const BOT_TOKEN_ELLE = "MTUwNzcxNTc1MTU5Mzc3NTE1NA.GCcG6X.qD9ORQUvJ_w3UqSn_ZwaF7IJA2mhnOoqme-EQI";
const CLIENT_ID_ELLE = "1507715751593775154"; 

const rest = new REST().setToken(BOT_TOKEN_ELLE);

(async () => {
	try {
		console.log(`${commands.length} adet slash komutu GLOBAL olarak kaydedilmeye başlanıyor...`);

		await rest.put(
			Routes.applicationCommands(CLIENT_ID_ELLE),
			{ body: commands },
		);

		console.log('✅ BAŞARDIK KANKA! Tüm slash komutları GLOBAL olarak kaydedildi. İstediğin sunucuda deneyebilirsin artık!');
	} catch (error) {
		console.error('Komutlar kaydedilirken hata oluştu:', error);
	}
})();