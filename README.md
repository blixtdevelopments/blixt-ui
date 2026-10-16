# Blixt UI

Three themed interfaces for FiveM scripts that use ox_lib. Blixt UI keeps the existing ox_lib calls and replaces the appearance of supported UI components.

**Themes:** Paper Trail (80s), Desktop 95 (90s), and Modern Minimal. Each has three presets, all selectable in-game.

## Installation

1. Download the **Blixt-compatible ox_lib release** and the **Blixt UI release**. Use the release ZIPs, not GitHub's **Code > Download ZIP** option.
2. Extract them into your server's resources folder. The resource names must be exactly `ox_lib` and `blixt-ui`.
3. If you're replacing an existing ox_lib installation, back it up first. Keep only one active `ox_lib` resource.
4. Start the resources in this order in `server.cfg`, ahead of scripts that rely on ox_lib:

```cfg
ensure ox_lib
ensure blixt-ui
```

5. Give your admin group permission to open the editor:

```cfg
add_ace group.admin blixtui.admin allow
```

Restart the server and use `/blixtadmin` in-game. No changes to other scripts are needed for the supported ox_lib components.

## Theme editor

Open `/blixtadmin`, choose **Theme Editor**, select a theme and preset, then click **Save & Apply**.

| Theme | Presets |
| --- | --- |
| Paper Trail | Original, White Paper, Vintage Yellow |
| Desktop 95 | Classic, Gradient, Midnight |
| Modern Minimal | Graphite, Frost, Midnight Blue |

You see theme changes immediately while previewing. **Save & Apply** sends the selection to everyone online without a restart. Closing the editor or selecting **Discard** cancels an unsaved preview.

Settings are stored in `editor-settings.json` and loaded again after resource or server restarts. On a new installation, the default is **Modern Minimal / Graphite**. The theme is controlled in the editor, not `config.lua`.

The **Component Testing** page lets admins try the supported controls. The admin menu reopens after a test finishes or is cancelled.

## Supported ox_lib interfaces

- Notifications
- Progress bar and progress circle
- Context and list menus
- Radial menu
- Input and alert dialogs
- Text UI
- Skill checks

Existing Lua callbacks, menu registrations and progress gameplay are still handled by ox_lib. If Blixt UI is not running, the patched fork falls back to stock ox_lib UI where supported.

Some advanced ox_lib styling, Markdown, embedded media and specialised input options may not display exactly as they do in the original interface. Test scripts that rely on those features before putting the resource on a public server.

## Troubleshooting

- **Nothing opens:** Confirm `ox_lib` is the Blixt-compatible fork and starts before `blixt-ui`.
- **Admin command is denied:** Check the `blixtui.admin` ACE permission.
- **Theme doesn't save:** Check write permissions on the `blixt-ui` resource folder.
- **Old appearance stays after an update:** Restart both resources and check for duplicate resource folders.

## Credits and licence

Blixt UI is a separate project by **Blixt Developments**. It works with a modified fork of [Overextended's ox_lib](https://github.com/overextended/ox_lib); ox_lib is licensed under LGPL-3.0-or-later. See [NOTICE.md](NOTICE.md) for attribution. The ox_lib source, licence and upstream notices remain with the fork.

The Blixt UI project's own redistribution terms should be supplied separately by its owner before a public release.
