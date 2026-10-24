import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class LocationException implements Exception {
  const LocationException(this.message);
  final String message;
}

class LocationService {
  /// The phone's position, or a [LocationException] with a plain message.
  Future<LatLng> current() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationException(
          'Location is turned off. Turn it on in your phone settings.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const LocationException('Location permission was not given.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationException(
          'Location permission is blocked. Allow it in the app settings.');
    }
    final p = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
    return LatLng(p.latitude, p.longitude);
  }
}