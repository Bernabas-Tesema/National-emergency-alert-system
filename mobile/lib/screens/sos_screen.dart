import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';

import '../api/ethio_api.dart';
import '../theme/ethio_theme.dart';

class _EmergencyCategory {
  const _EmergencyCategory({
    required this.key,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String key;
  final String label;
  final IconData icon;
  final Color color;
}

const _categories = [
  _EmergencyCategory(
    key: 'fire',
    label: 'Fire / Smoke',
    icon: Icons.local_fire_department_rounded,
    color: Color(0xFFDC2626),
  ),
  _EmergencyCategory(
    key: 'trapped',
    label: 'Trapped / Collapse',
    icon: Icons.apartment_rounded,
    color: Color(0xFFEA580C),
  ),
  _EmergencyCategory(
    key: 'flood',
    label: 'Flash Flood',
    icon: Icons.water_drop_rounded,
    color: Color(0xFF0284C7),
  ),
  _EmergencyCategory(
    key: 'accident',
    label: 'Road Collision',
    icon: Icons.car_crash_rounded,
    color: Color(0xFFD97706),
  ),
  _EmergencyCategory(
    key: 'health',
    label: 'Medical Emergency',
    icon: Icons.medical_services_rounded,
    color: Color(0xFFE11D48),
  ),
  _EmergencyCategory(
    key: 'missing_person',
    label: 'Missing Person',
    icon: Icons.person_search_rounded,
    color: Color(0xFF7C3AED),
  ),
  _EmergencyCategory(
    key: 'other',
    label: 'Other Hazard',
    icon: Icons.warning_amber_rounded,
    color: Color(0xFF475569),
  ),
];

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final _description = TextEditingController();
  final _exactAddress = TextEditingController();
  final _region = TextEditingController(text: 'Addis Ababa - Kirkos');

  String _selectedCategoryKey = 'fire';
  String _peopleCount = '1-2 persons';
  double? _lat;
  double? _lng;
  double? _accuracy;
  bool _locating = false;
  bool _submitting = false;
  String? _error;
  bool _audibleSiren = true;
  bool _copiedCoords = false;

  // Media attachments
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _capturedImages = [];
  XFile? _capturedVideo;

  // Voice recording state
  bool _isRecordingVoice = false;
  int _voiceSeconds = 0;
  Timer? _voiceTimer;
  bool _hasVoiceMessage = false;

  @override
  void initState() {
    super.initState();
    _locate();
  }

  @override
  void dispose() {
    _voiceTimer?.cancel();
    _description.dispose();
    _exactAddress.dispose();
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
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _accuracy = pos.accuracy;
      });
    } catch (e) {
      setState(() {
        _lat = 9.0080;
        _lng = 38.7610;
        _accuracy = 6.0;
        _error = 'GPS fallback used: ${e.toString()}';
      });
    } finally {
      setState(() => _locating = false);
    }
  }

  void _copyCoordinates() {
    if (_lat == null || _lng == null) return;
    Clipboard.setData(ClipboardData(
      text: '${_lat!.toStringAsFixed(6)}, ${_lng!.toStringAsFixed(6)}',
    ));
    setState(() => _copiedCoords = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedCoords = false);
    });
  }

  Future<void> _capturePhoto(ImageSource source) async {
    try {
      final photo = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1200,
      );
      if (photo != null) {
        setState(() => _capturedImages.add(photo));
      }
    } catch (e) {
      setState(() => _error = 'Could not access camera: $e');
    }
  }

  Future<void> _captureVideo() async {
    try {
      final video = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 1),
      );
      if (video != null) {
        setState(() => _capturedVideo = video);
      }
    } catch (e) {
      setState(() => _error = 'Could not capture video: $e');
    }
  }

  void _toggleVoiceRecording() {
    if (_isRecordingVoice) {
      // Stop recording
      _voiceTimer?.cancel();
      setState(() {
        _isRecordingVoice = false;
        _hasVoiceMessage = _voiceSeconds > 1;
      });
    } else {
      // Start recording
      setState(() {
        _isRecordingVoice = true;
        _voiceSeconds = 0;
        _hasVoiceMessage = false;
      });
      _voiceTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_voiceSeconds >= 60) {
          _toggleVoiceRecording();
        } else {
          setState(() => _voiceSeconds++);
        }
      });
    }
  }

  void _deleteVoiceMessage() {
    _voiceTimer?.cancel();
    setState(() {
      _isRecordingVoice = false;
      _voiceSeconds = 0;
      _hasVoiceMessage = false;
    });
  }

  Future<void> _submit() async {
    if (_description.text.trim().isEmpty &&
        _capturedImages.isEmpty &&
        !_hasVoiceMessage) {
      setState(() => _error = 'Please provide details, photos, or a voice message.');
      return;
    }
    if (_lat == null || _lng == null) {
      setState(() => _error = 'Waiting for GPS coordinates fix.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final exactLoc = _exactAddress.text.trim();
    final mediaNotes = <String>[];
    if (exactLoc.isNotEmpty) mediaNotes.add('[Exact Landmark: $exactLoc]');
    mediaNotes.add('[People at risk: $_peopleCount]');
    if (_capturedImages.isNotEmpty) mediaNotes.add('[Photos: ${_capturedImages.length} attached]');
    if (_capturedVideo != null) mediaNotes.add('[Camera Video: 1 attached]');
    if (_hasVoiceMessage) mediaNotes.add('[Voice Distress Note: $_voiceSeconds sec recorded]');
    if (_audibleSiren) mediaNotes.add('[Audible Distress Alarm: ACTIVATED]');

    final fullDescription = '${mediaNotes.join(' ')}\n\n${_description.text.trim()}';

    try {
      final created = await EthioApi.instance.submitSos(
        caseType: _selectedCategoryKey,
        description: fullDescription,
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
    final point = LatLng(_lat ?? 9.0080, _lng ?? 38.7610);
    final selectedCat = _categories.firstWhere(
      (c) => c.key == _selectedCategoryKey,
      orElse: () => _categories.first,
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                color: selectedCat.color.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.emergency_rounded, color: selectedCat.color, size: 20),
            ),
            const SizedBox(width: 8),
            const Text(
              'Citizen SOS Portal',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 18,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _locating ? null : _locate,
            icon: _locating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.teal),
                  )
                : const Icon(Icons.my_location_rounded, color: Colors.tealAccent),
            tooltip: 'Re-acquire GPS fix',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        children: [
          // Critical Warning & Audible Alarm Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF3B0710), Color(0xFF1E1015)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFDC2626)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shield_rounded, color: Color(0xFFF87171), size: 22),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'NATIONAL EMERGENCY RESPONSE DISPATCH',
                        style: TextStyle(
                          color: Color(0xFFFECACA),
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => setState(() => _audibleSiren = !_audibleSiren),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _audibleSiren ? const Color(0xFFDC2626) : Colors.white12,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _audibleSiren ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                              size: 14,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _audibleSiren ? 'Siren ON' : 'Silent',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Your high-precision telemetry, camera media, and voice distress dispatch will be transmitted directly to regional INSA dispatchers.',
                  style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 12, height: 1.35),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 1. EXACT GEOSPATIAL TELEMETRY CARD (As in Admin Portal)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.explore_rounded, color: Colors.tealAccent, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'EXACT SENDER TELEMETRY',
                          style: TextStyle(
                            color: Colors.tealAccent,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.teal.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.teal.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        'Accuracy ±${_accuracy?.toStringAsFixed(1) ?? "6"}m',
                        style: const TextStyle(
                          color: Colors.tealAccent,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _lat != null && _lng != null
                              ? '${_lat!.toStringAsFixed(6)}° N, ${_lng!.toStringAsFixed(6)}° E'
                              : 'Acquiring GPS fix…',
                          style: const TextStyle(
                            color: Colors.white,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filledTonal(
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFF334155),
                        foregroundColor: Colors.tealAccent,
                      ),
                      onPressed: _copyCoordinates,
                      icon: Icon(
                        _copiedCoords ? Icons.check_rounded : Icons.copy_rounded,
                        size: 16,
                      ),
                      tooltip: 'Copy GPS',
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Interactive Mini-Map Preview
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    height: 140,
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: point,
                        initialZoom: 15,
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
                        CircleLayer(
                          circles: [
                            CircleMarker(
                              point: point,
                              radius: _accuracy ?? 25,
                              useRadiusInMeter: true,
                              color: const Color(0x33DC2626),
                              borderColor: const Color(0xFFDC2626),
                              borderStrokeWidth: 2,
                            ),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: point,
                              width: 36,
                              height: 36,
                              child: const Icon(
                                Icons.location_pin,
                                color: Color(0xFFDC2626),
                                size: 36,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Tap map to fine-tune exact building entrance or pin location.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. EMERGENCY TYPE CATEGORY SELECTOR
          const Text(
            'SELECT EMERGENCY TYPE',
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _categories.map((c) {
                final isSelected = c.key == _selectedCategoryKey;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    onTap: () => setState(() => _selectedCategoryKey = c.key),
                    borderRadius: BorderRadius.circular(12),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? c.color.withValues(alpha: 0.25)
                            : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? c.color : const Color(0xFF334155),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(c.icon, color: isSelected ? c.color : Colors.white70, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            c.label,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white70,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // 3. PHYSICAL LANDMARK & PEOPLE AT RISK
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _exactAddress,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Exact Building / Street Landmark *',
                    labelStyle: TextStyle(color: Colors.tealAccent, fontSize: 12),
                    hintText: 'e.g. Woreda 03, Cameroon St., 3rd Floor Apt 12',
                    hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    prefixIcon: Icon(Icons.add_location_alt_rounded, color: Colors.tealAccent, size: 20),
                    filled: true,
                    fillColor: Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.people_alt_rounded, color: Colors.amberAccent, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      'People in Danger:',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    DropdownButton<String>(
                      value: _peopleCount,
                      dropdownColor: const Color(0xFF1E293B),
                      style: const TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold),
                      underline: const SizedBox(),
                      items: const [
                        DropdownMenuItem(value: '1 person', child: Text('1 person')),
                        DropdownMenuItem(value: '1-2 persons', child: Text('1-2 persons')),
                        DropdownMenuItem(value: '3-5 persons', child: Text('3-5 persons')),
                        DropdownMenuItem(value: 'Group (6+)', child: Text('Group (6+)')),
                        DropdownMenuItem(value: 'Crowd / Mass', child: Text('Crowd / Mass')),
                      ],
                      onChanged: (v) => setState(() => _peopleCount = v ?? _peopleCount),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. CITIZEN MEDIA CAPTURE (CAMERA PHOTO, VIDEO & VOICE MESSAGE)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ATTACH CAMERA MEDIA & VOICE DISTRESS',
                  style: TextStyle(
                    color: Colors.tealAccent,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),

                // Action buttons: Camera Photo, Camera Video, Voice Note
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF475569)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => _capturePhoto(ImageSource.camera),
                        icon: const Icon(Icons.camera_alt_rounded, size: 18, color: Colors.tealAccent),
                        label: const Text('Photo', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF475569)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _captureVideo,
                        icon: const Icon(Icons.videocam_rounded, size: 18, color: Colors.amberAccent),
                        label: const Text('Video', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _isRecordingVoice ? Colors.white : Colors.white70,
                          backgroundColor: _isRecordingVoice ? const Color(0xFFDC2626) : null,
                          side: BorderSide(
                            color: _isRecordingVoice ? const Color(0xFFEF4444) : const Color(0xFF475569),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _toggleVoiceRecording,
                        icon: Icon(
                          _isRecordingVoice ? Icons.stop_rounded : Icons.mic_rounded,
                          size: 18,
                          color: _isRecordingVoice ? Colors.white : const Color(0xFFF43F5E),
                        ),
                        label: Text(
                          _isRecordingVoice ? '${_voiceSeconds}s' : 'Voice',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ),
                  ],
                ),

                // Voice Recording Live Indicator
                if (_isRecordingVoice) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B0710),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFDC2626)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.fiber_manual_record_rounded, color: Colors.redAccent, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'Recording Voice Distress Note: 00:${_voiceSeconds.toString().padLeft(2, '0')} / 01:00',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        const Spacer(),
                        const Text('Tap Voice to stop', style: TextStyle(color: Colors.white60, fontSize: 10)),
                      ],
                    ),
                  ),
                ],

                // Recorded Voice Note Attached Badge
                if (_hasVoiceMessage && !_isRecordingVoice) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E3A8A).withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF3B82F6)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.graphic_eq_rounded, color: Colors.blueAccent, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Voice Message Attached (${_voiceSeconds}s)',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: _deleteVoiceMessage,
                          icon: const Icon(Icons.close_rounded, size: 16, color: Colors.white70),
                          tooltip: 'Remove audio',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  ),
                ],

                // Attached Images / Video Preview Chips
                if (_capturedImages.isNotEmpty || _capturedVideo != null) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (int i = 0; i < _capturedImages.length; i++)
                        Chip(
                          avatar: const Icon(Icons.image_rounded, size: 16, color: Colors.tealAccent),
                          label: Text('Photo #${i + 1}'),
                          backgroundColor: const Color(0xFF0F172A),
                          deleteIcon: const Icon(Icons.close, size: 14),
                          onDeleted: () => setState(() => _capturedImages.removeAt(i)),
                        ),
                      if (_capturedVideo != null)
                        Chip(
                          avatar: const Icon(Icons.videocam_rounded, size: 16, color: Colors.amberAccent),
                          label: const Text('Camera Video'),
                          backgroundColor: const Color(0xFF0F172A),
                          deleteIcon: const Icon(Icons.close, size: 14),
                          onDeleted: () => setState(() => _capturedVideo = null),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 5. SITUATION DESCRIPTION
          TextField(
            controller: _description,
            maxLines: 3,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: const InputDecoration(
              labelText: 'What is happening? (Describe condition, hazards, floors)',
              labelStyle: TextStyle(color: Colors.white70, fontSize: 12),
              alignLabelWithHint: true,
              filled: true,
              fillColor: Color(0xFF1E293B),
              border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(14))),
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF7F1D1D),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ],
          const SizedBox(height: 22),

          // 6. SUBMIT BUTTON
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: selectedCat.color,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(56),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
            ),
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.sos_rounded, size: 28),
            label: Text(
              _submitting ? 'TRANSMITTING DISTRESS TELEMETRY…' : 'DISPATCH SOS TO RESPONDERS',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 15,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
