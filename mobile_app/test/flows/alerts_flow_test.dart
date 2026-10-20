import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/storage/token_storage.dart';

import '../helpers/memory_storage.dart';
import '../helpers/pump_app.dart';

/// A citizen who is already signed in.
Future<MemoryTokenStorage> _signedIn() async {
  final storage = MemoryTokenStorage();
  await storage.save(const TokenPair('access', 'refresh'));
  await storage.saveProfile(jsonEncode({
    'id': 'cit_mock_001',
    'phone': '+251911000201',
    'registeredRegion': 'bole',
  }));
  return storage;
}

void main() {
  testWidgets('Home lists only the active alerts', (tester) async {
    await pumpApp(tester, await _signedIn());
    await advance(tester);

    expect(find.text('Flash flood warning: Bole'), findsOneWidget);
    expect(find.text('Road closure: Bole Road'), findsOneWidget);
    expect(find.text('Fire in Kality'), findsNothing);
    await closeApp(tester);
  });

  testWidgets('History shows the all-clear alert and its detail',
      (tester) async {
    await pumpApp(tester, await _signedIn());
    await advance(tester);

    await tester.tap(find.byIcon(Icons.history));
    await advance(tester);
    expect(find.text('Alert history'), findsOneWidget);
    expect(find.text('Fire in Kality'), findsOneWidget);

    await tester.tap(find.text('Fire in Kality'));
    await advance(tester);
    // This alert has no map, so the test needs no network.
    expect(find.text('ALL CLEAR'), findsOneWidget);
    expect(find.text('This alert has ended.'), findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('Sign out returns to the login screen', (tester) async {
    await pumpApp(tester, await _signedIn());
    await advance(tester);

    await tester.tap(find.text('Sign out'));
    await advance(tester);
    expect(find.text('Sign in'), findsOneWidget);
    await closeApp(tester);
  });
}