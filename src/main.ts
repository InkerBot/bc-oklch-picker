import bcModSdk from "./modsdk/bcmodsdk";

const mod = bcModSdk.registerMod({
  name: "OKLCH Picker",
  fullName: "OKLCH Picker",
  version: "1.0.0",
  repository: "https://github.com/InkerBot/bc-oklch-picker",
});

let oklchPickerWindow: Window|null = null;
let ColorPickerButtonX= NaN;

function openOKLCHPicker() {
  if (oklchPickerWindow != null && !oklchPickerWindow.closed) {
    oklchPickerWindow.postMessage({
      oklch_picker: true,
      type: 'set_color',
      color: ColorPickerSourceElement == null ? '#ffffff' :ColorPickerSourceElement.value
    }, '*');
    oklchPickerWindow.focus()
    return;
  }

  oklchPickerWindow = window.open('https://inkerbot.github.io/oklch-picker/', '_blank','width=800,height=600')
  if (!oklchPickerWindow) {
    ToastManager.error("Failed to open OKLCH Picker");
    return
  }
  const checkLoad = setInterval(function() {
    if (oklchPickerWindow == null || oklchPickerWindow.closed) {
      clearInterval(checkLoad);
      return;
    }

    try {
      oklchPickerWindow.postMessage({
        oklch_picker: true,
        type: 'handshake'
      }, '*');

      clearInterval(checkLoad);
    } catch (e) {
      ToastManager.error("Failed to open OKLCH Picker: " + e);
    }
  }, 100);
}

window.addEventListener('message', function(event) {
  if (!event.data || !event.data.oklch_picker) {
    return
  }
  switch (event.data.type) {
    case 'handshake_response':
      break;
    case 'color_change':
      if (ColorPickerSourceElement != null) {
        ColorPickerSourceElement.value = event.data.color;
      }
      console.log('color_change:', event.data.color);
      break;
    default:
      console.log('未知消息类型:', event.data);
  }
});

window.addEventListener('beforeunload', function() {
  if (oklchPickerWindow != null && !oklchPickerWindow.closed) {
    oklchPickerWindow.close();
  }
});

mod.hookFunction("ColorPickerDraw", 0, (data, next) => {
  ColorPickerButtonX = ColorPickerLayout.SaveButtonX - (ColorPickerWidth / 6);
  DrawButton(
    ColorPickerButtonX,
    ColorPickerLayout.PaletteOffset + ((ColorPickerLayout.PaletteHeight - 90) / 2),
    90, 90,
    "", "White",
    "Icons/Color.png",
    "OKLCH"
  );

  return next(data);
});

mod.hookFunction("ColorPickerStartPick", 0, (data, next) => {
  const C = ColorPickerGetCoordinates(data[0]);
  const X = C.X;
  const Y = C.Y;

  if(Y > ColorPickerLayout.ButtonOffset && Y < ColorPickerLayout.ButtonOffset + 90) {
    if (X > ColorPickerButtonX && X < ColorPickerButtonX + 90){
      openOKLCHPicker()
    }
  }
  return next(data);
});

mod.hookFunction("ColorPickerNotify", 0, (data, next) => {
  const result = next(data);
  if (oklchPickerWindow != null && !oklchPickerWindow.closed) {
    oklchPickerWindow.postMessage({
      oklch_picker: true,
      type: 'set_color',
      color: ColorPickerSourceElement == null ? '#ffffff' :ColorPickerSourceElement.value
    }, '*');
  }
  return result;
})

mod.hookFunction("ItemColorOpenPicker", 0, (data, next) => {
  return next(data);
});

mod.hookFunction("ItemColorCloseColorPicker", 0, (data, next) => {
  if (oklchPickerWindow != null && !oklchPickerWindow.closed) {
    oklchPickerWindow.close();
  }
  return next(data);
});
