import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/severity.dart';
import '../../../shared/widgets/map_tiles.dart';
import '../../settings/application/settings_controller.dart';
import '../../shell/shell_index.dart';
import '../application/sos_providers.dart';
import '../data/location_service.dart';
import '../data/media_picker_service.dart';
import '../domain/sos_category.dart';

const _addisAbaba = LatLng(9.03, 38.74);

class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});

  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _map = MapController();

  SosCategory? _category;
  LatLng? _location;
  PickedMedia? _media;
  bool _confirmed = false;
  bool _locating = false;
  bool _sending = false;

  String? _categoryError;
  String? _locationError;
  String? _confirmError;
  String? _locationNote;
  String? _sendError;

  @override
  void initState() {
    super.initState();
    // Ask for the GPS position as soon as the form opens.
    WidgetsBinding.instance.addPostFrameCallback((_) => _useGps());
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _useGps() async {
    setState(() {
      _locating = true;
      _locationNote = null;
    });
    try {
      final point = await ref.read(locationServiceProvider).current();
      if (!mounted) return;
      setState(() {
        _location = point;
        _locationError = null;
      });
      try {
        _map.move(point, 15);
      } catch (_) {
        // The map is not on screen yet. The marker still shows.
      }
    } on LocationException catch (e) {
      if (mounted) setState(() => _locationNote = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _locationNote =
            'Could not get your location. Tap the map to choose it.');
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _setPoint(LatLng point) => setState(() {
        _location = point;
        _locationError = null;
      });

  void _snack(String text) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(text)));

  Future<void> _pickMedia() async {
    final choice = await showModalBottomSheet<MediaChoice>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, MediaChoice.takePhoto),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose a photo'),
              onTap: () => Navigator.pop(context, MediaChoice.choosePhoto),
            ),
            ListTile(
              leading: const Icon(Icons.videocam_outlined),
              title: const Text('Record a short video'),
              onTap: () => Navigator.pop(context, MediaChoice.recordVideo),
            ),
            ListTile(
              leading: const Icon(Icons.video_library_outlined),
              title: const Text('Choose a video'),
              onTap: () => Navigator.pop(context, MediaChoice.chooseVideo),
            ),
          ],
        ),
      ),
    );
    if (choice == null || !mounted) return;
    try {
      final lowBandwidth = ref.read(settingsProvider).lowBandwidth;
      final media = await ref
          .read(mediaPickerProvider)
          .pick(choice, lowBandwidth: lowBandwidth);
      if (media != null && mounted) setState(() => _media = media);
    } on MediaException catch (e) {
      if (mounted) _snack(e.message);
    } catch (_) {
      if (mounted) _snack('Could not add the file.');
    }
  }

  Future<void> _send() async {
    final valid = _formKey.currentState!.validate();
    setState(() {
      _categoryError = _category == null ? 'Choose what is happening.' : null;
      _locationError = _location == null
          ? 'Choose the location on the map or use your GPS.'
          : null;
      _confirmError =
          _confirmed ? null : 'Please confirm that the details are accurate.';
      _sendError = null;
    });
    final category = _category;
    final location = _location;
    if (!valid || category == null || location == null || !_confirmed) return;

    setState(() => _sending = true);
    final repo = ref.read(sosRepositoryProvider);
    try {
      String? mediaUrl;
      final media = _media;
      if (media != null) {
        mediaUrl =
            await repo.uploadMedia(path: media.path, filename: media.name);
      }
      final report = await repo.submit(
        category: category,
        description: _description.text.trim(),
        location: location,
        mediaUrl: mediaUrl,
      );
      if (!mounted) return;
      ref.invalidate(sosReportsProvider);
      ref.read(shellIndexProvider.notifier).select(1); // open My reports
      final messenger = ScaffoldMessenger.of(context);
      context.pop();
      messenger.showSnackBar(
        SnackBar(content: Text('SOS report sent. Reference ${report.id}.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _sendError = e.code == 'NETWORK'
            ? 'You are offline, so the report was not sent. '
                'Check your connection and try again.'
            : e.message;
      });
    }
  }

  Widget _heading(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Semantics(
          header: true,
          child: Text(text,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        ),
      );

  Widget _error(String text) => Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(text,
            style: const TextStyle(color: AppColors.error, fontSize: 12)),
      );

  @override
  Widget build(BuildContext context) {
    final showTiles = ref.watch(mapTilesProvider);
    final location = _location;
    final media = _media;

    return Scaffold(
      appBar: AppBar(title: const Text('SOS report')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Tell responders what is happening and where.',
              style: TextStyle(color: AppColors.textMuted, height: 1.5),
            ),
            const SizedBox(height: 16),
            _heading('What is happening?'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in SosCategory.values)
                  ChoiceChip(
                    avatar: Icon(c.icon, size: 18),
                    label: Text(c.label),
                    selected: _category == c,
                    onSelected: _sending
                        ? null
                        : (_) => setState(() {
                              _category = c;
                              _categoryError = null;
                            }),
                  ),
              ],
            ),
            if (_categoryError != null) _error(_categoryError!),
            const SizedBox(height: 16),
            TextFormField(
              key: const ValueKey('description'),
              controller: _description,
              enabled: !_sending,
              maxLines: 4,
              maxLength: 1000,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'What happened? Is anyone injured?',
                alignLabelWithHint: true,
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().length < 10) {
                  return 'Describe the incident in at least 10 characters.';
                }
                return null;
              },
            ),
            const SizedBox(height: 8),
            _heading('Location'),
            Text(location == null
                ? 'No location selected yet.'
                : 'Selected location: '
                    '${location.latitude.toStringAsFixed(5)}, '
                    '${location.longitude.toStringAsFixed(5)}'),
            if (_locationNote != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(_locationNote!,
                    style: const TextStyle(color: AppColors.warning)),
              ),
            if (_locationError != null) _error(_locationError!),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: (_locating || _sending) ? null : _useGps,
              icon: _locating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location),
              label: Text(
                  _locating ? 'Getting location...' : 'Use my current location'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              key: const ValueKey('map'),
              height: 260,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: FlutterMap(
                  mapController: _map,
                  options: MapOptions(
                    initialCenter: location ?? _addisAbaba,
                    initialZoom: location == null ? 12 : 15,
                    onTap: (_, point) => _setPoint(point),
                    interactionOptions: InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                  ),
                  children: [
                    if (showTiles)
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'et.gov.nea.nea_citizen',
                      ),
                    if (location != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: location,
                            width: 48,
                            height: 48,
                            child: Icon(Icons.location_pin,
                                color: Severity.critical.color, size: 44),
                          ),
                        ],
                      ),
                    if (showTiles)
                      const RichAttributionWidget(
                        attributions: [
                          TextSourceAttribution('© OpenStreetMap contributors'),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 6),
            const Text('Tap the map to choose a different spot.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: Icon(media == null
                    ? Icons.attach_file
                    : (media.isVideo
                        ? Icons.videocam_outlined
                        : Icons.photo_outlined)),
                title: Text(media?.name ?? 'Add a photo or video'),
                subtitle: const Text('One photo or a short video (up to 30 seconds)'),
                trailing: media == null
                    ? null
                    : IconButton(
                        tooltip: 'Remove the file',
                        icon: const Icon(Icons.close),
                        onPressed:
                            _sending ? null : () => setState(() => _media = null),
                      ),
                onTap: _sending ? null : _pickMedia,
              ),
            ),
            const SizedBox(height: 8),
            CheckboxListTile(
              value: _confirmed,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('I confirm these details are accurate.'),
              onChanged: _sending
                  ? null
                  : (v) => setState(() {
                        _confirmed = v ?? false;
                        if (_confirmed) _confirmError = null;
                      }),
            ),
            if (_confirmError != null) _error(_confirmError!),
            if (_sendError != null) ...[
              const SizedBox(height: 8),
              Text(_sendError!,
                  style: const TextStyle(color: AppColors.error)),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _sending ? null : _send,
              style: FilledButton.styleFrom(
                backgroundColor: Severity.critical.color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.sos),
              label: Text(_sending ? 'Sending...' : 'Send SOS report'),
            ),
            const SizedBox(height: 12),
            const Text(
              'For a real emergency, also contact your local emergency '
              'services. This system is still being tested.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}