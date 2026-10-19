import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/push/local_notifier.dart';
import 'core/push/push_background.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    // The app still works without push (for example, no google-services.json).
    debugPrint('Firebase not ready: $e');
  }
  await LocalNotifier.ensureInitialized();
  runApp(const ProviderScope(child: NeaApp()));
}