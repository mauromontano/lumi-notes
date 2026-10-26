import SwiftUI
import WidgetKit

/// What the app last wrote to the App Group (src/widget/sync.ts), already as the lines to show.
struct Today: Codable {
  var pending: Int
  var pendingLine: String
  var eventLine: String?
  var reminderLine: String?
  var updatedAt: String
}

struct TodayEntry: TimelineEntry {
  let date: Date
  let today: Today?
}

struct TodayProvider: TimelineProvider {
  static let group = "group.com.mauro.luminotes"
  /// Older than a day it says nothing rather than show yesterday's agenda.
  static func read(now: Date = Date()) -> Today? {
    guard let text = UserDefaults(suiteName: group)?.string(forKey: "widget"), let data = text.data(using: .utf8),
          let today = try? JSONDecoder().decode(Today.self, from: data) else { return nil }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let updated = formatter.date(from: today.updatedAt), now.timeIntervalSince(updated) < 24 * 3600 else { return nil }
    return today
  }
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: Date(), today: Today(pending: 1, pendingLine: "1 cosa espera tu OK", eventLine: "19:00 · Pádel", reminderLine: "18:00 · Pagar la luz", updatedAt: ""))
  }
  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayEntry(date: Date(), today: Self.read() ?? placeholder(in: context).today))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    // The app reloads the widget whenever it writes; this only keeps it from looking frozen overnight.
    completion(Timeline(entries: [TodayEntry(date: Date(), today: Self.read())], policy: .after(Date().addingTimeInterval(3600))))
  }
}

struct TodayView: View {
  @Environment(\.widgetFamily) var family
  let entry: TodayEntry
  var body: some View {
    if let today = entry.today {
      VStack(alignment: .leading, spacing: 6) {
        if family != .accessoryRectangular {
          Text("Lumi").font(.caption).fontWeight(.semibold).foregroundStyle(Color("$accent"))
        }
        Text(today.pendingLine).font(family == .accessoryRectangular ? .headline : .subheadline).fontWeight(.semibold).lineLimit(2)
        // Event titles hide on the lock screen while the iPhone is locked.
        if let event = today.eventLine { Label(event, systemImage: "calendar").font(.caption).lineLimit(1).privacySensitive() }
        if let reminder = today.reminderLine, family != .systemSmall || today.eventLine == nil {
          Label(reminder, systemImage: "bell").font(.caption).lineLimit(1)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    } else {
      Text("Abrí Lumi para ver lo de hoy").font(.caption).foregroundStyle(.secondary)
    }
  }
}

struct TodayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "LumiToday", provider: TodayProvider()) { entry in
      if #available(iOS 17.0, *) {
        TodayView(entry: entry).containerBackground(Color("$widgetBackground"), for: .widget)
      } else {
        TodayView(entry: entry).padding().background(Color("$widgetBackground"))
      }
    }
    .configurationDisplayName("Lumi hoy")
    .description("Lo que espera tu OK, lo próximo de la agenda y el próximo recordatorio.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}
