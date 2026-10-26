import Intents
import UIKit
import UserNotifications

/// T40: shows the bot that wrote as the push's sender, with its character. Anything unknown stays a plain push.
class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  /// agent slug in the push → portrait name in this extension's assets.
  static let portraits: [String: String] = [
    "lumi": "lumi", "finanzas": "finanzas", "playio": "playio", "gym": "gym",
    "compras": "compras", "trabajo": "trabajo", "viajes": "viajes", "abogado-ar": "abogado",
  ]

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    bestAttempt = content
    guard let data = Self.data(request.content.userInfo),
          let agent = data["agent"] as? String,
          let portrait = Self.portraits[agent],
          let png = UIImage(named: "char-\(portrait)")?.pngData() else {
      contentHandler(content)
      return
    }
    let image = INImage(imageData: png)
    let sender = INPerson(
      personHandle: INPersonHandle(value: agent, type: .unknown),
      nameComponents: nil,
      displayName: content.title,
      image: image,
      contactIdentifier: nil,
      customIdentifier: agent
    )
    let intent = INSendMessageIntent(
      recipients: nil,
      outgoingMessageType: .outgoingMessageText,
      content: content.body,
      speakableGroupName: nil,
      conversationIdentifier: data["topicId"] as? String ?? agent,
      serviceName: nil,
      sender: sender,
      attachments: nil
    )
    intent.setImage(image, forParameterNamed: \.sender)
    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate { [weak self] _ in
      // Without the communication entitlement updating fails: the plain push still goes out.
      let updated = (try? content.updating(from: intent)) ?? content
      self?.deliver(updated)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let bestAttempt { deliver(bestAttempt) }
  }

  /// The system takes one answer: whichever comes first (the donation or the time limit) wins.
  private func deliver(_ content: UNNotificationContent) {
    guard let handler = contentHandler else { return }
    contentHandler = nil
    handler(content)
  }

  /// Expo puts the push's data under "body" (a dictionary or a JSON string); older payloads have it at the top.
  static func data(_ info: [AnyHashable: Any]) -> [String: Any]? {
    if let body = info["body"] as? [String: Any] { return body }
    if let text = info["body"] as? String, let bytes = text.data(using: .utf8),
       let object = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any] { return object }
    return info as? [String: Any]
  }
}
