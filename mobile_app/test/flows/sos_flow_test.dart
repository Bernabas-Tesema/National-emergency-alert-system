import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/network/mock_sos.dart';

import '../helpers/memory_storage.dart';
import '../helpers/pump_app.dart';

void main() {
  setUp(mockSosReset);

  testWidgets('a report is sent and appears in My reports', (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
    await advance(tester);

    await tester.tap(find.text('SOS'));
    await advance(tester);
    expect(find.text('SOS report'), findsOneWidget);
    expect(find.textContaining('9.0108'), findsOneWidget); // GPS was captured

    await tester.tap(find.text('Fire'));
    await tester.enterText(
        find.byType(TextFormField), 'Warehouse fire near the main road');
    await tester.ensureVisible(find.byType(CheckboxListTile));
    await tester.tap(find.byType(CheckboxListTile));
    await tester.ensureVisible(find.text('Send SOS report'));
    await tester.tap(find.text('Send SOS report'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.textContaining('SOS report sent'), findsOneWidget);

    await advance(tester);
    expect(find.text('Fire'), findsOneWidget); // the card in My reports
    expect(find.text('Received'), findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('the form asks for what is missing', (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage());
    await advance(tester);
    await tester.tap(find.text('SOS'));
    await advance(tester);

    await tester.enterText(find.byType(TextFormField), 'Fire');
    await tester.ensureVisible(find.text('Send SOS report'));
    await tester.tap(find.text('Send SOS report'));
    await tester.pump();

    expect(find.text('Choose what is happening.'), findsOneWidget);
    expect(find.text('Describe the incident in at least 10 characters.'),
        findsOneWidget);
    expect(find.text('Please confirm that the details are accurate.'),
        findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('without GPS the citizen is told to choose on the map',
      (tester) async {
    useTallScreen(tester);
    await pumpApp(tester, await signedInStorage(),
        location: FakeLocation(fail: true));
    await advance(tester);
    await tester.tap(find.text('SOS'));
    await advance(tester);

    expect(find.textContaining('Location is turned off'), findsOneWidget);

    await tester.enterText(
        find.byType(TextFormField), 'Warehouse fire near the main road');
    await tester.ensureVisible(find.text('Send SOS report'));
    await tester.tap(find.text('Send SOS report'));
    await tester.pump();
    expect(find.text('Choose the location on the map or use your GPS.'),
        findsOneWidget);
    await closeApp(tester);
  });
}
