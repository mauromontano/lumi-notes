// ios-assets/DictarNotaIntent.swift
import AppIntents
import UIKit

struct DictarNotaIntent: AppIntent {
  static var title: LocalizedStringResource = "Dictar nota"
  static var description = IntentDescription("Abre Lumi listo para dictar una nota por voz.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let url = URL(string: "luminotes://voice") {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

struct LumiShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: DictarNotaIntent(),
      phrases: [
        "Dictar nota en \(.applicationName)",
        "Nueva nota de voz en \(.applicationName)",
        "New voice note in \(.applicationName)",
      ],
      shortTitle: "Dictar nota",
      systemImageName: "mic.circle.fill"
    )
  }
}
