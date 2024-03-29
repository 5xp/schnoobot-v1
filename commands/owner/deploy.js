module.exports = {
  name: "deploy",
  description: "deploy slash commands",
  slash: true,
  options: [{ name: "global", type: "BOOLEAN", description: "deploy commands globally", required: false }],
  async execute(interaction, args) {
    const isOwner = interaction.member.id === interaction.client.application?.owner.id;
    if (!isOwner) return;
    const isSlash = interaction.isCommand?.();

    const cmds = interaction.client.commands
      .filter(command => command.slash)
      .map(command => {
        let {
          name,
          description = "missing description",
          options = [],
          slash = false,
          defaultPermission = true,
          slashPermissions = [],
        } = command;
        if (typeof name === "string") name = [name];
        const cmd = { name: name[0], description, options, defaultPermission, permissions: slashPermissions };
        return cmd;
      });

    if (isSlash) {
      await interaction.deferReply({ ephemeral: true });
      const isGlobal = interaction.options.get("global")?.value;
      if (isGlobal) {
        await setCommands(interaction.client.application?.commands);
        await interaction.editReply(`Globally registered ${cmds.length} commands!`);
      } else {
        await setCommands(interaction.guild?.commands);
        await interaction.editReply(`Registered ${cmds.length} commands to this guild!`);
      }
    } else {
      await setCommands(interaction.guild?.commands);
      interaction.reply(`Registered ${cmds.length} commands to this guild!`);
    }

    async function setCommands(commandManager) {
      // if not deployed to guild don't bother with commands that use permissions
      const appCommands = await commandManager.set(
        commandManager?.guild ? cmds : cmds.filter(cmd => !cmd.permissions.length)
      );

      // for some reason we can only set permissions after setting the commands
      if (commandManager?.guild) {
        const fullPermissions = appCommands
          .map(appCommand => {
            const permissions = cmds.find(cmd => cmd.name === appCommand.name).permissions;
            return { id: appCommand.id, permissions };
          })
          .filter(appCommand => appCommand.permissions.length);
        await commandManager.permissions.set({ fullPermissions });
      }
    }
  },
};
