import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../../features/alerts/domain/push_payload.dart';
import 'local_notifier.dart';

/// Runs when a data-only message arrives while the app is not open.
/// It must be a top-level function.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  final payload = PushPayload.tryParse(
    message.data,
    fallbackId: message.messageId,
  );
  if (payload == null) return;
  await LocalNotifier.show(payload);
}