The tab bar holds the five Exe destinations and nothing else.

**Native counterpart.** SwiftUI `TabView` with `Tab("Focus", systemImage: "scope")`, `.tabBarMinimizeBehavior(.onScrollDown)`; symbols: `scope`, `tray`, `sparkles`, `point.3.connected.trianglepath.dotted`, `arrow.triangle.branch`.

**Rules.**
- Order: Focus, Inbox, AI Review, Map, Decisions. Never hide, disable or add tabs; five fits compact width without a More tab.
- Navigation only. Capture is an action: it lives in the capture bar and toolbar.
- Badge only for critical info: AI Review count in `ai`, never a count on Inbox.
- Selected = `tint` icon and label. Do not recolor unselected tabs.
- On iPad and Mac the same five become a sidebar.
