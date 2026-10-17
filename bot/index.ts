import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const portalUrl = process.env.PORTAL_URL;
const reviewChannelId = process.env.APPLICATION_REVIEW_CHANNEL_ID;

if (!token || !clientId) {
  throw new Error("Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID before starting the bot.");
}

const departments = [
  "Moderator", "Administrator", "HR", "FTO", "Police", "Fire", "EMS", "DOT",
  "SWAT", "K9", "Traffic Enforcement", "Judge", "CSI", "Detective", "Coroner",
];

const commands = [
  new SlashCommandBuilder()
    .setName("portal")
    .setDescription("Get the personnel portal link"),
  new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Start a department application"),
];

const rest = new REST({ version: "10" }).setToken(token);
const commandRoute = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Personnel bot ready as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "portal") {
      await interaction.reply({
        content: portalUrl
          ? `Personnel portal: ${portalUrl}`
          : "The portal URL has not been configured yet.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.commandName === "apply") {
      const departmentMenu = new StringSelectMenuBuilder()
        .setCustomId("application-department")
        .setPlaceholder("Choose a department")
        .addOptions(departments.map((department) => ({ label: department, value: department })));
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(departmentMenu);
      await interaction.reply({
        content: "Choose a department to begin. Application answers are sent to the configured review channel.",
        components: [row],
        ephemeral: true,
      });
      return;
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "application-department") {
    const department = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`application:${department}`)
      .setTitle(`${department} application`);

    const characterName = new TextInputBuilder()
      .setCustomId("character-name")
      .setLabel("Roleplay character name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80);
    const experience = new TextInputBuilder()
      .setCustomId("experience")
      .setLabel("Server RP experience and relevant rank")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(120);
    const motivation = new TextInputBuilder()
      .setCustomId("motivation")
      .setLabel("Why are you applying to this department?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(900);
    const scenario = new TextInputBuilder()
      .setCustomId("scenario")
      .setLabel("How would you handle a conflicting call report?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(900);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(characterName),
      new ActionRowBuilder<TextInputBuilder>().addComponents(experience),
      new ActionRowBuilder<TextInputBuilder>().addComponents(motivation),
      new ActionRowBuilder<TextInputBuilder>().addComponents(scenario),
    );
    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("application:")) {
    if (!reviewChannelId) {
      await interaction.reply({
        content: "Applications are not available yet. The review channel has not been configured.",
        ephemeral: true,
      });
      return;
    }

    const channel = await client.channels.fetch(reviewChannelId);
    if (!channel || !channel.isTextBased() || !("send" in channel)) {
      await interaction.reply({
        content: "The configured application review channel is unavailable. Please contact an administrator.",
        ephemeral: true,
      });
      return;
    }

    const department = interaction.customId.slice("application:".length);
    const embed = new EmbedBuilder()
      .setTitle(`New ${department} application`)
      .setColor(0x397765)
      .addFields(
        { name: "Discord applicant", value: `${interaction.user.tag} (${interaction.user.id})` },
        { name: "Character", value: interaction.fields.getTextInputValue("character-name") },
        { name: "Experience / rank", value: interaction.fields.getTextInputValue("experience") },
        { name: "Motivation", value: interaction.fields.getTextInputValue("motivation") },
        { name: "Scenario response", value: interaction.fields.getTextInputValue("scenario") },
      )
      .setFooter({ text: "Human review required · submission is not an acceptance or denial" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({
      content: "Application received for human review. This bot does not make interview or hiring decisions.",
      ephemeral: true,
    });
  }
});

void rest.put(commandRoute, { body: commands.map((command) => command.toJSON()) })
  .then(() => client.login(token))
  .catch((error: unknown) => {
    console.error("Failed to register commands or start the bot.", error);
    process.exitCode = 1;
  });
