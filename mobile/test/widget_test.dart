import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('EthioAlert boots to login', (tester) async {
    await tester.pumpWidget(const EthioAlertApp());
    await tester.pump();
    expect(find.textContaining('EthioAlert'), findsWidgets);
  });
}
