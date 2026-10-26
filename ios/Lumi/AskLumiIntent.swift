import AppIntents
import Foundation

/// T40: «Oye Siri, preguntale a Lumi». Siri asks what to say, the app opens and sends it to Lumi's chat
/// (src/siri/pendingAsk.ts reads it from the App Group). It lives in the app target so Siri picks up the phrases.
@available(iOS 16.0, *)
struct AskLumiIntent: AppIntent {
  static var title: LocalizedStringResource = "Preguntarle a Lumi"
  static var description = IntentDescription("Le manda a Lumi lo que le dictás.")
  static var openAppWhenRun: Bool = true

  @Parameter(title: "Pedido", requestValueDialog: IntentDialog("¿Qué le digo a Lumi?"))
  var text: String

  @MainActor
  func perform() async throws -> some IntentResult {
    let ask: [String: String] = ["text": String(text.prefix(4000)), "at": ISO8601DateFormatter().string(from: Date())]
    if let data = try? JSONSerialization.data(withJSONObject: ask), let json = String(data: data, encoding: .utf8) {
      UserDefaults(suiteName: "group.com.mauro.luminotes")?.set(json, forKey: "ask")
    }
    return .result()
  }
}

@available(iOS 16.0, *)
struct LumiShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AskLumiIntent(),
      phrases: ["Preguntale a \(.applicationName)", "Decile a \(.applicationName)", "Pedile a \(.applicationName)"],
      shortTitle: "Preguntarle a Lumi",
      systemImageName: "bubble.left.and.text.bubble.right"
    )
  }
}
