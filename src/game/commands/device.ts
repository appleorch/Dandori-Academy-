import { create } from 'zustand';

/** What the player last touched: the HUD and the controls list show prompts for it. */
export type InputDevice = 'keyboard' | 'pad' | 'touch';

interface DeviceStore {
  device: InputDevice;
  /** Whether a gamepad is plugged in at all. */
  padConnected: boolean;
  setDevice: (device: InputDevice) => void;
  setPadConnected: (connected: boolean) => void;
}

export const useInputDevice = create<DeviceStore>((set, get) => ({
  device: 'keyboard',
  padConnected: false,
  setDevice: (device) => {
    if (get().device !== device) set({ device });
  },
  setPadConnected: (padConnected) => {
    if (get().padConnected !== padConnected) set({ padConnected });
  },
}));

/** Notes the device without subscribing; cheap enough to call on every input event. */
export function noteDevice(device: InputDevice): void {
  useInputDevice.getState().setDevice(device);
}
