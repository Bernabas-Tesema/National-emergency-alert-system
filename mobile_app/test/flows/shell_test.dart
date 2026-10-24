import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/memory_storage.dart';
import '../helpers/pump_app.dart';

void main() {
  testWidgets('the bottom bar switches between the sections', (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
    await advance(tester);
    expect(find.text('Flash flood warning: Bole'), findsOneWidget);

    await tester.tap(find.text('Safety guide'));
    await advance(tester);
    expect(find.text('Floods and heavy rain'), findsOneWidget);
    await tester.tap(find.text('Floods and heavy rain'));
    await advance(tester);
    expect(find.text('Avoid walking or driving through floodwater.'),
        findsOneWidget);

    await tester.tap(find.text('My reports'));
    await advance(tester);
    expect(find.text('Reports you send will appear here.'), findsOneWidget);

    await tester.tap(find.text('Profile'));
    await advance(tester);
    expect(find.text('Profile & settings'), findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('profile rejects a wrong emergency contact and saves a right one',
      (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
    await advance(tester);
    await tester.tap(find.text('Profile'));
    await advance(tester);

    await tester.enterText(
        find.widgetWithText(TextField, 'Emergency contact'), '123');
    await tester.ensureVisible(find.text('Save profile'));
    await tester.tap(find.text('Save profile'));
    await tester.pump();
    expect(find.text('Enter a valid Ethiopian mobile number.'), findsOneWidget);

    await tester.enterText(
        find.widgetWithText(TextField, 'Emergency contact'), '0911000299');
    await tester.tap(find.text('Save profile'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Profile saved for this session.'), findsOneWidget);
    expect(find.text('+251911000299'), findsOneWidget); // shown in normal form
    await closeApp(tester);
  });
}