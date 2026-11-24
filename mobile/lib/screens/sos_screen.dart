import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../api/ethio_api.dart';
import '../theme/ethio_theme.dart';

const _categories = <String, String>{
  'Fire': 'fire',
  'Flood / weather': 'flood',
  'Accident': 'accident',
  'Health / disease': 'health',
  'Missing person': 'missing_person',
  'Other': 'other',
};

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final _description = TextEditingController();
  final _region = TextEditingController(text: 'Addis Ababa');
  String _category = 'Fire';
  double? _lat;
  double? _lng;
  bool _locating = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _locate();
  }

  @override
  void dispose() {
    _description.dispose();
    _region.dispose();
    super.dispose();
  }

  Future<void> _locate() async {
    setState(() => _locating = true);
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) throw Exception('Enable location services');
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission denied');
      }
      final pos = await Geolocator.getCurrentPosition();
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
      });
    } catch (e) {
      setState(() {
        _lat = 9.03;
        _lng = 38.74;
        _error = 'Using Addis fallback pin. ${e.toString()}';
      });
    } finally {
      setState(() => _locating = false);
    }
  }

  Future<void> _submit() async {
    if (_description.text.trim().length < 5) {
      setState(() => _error = 'Describe what is happening (at least a short sentence).');
      return;
    }
    if (_lat == null || _lng == null) {
      setState(() => _error = 'Wait for location, then send.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final created = await EthioApi.instance.submitSos(
        caseType: _categories[_category]!,
        description: _description.text.trim(),
        region: _region.text.trim().isEmpty ? 'Addis Ababa' : _region.text.trim(),
        latitude: _lat!,
        longitude: _lng!,
      );
      if (!mounted) return;
      Navigator.pop(context, created);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final point = LatLng(_lat ?? 9.03, _lng ?? 38.74);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Send SOS'),
        actions: [
          IconButton(
            onPressed: _locating ? null : _locate,
            icon: const Icon(Icons.my_location_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFEE2E2), Colors.white],
              ),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_rounded, color: Color(0xFF991B1B)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'SOS goes to partner responders, then can return to INSA. Only use for real emergencies.',
                    style: TextStyle(color: Color(0xFF991B1B), height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _category,
            items: _categories.keys
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _category = v ?? _category),
            decoration: const InputDecoration(
              labelText: 'Emergency type',
              prefixIcon: Icon(Icons.category_rounded),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _region,
            decoration: const InputDecoration(
              labelText: 'Region / area',
              prefixIcon: Icon(Icons.map_rounded),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'What is happening?',
              alignLabelWithHint: true,
              prefixIcon: Icon(Icons.edit_note_rounded),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 220,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: point,
                  initialZoom: 13,
                  onTap: (_, latLng) => setState(() {
                    _lat = latLng.latitude;
                    _lng = latLng.longitude;
                  }),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'et.ethioalert.citizen',
                  ),
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: point,
                        width: 40,
                        height: 40,
                        child: const Icon(Icons.location_on_rounded, color: ethioDanger, size: 36),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _locating
                ? 'Locating…'
                : 'Lat ${_lat?.toStringAsFixed(4)}, Lng ${_lng?.toStringAsFixed(4)} — tap map to adjust',
            style: const TextStyle(color: ethioMuted, fontSize: 12),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: ethioDanger, fontSize: 12)),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: ethioDanger),
            onPressed: _submitting ? null : _submit,
            icon: const Icon(Icons.sos_rounded),
            label: Text(_submitting ? 'Sending SOS…' : 'Send SOS to responders'),
          ),
        ],
      ),
    );
  }
}
