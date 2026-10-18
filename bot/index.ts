import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

function requireEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in .env.local.`);
  }
  return value;
}

const botToken = requireEnvironmentValue("DISCORD_BOT_TOKEN");
const clientId = requireEnvironmentValue("DISCORD_CLIENT_ID");
const guildId = process.env.DISCORD_GUILD_ID;
const reviewChannelId = process.env.APPLICATION_REVIEW_CHANNEL_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("portal")
    .setDescription("Open the Civic Operations personnel portal."),
  new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Submit a staff application for human review."),
].map((command) => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function getPortalUrl(): URL {
  const configuredUrl = process.env.PORTAL_URL;
  if (!configuredUrl) {
    throw new Error("PORTAL_URL is not set in .env.local.");
  }

  const normalizedUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;
  const url = new URL(normalizedUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("PORTAL_URL must use HTTP or HTTPS.");
  }

  return url;
}

async function handleChatCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === "portal") {
    try {
      const portalUrl = getPortalUrl();
      const button = new ButtonBuilder()
        .setLabel("Open Personnel Portal")
        .setStyle(ButtonStyle.Link)
        .setURL(portalUrl.toString());

      await interaction.reply({
        content: `Civic Operations Personnel Portal: ${portalUrl.toString()}`,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
        ephemeral: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown configuration error.";
      await interaction.reply({
        content: `The portal link is unavailable: ${message}`,
        ephemeral: true,
      });
    }
    return;
  }

  if (interaction.commandName === "apply") {
    const modal = new ModalBuilder()
      .setCustomId("staff-application")
      .setTitle("Staff Application")
      .addComponents(
        createInput("display_name", "Preferred/display name", TextInputStyle.Short, 80),
        createInput("roblox_username", "Roblox username", TextInputStyle.Short, 40),
        createInput("department", "Department applying for", TextInputStyle.Short, 80),
        createInput("experience", "Relevant experience", TextInputStyle.Paragraph, 1000),
        createInput("motivation", "Why do you want to join?", TextInputStyle.Paragraph, 1000),
      );

    await interaction.showModal(modal);
  }
}

function createInput(
  id: string,
  label: string,
  style: TextInputStyle,
  maxLength: number,
) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setMaxLength(maxLength)
    .setRequired(true);

  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

async function handleApplication(interaction: import("discord.js").ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!reviewChannelId) {
    await interaction.editReply(
      "Applications cannot be submitted right now: APPLICATION_REVIEW_CHANNEL_ID is not configured.",
    );
    return;
  }

  const channel = await client.channels.fetch(reviewChannelId);
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    throw new Error("APPLICATION_REVIEW_CHANNEL_ID does not point to a text channel the bot can access.");
  }

  const embed = new EmbedBuilder()
    .setTitle("New Staff Application")
    .setColor(0x2563eb)
    .setTimestamp()
    .addFields(
      { name: "Applicant", value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: "Preferred/display name", value: interaction.fields.getTextInputValue("display_name") },
      { name: "Roblox username", value: interaction.fields.getTextInputValue("roblox_username") },
      { name: "Department", value: interaction.fields.getTextInputValue("department") },
      { name: "Relevant experience", value: interaction.fields.getTextInputValue("experience") },
      { name: "Motivation", value: interaction.fields.getTextInputValue("motivation") },
    );

  await channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
  });
  await interaction.editReply("Your application was sent to the staff review team.");
}

client.on(Events.InteractionCreate, (interaction) => {
  const handler = interaction.isChatInputCommand()
    ? handleChatCommand(interaction)
    : interaction.isModalSubmit() && interaction.customId === "staff-application"
      ? handleApplication(interaction)
      : Promise.resolve();

  void handler.catch(async (error: unknown) => {
    console.error("Failed to handle Discord interaction:", error);
    const message = "Something went wrong while handling that request. Please try again later.";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(console.error);
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(console.error);
      }
    }
  });
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Discord bot ready as ${readyClient.user.tag}.`);
});

async function start() {
  const rest = new REST({ version: "10" }).setToken(botToken);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Registered slash commands for development guild ${guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Registered global slash commands; global updates may take time to appear.");
  }

  await client.login(botToken);
}

void start().catch((error: unknown) => {
  console.error("Failed to start Discord bot:", error);
  process.exitCode = 1;
});
