Alerts interrupt only for consequence: merging, deleting, discarding.

**Native counterpart.** SwiftUI `.alert` / `.confirmationDialog`.

**Rules.**
- Title is a question or statement; a message explains the consequence; buttons are verbs.
- The safe default is the bold right button; destructive buttons use `critical-text`, never the bold default.
