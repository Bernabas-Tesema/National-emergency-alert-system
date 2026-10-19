import 'dart:io';
import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';

import '../storage/token_storage.dart';

/// Gives this install a stable random ID and notices when the app's data
/// shows up on a different kind of device.
///
/// Limit: this catches storage restored onto another phone model. A SIM
/// change cannot be detected here and must be enforced by the backend.
class DeviceBinding {
  DeviceBinding(this._storage, {Future<String> Function()? readFingerprint})
      : _readFingerprint = readFingerprint ?? _defaultFingerprint;

  final TokenStorage _storage;
  final Future<String> Function() _readFingerprint;

  Future<String> deviceId() async {
    var id = await _storage.readDeviceId();
    if (id == null) {
      id = _randomId();
      await _storage.saveDeviceId(id);
    }
    return id;
  }

  /// True only if a fingerprint was saved earlier and it differs now.
  Future<bool> hasChanged() async {
    final current = await _readFingerprint();
    final saved = await _storage.readFingerprint();
    if (saved == null) {
      await _storage.saveFingerprint(current);
      return false;
    }
    return saved != current;
  }

  Future<void> rememberCurrent() async =>
      _storage.saveFingerprint(await _readFingerprint());

  static String _randomId() {
    final random = Random.secure();
    return List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'))
        .join();
  }

  static Future<String> _defaultFingerprint() async {
    final plugin = DeviceInfoPlugin();
    if (Platform.isAndroid) {
      final i = await plugin.androidInfo;
      return 'android|${i.brand}|${i.model}|${i.hardware}';
    }
    if (Platform.isIOS) {
      final i = await plugin.iosInfo;
      return 'ios|${i.identifierForVendor}|${i.model}';
    }
    return 'other';
  }
}