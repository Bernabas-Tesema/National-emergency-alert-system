import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Whether maps draw their tiles. Tests turn this off, so they need no network.
final mapTilesProvider = Provider<bool>((ref) => true);