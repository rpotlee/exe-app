Use a prominent button for the one most likely action in a view; style, never size, signals the preferred choice.

**Native counterpart.** SwiftUI `.buttonStyle(.borderedProminent)`, `.bordered`, `.glass`; UIKit `UIButton.Configuration.prominentGlass()`.

**Rules.**
- One prominent button per view. Never make a destructive action prominent, even when likely.
- Min 44pt hit area (`hit`); small variant only inside dense Mac layouts.
- Label says the verb: Approve, Dismiss, Start focus. Glass buttons are for the controls layer only (toolbar, floating).
- Provide press (`press`) and disabled (`disabled`) states and say why something is disabled in nearby text.
