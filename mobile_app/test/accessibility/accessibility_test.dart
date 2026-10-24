import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/network/mock_alerts.dart';
import 'package:nea_citizen/features/alerts/domain/alert.dart';
import 'package:nea_citizen/shared/widgets/alert_card.dart';

import '../helpers/memory_storage.dart';
import '../helpers/pump_app.dart';

void main() {
  testWidgets('an alert card is read as one button with the key facts',
      (tester) async {
    final handle = tester.ensureSemantics();
    final alert = Alert.fromJson(mockAlertsJson().first);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: AlertCard(alert: alert, onTap: () {})),
    ));

    final node = tester.getSemantics(find.byType(AlertCard));
    expect(node.label, contains('Critical alert'));
    expect(node.label, contains('Flash flood warning: Bole'));
    expect(node.label, contains('Bole'));
    handle.dispose();
  });

  testWidgets('main screens do not overflow at 200% text on a small phone',
      (tester) async {
    // Narrow like a small phone (360 wide), but tall so every item is built.
    useTallScreen(tester, width: 360, height: 3000, pixelRatio: 2.0);
    tester.platformDispatcher.textScaleFactorTestValue = 2.0;
    addTearDown(tester.platformDispatcher.clearAllTestValues);

    await pumpApp(tester, MemoryTokenStorage());
    await advance(tester);
    expect(find.text('Sign in'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.enterText(find.byType(TextField), '0911000201');
    await tester.ensureVisible(find.text('Send code'));
    await tester.tap(find.text('Send code'));
    await advance(tester);
    expect(find.text('Enter the code'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.enterText(find.byType(TextField), '123456');
    await advance(tester);
    expect(find.text('Flash flood warning: Bole'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byIcon(Icons.history));
    await advance(tester);
    expect(tester.takeException(), isNull);

    await tester.ensureVisible(find.text('Fire in Kality'));
    await tester.pump();
    await tester.tap(find.text('Fire in Kality'));
    await advance(tester);
    expect(find.text('ALL CLEAR'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await closeApp(tester);
  });
}