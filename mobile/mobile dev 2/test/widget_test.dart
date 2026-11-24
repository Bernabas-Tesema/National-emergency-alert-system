
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('NESS app launches successfully', (tester) async {
    await tester.pumpWidget(const NessApp());

    expect(find.text('NESS Citizen'), findsOneWidget);
    expect(find.text('REPORT SOS'), findsOneWidget);
    expect(find.text('My Reports'), findsOneWidget);
  });
}
