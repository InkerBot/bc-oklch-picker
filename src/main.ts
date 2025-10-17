import bcModSdk from "./modsdk/bcmodsdk";

const OKLCH_PICKER_URL = 'https://inkerbot.github.io/oklch-picker/';

const mod = bcModSdk.registerMod({
  name: "OKLCH Picker",
  fullName: "OKLCH Picker",
  version: "1.0.0",
  repository: "https://github.com/InkerBot/bc-oklch-picker",
});

let oklchPickerWindow: Window | null = null;
let oklchHandshakeReceived = false;
let oklchHanding = false;
let colorPickerButtonX = NaN;
let handshakeIntervalId: number | null = null;

function getCurrentColor(): string {
  return ColorPickerSourceElement?.value ?? '#ffffff';
}

function setCurrentAlpha(O: number) {
  if (ItemColorItem.Property == null) ItemColorItem.Property = {};
  if (O < 0) O = 0;
  if (O > 1) O = 1;
  if ((ItemColorItem.Asset == null) || !CommonIsArray(ItemColorItem.Asset.Layer) || (ItemColorItem.Asset.Layer.length <= 1)) {
    ItemColorItem.Property.Opacity = O;
  } else {
    if (!CommonIsArray(ItemColorItem.Property.Opacity) || (ItemColorItem.Property.Opacity.length != ItemColorItem.Asset.Layer.length)) {
      ItemColorItem.Property.Opacity = Array(ItemColorItem.Asset.Layer.length).fill(1);
    }
    if (CommonIsArray(ItemColorPickerIndices))
      for (let I of ItemColorPickerIndices)
        ItemColorItem.Property.Opacity[I] = O;
  }
}

function getCurrentAlpha(): number {
  if (ItemColorItem.Property?.Opacity === undefined) {
    return 1;
  }
  if (CommonIsArray(ItemColorItem.Property.Opacity)) {
    return ItemColorItem.Property.Opacity[ItemColorPickerIndices[0]];
  }
  return ItemColorItem.Property.Opacity;
}

function sendPickerMessage(type: string, color?: string, alpha?: number): void {
  if (!oklchPickerWindow || oklchPickerWindow.closed) {
    return;
  }

  const message: any = {
    oklch_picker: true,
    type: type,
  };

  if (color !== undefined) {
    message.color = color;
  }
  if (alpha !== undefined) {
    message.alpha = alpha;
  }

  oklchPickerWindow.postMessage(message, '*');
}

function sendCurrentColor() {
  if (oklchHanding) {
    return
  }
  sendPickerMessage('set_color', getCurrentColor(), getCurrentAlpha());
}

function clearHandshakeInterval(): void {
  if (handshakeIntervalId !== null) {
    clearInterval(handshakeIntervalId);
    handshakeIntervalId = null;
  }
}

function initiateHandshake(): void {
  clearHandshakeInterval();

  handshakeIntervalId = window.setInterval(() => {
    // Stop if window was closed
    if (!oklchPickerWindow || oklchPickerWindow.closed || oklchHandshakeReceived) {
      clearHandshakeInterval();
      return;
    }

    try {
      sendPickerMessage('handshake');
    } catch (error) {
      ToastManager.error(`Failed to establish connection with OKLCH Picker: ${error}`);
      clearHandshakeInterval();
    }
  }, 100);
}

function openOKLCHPicker(): void {
  // If picker is already open, focus it and update the color
  if (oklchPickerWindow && !oklchPickerWindow.closed) {
    sendCurrentColor();
    oklchPickerWindow.focus();
    return;
  }

  oklchHandshakeReceived = false;
  oklchPickerWindow = window.open(
    OKLCH_PICKER_URL,
    '_blank',
    'width=800,height=600'
  );

  if (!oklchPickerWindow) {
    ToastManager.error("Failed to open OKLCH Picker window");
    return;
  }
  initiateHandshake();
}

window.addEventListener('message', (event: MessageEvent) => {
  if (!event.data?.oklch_picker) {
    return;
  }

  switch (event.data.type) {
    case 'handshake_response':
      // Handshake acknowledged - picker is ready
      // Send initial color to the picker
      sendCurrentColor();
      oklchHandshakeReceived = true;
      break;

    case 'color_change':
      if (oklchHandshakeReceived) {
        oklchHanding = true;
        try {
          if (ColorPickerSourceElement) {
            ColorPickerSourceElement.value = event.data.color.toUpperCase();
          }
          if (event.data.alpha !== undefined) {
            setCurrentAlpha(event.data.alpha);
          } else {
            setCurrentAlpha(1);
          }
        } finally {
          oklchHanding = false;
        }
      }
      break;

    default:
      console.warn('Unknown message type from OKLCH picker:', event.data);
  }
});

window.addEventListener('beforeunload', () => {
  clearHandshakeInterval();

  if (oklchPickerWindow && !oklchPickerWindow.closed) {
    oklchPickerWindow.close();
  }
});

function isPointInRect(x: number, y: number, rectX: number, rectY: number, rectWidth: number, rectHeight: number): boolean {
  return x > rectX && x < rectX + rectWidth && y > rectY && y < rectY + rectHeight;
}

mod.hookFunction("ColorPickerDraw", 0, (data, next) => {
  colorPickerButtonX = ColorPickerLayout.SaveButtonX - (ColorPickerWidth / 6);
  const buttonY = ColorPickerLayout.PaletteOffset + ((ColorPickerLayout.PaletteHeight - 90) / 2);

  DrawButton(colorPickerButtonX, buttonY, 90, 90, "", "White", "Icons/Color.png", "OKLCH");

  return next(data);
});

mod.hookFunction("ColorPickerStartPick", 0, (data, next) => {
  const coordinates = ColorPickerGetCoordinates(data[0]);
  const { X, Y } = coordinates;

  // Check if click is within the button area
  if (isPointInRect(X, Y, colorPickerButtonX, ColorPickerLayout.ButtonOffset, 90, 90)) {
    openOKLCHPicker();
  }

  return next(data);
});

mod.hookFunction("ColorPickerNotify", 0, (data, next) => {
  const result = next(data);

  // Sync the current color to the OKLCH picker if it's open
  sendCurrentColor();

  return result;
});

mod.hookFunction("ColorPickerPickOpacity", 0, (data, next) => {
  const result = next(data);

  // Sync the current color to the OKLCH picker if it's open
  sendCurrentColor();

  return result;
});

mod.hookFunction("ItemColorOpenPicker", 0, (data, next) => {
  return next(data);
});

mod.hookFunction("ItemColorCloseColorPicker", 0, (data, next) => {
  clearHandshakeInterval();

  if (oklchPickerWindow && !oklchPickerWindow.closed) {
    oklchPickerWindow.close();
    oklchPickerWindow = null;
  }

  return next(data);
});
