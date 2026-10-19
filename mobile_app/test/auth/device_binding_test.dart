import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/device/device_binding.dart';
import 'package:nea_citizen/core/storage/token_storage.dart';

/// Keeps values in memory so the test needs no phone.
class _FakeStorage extends TokenStorage {
  String? _id;
  String? _fingerprint;

  @override
  Future<String?> readDeviceId() async => _id;
  @override
  Future<void> saveDeviceId(String id) async => _id = id;
  @override
  Future<String?> readFingerprint() async => _fingerprint;
  @override
  Future<void> saveFingerprint(String value) async => _fingerprint = value;
}

void main() {
  test('device id is created once and stays the same', () async {
    final binding = DeviceBinding(_FakeStorage(), readFingerprint: () async => 'a');
    final first = await binding.deviceId();
    expect(first.length, 32);
    expect(await binding.deviceId(), first);
  });

  test('first run and same device: not changed', () async {
    final storage = _FakeStorage();
    final binding = DeviceBinding(storage, readFingerprint: () async => 'phone-A');
    expect(await binding.hasChanged(), isFalse); // saves the fingerprint
    expect(await binding.hasChanged(), isFalse);
  });

  test('different device: changed, until the new one is remembered', () async {
    final storage = _FakeStorage();
    await DeviceBinding(storage, readFingerprint: () async => 'phone-A')
        .hasChanged();

    final onOther =
        DeviceBinding(storage, readFingerprint: () async => 'phone-B');
    expect(await onOther.hasChanged(), isTrue);
    await onOther.rememberCurrent();
    expect(await onOther.hasChanged(), isFalse);
  });
}