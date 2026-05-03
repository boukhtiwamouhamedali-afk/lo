const {
  Client, GatewayIntentBits, ChannelType, PermissionsBitField,
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const SUPPORT_ROLE_ID = "1499871731588923512";
const ADMIN_ROLE_ID = "1499871731588923512";
const OWNER_ROLE_ID = "1499872583309594714";

const claimedTickets = new Map();

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ================== أوامر ==================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 📩 بانل
  if (message.content === '!panel') {

    const embed = new EmbedBuilder()
      .setTitle('📩 نظام التكتات')
      .setDescription('اختر نوع التكت من القائمة\n\n📌 هذا البوت من تطوير المسؤول <@1464504159943266394>')
      .setColor('Blue');

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('اختر نوع التكت')
        .addOptions([
          { label: '💻 مبرمج', value: 'dev' },
          { label: '📱 سوشيال ميديا', value: 'media' },
          { label: '⚽ تقديم نادي', value: 'club' },
          { label: '📋 إدارة', value: 'admin' },
          { label: '🚨 تبليغ', value: 'report' },
          { label: '🛠️ دعم فني', value: 'support' }
        ])
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // ➕ إضافة عضو
  if (message.content.startsWith('!add')) {

    if (!message.channel.name.includes('ticket')) return;

    const member = message.mentions.members.first();
    if (!member) return message.reply('❌ منشن عضو');

    const claimer = claimedTickets.get(message.channel.id);

    if (
      message.member.id !== claimer &&
      !message.member.roles.cache.has(OWNER_ROLE_ID)
    ) {
      return message.reply('❌ فقط المستلم أو الأونر');
    }

    try {
      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true
      });

      const msg = await message.channel.send(`✅ تم اضافة ${member}`);
      setTimeout(() => msg.delete().catch(()=>{}), 3000);

    } catch {
      message.reply('❌ خطأ بالصلاحيات');
    }
  }
});

// ================== التفاعل ==================
client.on('interactionCreate', async (interaction) => {

  // 📌 اختيار → نموذج
  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const existing = interaction.guild.channels.cache.find(c =>
      c.name.includes(interaction.user.username)
    );

    if (existing) {
      return interaction.reply({ content: `❌ عندك تكت: ${existing}`, ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_${type}`)
      .setTitle('نموذج');

    const input = (id, label) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      );

    if (type === 'dev') {
      modal.addComponents(input('q1','ما هي خبرتك'), input('q2','هل لك خبرة بالبوتات'));
    }

    if (type === 'media') {
      modal.addComponents(input('q1','هل تعرف تبرمج'));
    }

    if (type === 'club') {
      modal.addComponents(
        input('q1','النادي'),
        input('q2','مركزك'),
        input('q3','اسمك'),
        input('q4','توقيعك')
      );
    }

    if (type === 'admin') {
      modal.addComponents(
        input('q1','ليش نختارك'),
        input('q2','خبرتك بالديسكورد')
      );
    }

    if (type === 'report') {
      modal.addComponents(
        input('q1','الشخص'),
        input('q2','السبب'),
        input('q3','المنشن')
      );
    }

    if (type === 'support') {
      modal.addComponents(input('q1','مشكلتك'));
    }

    return interaction.showModal(modal);
  }

  // 📥 إرسال النموذج
  if (interaction.isModalSubmit()) {

    const type = interaction.customId.replace('modal_', '');
    const answers = interaction.fields.fields.map(f => `**${f.customId}**: ${f.value}`).join('\n');

    const channel = await interaction.guild.channels.create({
      name: `ticket-${type}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: SUPPORT_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: ADMIN_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: OWNER_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ],
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('📌 استلام').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('reset_ticket').setLabel('🔄 إعادة ضبط').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ اغلاق').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle('📋 معلومات التكت')
      .setDescription(`👤 ${interaction.user}\n\n${answers}`)
      .setColor('Green');

    await channel.send({
      content: `<@&${ADMIN_ROLE_ID}>`,
      embeds: [embed],
      components: [buttons]
    });

    interaction.reply({ content: `✅ ${channel}`, ephemeral: true });
  }

  // 🔘 الأزرار
  if (interaction.isButton()) {

    const ch = interaction.channel;

    // استلام
    if (interaction.customId === 'claim_ticket') {

      if (!interaction.member.roles.cache.has(SUPPORT_ROLE_ID))
        return interaction.reply({ content: '❌ ما عندك صلاحية', ephemeral: true });

      await ch.permissionOverwrites.edit(SUPPORT_ROLE_ID, { SendMessages: false });
      await ch.permissionOverwrites.edit(ADMIN_ROLE_ID, { SendMessages: false });

      await ch.permissionOverwrites.edit(interaction.user.id, { SendMessages: true });
      await ch.permissionOverwrites.edit(OWNER_ROLE_ID, { SendMessages: true });

      claimedTickets.set(ch.id, interaction.user.id);

      interaction.reply(`📌 ${interaction.user} استلم التكت`);
    }

    // 🔄 إعادة ضبط
    if (interaction.customId === 'reset_ticket') {

      if (
        !interaction.member.roles.cache.has(SUPPORT_ROLE_ID) &&
        !interaction.member.roles.cache.has(OWNER_ROLE_ID)
      ) {
        return interaction.reply({ content: '❌ ما عندك صلاحية', ephemeral: true });
      }

      await ch.permissionOverwrites.edit(SUPPORT_ROLE_ID, { SendMessages: true });
      await ch.permissionOverwrites.edit(ADMIN_ROLE_ID, { SendMessages: true });

      claimedTickets.delete(ch.id);

      interaction.reply({ content: '🔄 تم إعادة الضبط', ephemeral: true });
    }

    // اغلاق
    if (interaction.customId === 'close_ticket') {

      const msgs = await ch.messages.fetch({ limit: 100 });
      const text = msgs.map(m => `${m.author.tag}: ${m.content}`).reverse().join('\n');

      const file = {
        attachment: Buffer.from(text, 'utf-8'),
        name: 'transcript.txt'
      };

      await ch.send({ files: [file] });

      const rate = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rate1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rate5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
      );

      await ch.send({ content: '⭐ تقييم:', components: [rate] });

      setTimeout(()=>ch.delete().catch(()=>{}), 5000);

      interaction.reply({ content: '❌ سيتم الاغلاق...', ephemeral: true });
    }

    if (interaction.customId.startsWith('rate')) {
      interaction.reply({ content: '✅ شكرا', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);