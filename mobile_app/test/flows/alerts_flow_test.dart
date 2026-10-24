import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/memory_storage.dart';
import '../helpers/pump_app.dart';

void main() {
  testWidgets('Home lists only the active alerts', (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
    await advance(tester);

    expect(find.text('Flash flood warning: Bole'), findsOneWidget);
    expect(find.text('Road closure: Bole Road'), findsOneWidget);
    expect(find.text('Fire in Kality'), findsNothing);
    await closeApp(tester);
  });

  testWidgets('History shows the all-clear alert and its detail',
      (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
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

  testWidgets('Sign out (now in Profile) returns to the login screen',
      (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
    await advance(tester);

    await tester.tap(find.text('Profile'));
    await advance(tester);
    await tester.ensureVisible(find.text('Sign out'));
    await tester.tap(find.text('Sign out'));
    await advance(tester);
    expect(find.text('Sign in'), findsOneWidget);
    await closeApp(tester);
  });
}