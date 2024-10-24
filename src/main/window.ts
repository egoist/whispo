import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  shell,
  screen,
  app,
} from "electron"
import path from "path"
import { getRendererHandlers } from "@egoist/tipc/main"
import {
  makeKeyWindow,
  makePanel,
  makeWindow,
} from "@egoist/electron-panel-window"
import { RendererHandlers } from "./renderer-handlers"
import { configStore } from "./config"

type WINDOW_ID = "main" | "panel" | "setup"

export const WINDOWS = new Map<WINDOW_ID, BrowserWindow>()

function createBaseWindow({
  id,
  url,
  showWhenReady = true,
  windowOptions,
}: {
  id: WINDOW_ID
  url?: string
  showWhenReady?: boolean
  windowOptions?: BrowserWindowConstructorOptions
}) {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...windowOptions,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      ...windowOptions?.webPreferences,
    },
  })

  WINDOWS.set(id, win)

  if (showWhenReady) {
    win.on("ready-to-show", () => {
      win.show()
    })
  }

  win.on("close", () => {
    console.log("close", id)
    WINDOWS.delete(id)
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  const baseUrl = import.meta.env.PROD
    ? "assets://app"
    : process.env["ELECTRON_RENDERER_URL"]

  win.loadURL(`${baseUrl}${url || ""}`)

  return win
}

export function createMainWindow({ url }: { url?: string } = {}) {
  const win = createBaseWindow({
    id: "main",
    url,
    windowOptions: {
      titleBarStyle: "hiddenInset",
    },
  })

  if (process.env.IS_MAC) {
    win.on("close", () => {
      if (configStore.get().hideDockIcon) {
        app.setActivationPolicy("accessory")
        app.dock.hide()
      }
    })

    win.on("show", () => {
      if (configStore.get().hideDockIcon && !app.dock.isVisible()) {
        app.dock.show()
      }
    })
  }

  return win
}

export function createSetupWindow() {
  const win = createBaseWindow({
    id: "setup",
    url: "/setup",
    windowOptions: {
      titleBarStyle: "hiddenInset",
      width: 800,
      height: 600,
      resizable: false,
    },
  })

  return win
}

export function showMainWindow(url?: string) {
  const win = WINDOWS.get("main")

  if (win) {
    win.show()
    if (url) {
      getRendererHandlers<RendererHandlers>(win.webContents).navigate.send(url)
    }
  } else {
    createMainWindow({ url })
  }
}

const panelWindowSize = {
  width: 50,
  height: 20,
}

const getPanelWindowPosition = () => {
  // position the window top right
  const currentScreen = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  )
  const screenSize = currentScreen.workArea
  const position = {
    x: Math.floor(
      screenSize.x + (screenSize.width/2 - panelWindowSize.width/2 ),
    ),
    y: screenSize.y + screenSize.height - panelWindowSize.height -1,
  }

  return position
}


export function createPanelWindow() {
  const position = getPanelWindowPosition()

  const win = createBaseWindow({
    id: "panel",
    url: "/panel",
    showWhenReady: false,
    windowOptions: {
      hiddenInMissionControl: true,
      skipTaskbar: true,
      closable: false,
      maximizable: false,
      frame: false,
      transparent: true,
      opacity: 0.7,
      paintWhenInitiallyHidden: true,
      // hasShadow: false,
      width: panelWindowSize.width,
      height: panelWindowSize.height,
      maxWidth: panelWindowSize.width,
      maxHeight: panelWindowSize.height,
      minWidth: panelWindowSize.width,
      minHeight: panelWindowSize.height,
      visualEffectState: "active",
      vibrancy: "under-window",
      alwaysOnTop: true,
      x: position.x,
      y: position.y,
    },
  })

  win.setBackgroundColor("#000000")

  win.on("hide", () => {
    getRendererHandlers<RendererHandlers>(win.webContents).stopRecording.send()
  })

  makePanel(win)

  return win
}

export function showPanelWindow() {
  const win = WINDOWS.get("panel")
  if (win) {
    const position = getPanelWindowPosition()
    win.setPosition(position.x, position.y)
    win.showInactive()
    makeKeyWindow(win)
  }
}

export function showPanelWindowAndStartRecording() {
  showPanelWindow()
  getWindowRendererHandlers("panel")?.startRecording.send()
}

export function makePanelWindowClosable() {
  const panel = WINDOWS.get("panel")
  if (panel && !panel.isClosable()) {
    makeWindow(panel)
    panel.setClosable(true)
  }
}

export const getWindowRendererHandlers = (id: WINDOW_ID) => {
  const win = WINDOWS.get(id)
  if (!win) return
  return getRendererHandlers<RendererHandlers>(win.webContents)
}

export const stopRecordingAndHidePanelWindow = () => {
  const win = WINDOWS.get("panel")
  if (win) {
    getRendererHandlers<RendererHandlers>(win.webContents).stopRecording.send()

    if (win.isVisible()) {
      win.hide()
    }
  }
}
