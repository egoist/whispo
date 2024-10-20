import { Menu, MenuItemConstructorOptions, shell } from "electron"

const toMenu = (
  items: Array<MenuItemConstructorOptions | null | false | undefined | "">,
) => {
  return items.filter(Boolean) as MenuItemConstructorOptions[]
}

export const createAppMenu = () => {
  const isMac = process.env.IS_MAC

  const template: Electron.MenuItemConstructorOptions[] = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
          {
            label: process.env.PRODUCT_NAME,
            submenu: [
              { role: "about" as const },

              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    // { role: 'fileMenu' }
    {
      label: "File",
      submenu: [
        isMac
          ? {
              label: "Close",
              accelerator: "CmdOrCtrl+W",
              click(_, window) {
                if (!window) return

                if (window.closable) {
                  window.close()
                } else {
                  window.hide()
                }
              },
            }
          : { role: "quit" as const },
      ],
    },
    // { role: 'editMenu' }
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const },
        { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const },
        { role: "copy" as const },
        { role: "paste" as const },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" as const },
              { role: "delete" as const },
              { role: "selectAll" as const },
              { type: "separator" as const },
              {
                label: "Speech",
                submenu: [
                  { role: "startSpeaking" as const },
                  { role: "stopSpeaking" as const },
                ],
              },
            ]
          : [
              { role: "delete" as const },
              { type: "separator" as const },
              { role: "selectAll" as const },
            ]),
      ],
    },
    // { role: 'viewMenu' }
    {
      label: "View",
      submenu: toMenu([
        import.meta.env.DEV && { role: "toggleDevTools" },
        import.meta.env.DEV && { type: "separator" },
        import.meta.env.DEV && { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ]),
    },
    // { role: 'windowMenu' }
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },
    {
      role: "help" as const,
      submenu: toMenu([
        {
          label: "Send Feedback",
          click() {
            shell.openExternal("https://github.com/egoist/whispo/issues/new")
          },
        },
      ]),
    },
  ]

  const menu = Menu.buildFromTemplate(template)

  return menu
}
