import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/memory_storage.dart';
import '../helpers/pump_app.dart';

void main() {
  testWidgets('an invalid number shows an error', (tester) async {
    await pumpApp(tester, MemoryTokenStorage());
    await advance(tester); // splash

    expect(find.text('Sign in'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '123');
    await tester.tap(find.text('Send code'));
    await tester.pump();

    expect(find.text('Enter a valid Ethiopian mobile number.'), findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('a number not linked to Fayda goes to the explanation screen',
      (tester) async {
    await pumpApp(tester, MemoryTokenStorage());
    await advance(tester);

    await tester.enterText(find.byType(TextField), '0911000202');
    await tester.tap(find.text('Send code'));
    await advance(tester);

    expect(find.text('This number is not linked to a Fayda ID'),
        findsOneWidget);

    await tester.tap(find.text('Try again'));
    await advance(tester);
    expect(find.text('Sign in'), findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('a rate-limited number shows the wait message', (tester) async {
    await pumpApp(tester, MemoryTokenStorage());
    await advance(tester);

    await tester.enterText(find.byType(TextField), '0911000203');
    await tester.tap(find.text('Send code'));
    await advance(tester);

    expect(find.textContaining('Too many tries'), findsOneWidget);
    await closeApp(tester);
  });

  testWidgets('wrong code is rejected, right code opens Home', (tester) async {
    await pumpApp(tester, MemoryTokenStorage());
    await advance(tester);

    await tester.enterText(find.byType(TextField), '0911000201');
    await tester.tap(find.text('Send code'));
    await advance(tester);
    expect(find.text('Enter the code'), findsOneWidget);

    // The code is checked as soon as the sixth digit is typed.
    await tester.enterText(find.byType(TextField), '000000');
    await advance(tester);
    expect(find.textContaining('not correct'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '123456');
    await advance(tester);
    expect(find.text('Flash flood warning: Bole'), findsOneWidget);
    await closeApp(tester);
  });
}