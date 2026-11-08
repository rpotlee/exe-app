Fields use `fill-secondary` wells, 44pt height, placeholder in `placeholder`, errors beside the field.

**Native counterpart.** SwiftUI `TextField`, `.searchable`; keyboard types matched to content.

**Rules.**
- Label must remain visible after typing (placeholder is not a label).
- Error: 2px `critical-text` ring + glyph + plain-language message. Never color alone.
- Search sits at the top (`searchable`) and is dismissible.
