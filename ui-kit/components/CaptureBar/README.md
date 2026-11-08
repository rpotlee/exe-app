The capture bar is the app's primary action, shown as a bottom accessory above the tab bar.

**Native counterpart.** SwiftUI `.tabViewBottomAccessory { }`; Mac: toolbar button with ⌘K.

**Rules.**
- Tapping opens the Quick Capture sheet at the medium detent with the keyboard up.
- Glass, never tinted fill, except the single dictate/send circle in `tint-fill`.
- Hidden while the keyboard or a sheet is up; no second floating button.
