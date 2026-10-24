import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Which section of the bottom bar is open (0 alerts, 1 reports, 2 guide, 3 profile).
class ShellIndex extends Notifier<int> {
  @override
  int build() => 0;

  void select(int index) => state = index;
}

final shellIndexProvider =
    NotifierProvider<ShellIndex, int>(ShellIndex.new);