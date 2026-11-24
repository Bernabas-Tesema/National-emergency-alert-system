import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

void main() {
  runApp(const NessApp());
}

// ============================================================
// NESS DESIGN SYSTEM
// ============================================================

const Color primaryColor = Color(0xFF0F172A);
const Color pageBackground = Color(0xFFF1F5F9);
const Color surfaceColor = Color(0xFFFFFFFF);
const Color mutedText = Color(0xFF64748B);
const Color borderColor = Color(0xFFCBD5E1);
const Color successColor = Color(0xFF16A34A);
const Color errorColor = Color(0xFFDC2626);
const Color warningColor = Color(0xFF92400E);

const Map<String, Color> severityColors = {
  'Low': Color(0xFF0284C7),
  'Medium': Color(0xFFFACC15),
  'High': Color(0xFFEA580C),
  'Critical': Color(0xFFB91C1C),
};

const List<String> emergencyCategories = [
  'Accident',
  'Fire',
  'Missing person',
  'Health / disease',
  'Flood / weather',
  'Other',
];

const List<String> severityLevels = ['Low', 'Medium', 'High', 'Critical'];

const List<String> supportedLanguages = [
  'English',
  'Amharic',
  'Afan Oromo',
  'Tigrinya',
  'Somali',
];

// ============================================================
// APPLICATION
// ============================================================

class NessApp extends StatelessWidget {
  const NessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NESS Citizen App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: pageBackground,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryColor,
          primary: primaryColor,
          surface: surfaceColor,
          error: errorColor,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: surfaceColor,
          foregroundColor: primaryColor,
          elevation: 0,
          titleTextStyle: TextStyle(
            color: primaryColor,
            fontSize: 21,
            fontWeight: FontWeight.bold,
          ),
        ),
        cardTheme: CardThemeData(
          color: surfaceColor,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: borderColor),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surfaceColor,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: borderColor),
          ),
        ),
      ),
      home: const CitizenHome(),
    );
  }
}

// ============================================================
// EMERGENCY REPORT MODEL
// ============================================================

class EmergencyReport {
  EmergencyReport({
    required this.id,
    required this.category,
    required this.severity,
    required this.description,
    required this.createdAt,
    required this.latitude,
    required this.longitude,
    this.status = 'Saved locally (demo)',
    this.dispatcherMessage = '',
  });

  final String id;
  final String category;
  final String severity;
  final String description;
  final DateTime createdAt;
  final double? latitude;
  final double? longitude;

  String status;
  String dispatcherMessage;
}

// ============================================================
// MAIN NAVIGATION
// ============================================================

class CitizenHome extends StatefulWidget {
  const CitizenHome({super.key});

  @override
  State<CitizenHome> createState() => _CitizenHomeState();
}

class _CitizenHomeState extends State<CitizenHome> {
  int selectedIndex = 0;

  // Demo state only. Reports are not persisted after app restart.
  final List<EmergencyReport> reports = [];

  String displayName = '';
  String phoneNumber = '';
  String emergencyContact = '';
  String language = 'English';

  bool notificationsEnabled = true;
  bool lowBandwidthMode = false;
  bool demoOfflineMode = false;

 void addReport(EmergencyReport report) {
  setState(() {
    reports.insert(0, report);
    selectedIndex = 1;
  });
}

  void saveProfile({
    required String name,
    required String phone,
    required String contact,
  }) {
    setState(() {
      displayName = name;
      phoneNumber = phone;
      emergencyContact = contact;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardTab(
        name: displayName,
        reportCount: reports.length,
        onCreateReport: () => openSosForm(context),
        onViewReports: () => changeTab(1),
        onViewGuide: () => changeTab(2),
      ),
      ReportsTab(reports: reports),
      const SafetyGuideTab(),
      ProfileTab(
        name: displayName,
        phone: phoneNumber,
        emergencyContact: emergencyContact,
        language: language,
        notificationsEnabled: notificationsEnabled,
        lowBandwidthMode: lowBandwidthMode,
        onSaveProfile: saveProfile,
        onLanguageChanged: (value) {
          setState(() => language = value);
        },
        onNotificationsChanged: (value) {
          setState(() => notificationsEnabled = value);
        },
        onLowBandwidthChanged: (value) {
          setState(() => lowBandwidthMode = value);
        },
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, size: 27),
            SizedBox(width: 10),
            Text('NESS Citizen'),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: warningColor.withValues(alpha: 0.09),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'PROTOTYPE',
                  style: TextStyle(
                    color: warningColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: changeTab,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined),
            selectedIcon: Icon(Icons.confirmation_number),
            label: 'My Reports',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Safety Guide',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  void changeTab(int index) {
    setState(() => selectedIndex = index);
  }

  // FIXED: check State.mounted after the async navigation gap.
  Future<void> openSosForm(BuildContext context) async {
    final report = await Navigator.push<EmergencyReport>(
      context,
      MaterialPageRoute(
        builder: (_) => SosFormScreen(offlineMode: demoOfflineMode),
      ),
    );

    if (!mounted || report == null) return;

    addReport(report);
debugPrint('REPORT RECEIVED: ${report.id} - ${report.category}');
debugPrint('TOTAL REPORTS: ${reports.length}');
    ScaffoldMessenger.of(this.context).showSnackBar(
      const SnackBar(
        content: Text(
          'Demo report saved in this app session. '
          'It has not been sent to responders.',
        ),
      ),
    );
  }
}

// ============================================================
// REUSABLE SECTION HEADING
// ============================================================

class SectionHeading extends StatelessWidget {
  const SectionHeading({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: primaryColor,
            fontSize: 25,
            fontWeight: FontWeight.w800,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 7),
          Text(
            subtitle!,
            style: const TextStyle(color: mutedText, height: 1.5),
          ),
        ],
      ],
    );
  }
}

// ============================================================
// HOME DASHBOARD
// ============================================================

class DashboardTab extends StatelessWidget {
  const DashboardTab({
    super.key,
    required this.name,
    required this.reportCount,
    required this.onCreateReport,
    required this.onViewReports,
    required this.onViewGuide,
  });

  final String name;
  final int reportCount;
  final VoidCallback onCreateReport;
  final VoidCallback onViewReports;
  final VoidCallback onViewGuide;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        SectionHeading(
          title: name.isEmpty ? 'Citizen safety' : 'Hello, $name',
          subtitle: 'Emergency information and safety resources in one place.',
        ),
        const SizedBox(height: 22),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: errorColor.withValues(alpha: 0.09),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.sos,
                    size: 66,
                    color: severityColors['Critical'],
                  ),
                ),
                const SizedBox(height: 15),
                const Text(
                  'Need emergency assistance?',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Prepare a report with the incident details.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: mutedText, height: 1.5),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onCreateReport,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFB91C1C),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 17),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.warning_amber_rounded),
                    label: const Text(
                      'REPORT SOS',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        const Text(
          'Quick access',
          style: TextStyle(
            fontSize: 19,
            fontWeight: FontWeight.bold,
            color: primaryColor,
          ),
        ),
        const SizedBox(height: 12),
        QuickLink(
          icon: Icons.confirmation_number_outlined,
          title: 'My Reports',
          subtitle: '$reportCount reports in this session',
          onTap: onViewReports,
        ),
        const SizedBox(height: 12),
        QuickLink(
          icon: Icons.menu_book_outlined,
          title: 'Safety Guide',
          subtitle: 'Learn how to prepare for emergencies',
          onTap: onViewGuide,
        ),
        const SizedBox(height: 20),
        const PrototypeNotice(),
      ],
    );
  }
}

class QuickLink extends StatelessWidget {
  const QuickLink({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: primaryColor.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: primaryColor),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(subtitle, style: const TextStyle(color: mutedText)),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class PrototypeNotice extends StatelessWidget {
  const PrototypeNotice({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: warningColor),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Prototype: SOS reports are not sent to emergency services. '
              'For a real emergency, contact local emergency services.',
              style: TextStyle(color: warningColor, height: 1.5, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// SOS REPORT FORM
// ============================================================

class SosFormScreen extends StatefulWidget {
  const SosFormScreen({super.key, required this.offlineMode});

  final bool offlineMode;

  @override
  State<SosFormScreen> createState() => _SosFormScreenState();
}

class _SosFormScreenState extends State<SosFormScreen> {
  final formKey = GlobalKey<FormState>();
  final descriptionController = TextEditingController();
  final latitudeController = TextEditingController();
  final longitudeController = TextEditingController();

  String category = emergencyCategories.first;
  String severity = 'High';
  bool confirmed = false;
  final ImagePicker imagePicker = ImagePicker();
  XFile? selectedPhoto;
  XFile? selectedVideo;
  bool gettingLocation = false;

final MapController mapController = MapController();
LatLng? selectedLocation;
final LatLng defaultMapCenter = LatLng(9.03, 38.74);

  @override
  void dispose() {
    descriptionController.dispose();
    latitudeController.dispose();
    longitudeController.dispose();
    super.dispose();
  }

  Future<void> getCurrentLocation() async {
    setState(() => gettingLocation = true);
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        throw Exception("Location services are disabled.");
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception("Location permission was denied.");
      }

      final position = await Geolocator.getCurrentPosition();
      if (!mounted) return;

      final location = LatLng(position.latitude, position.longitude);
      setState(() {
        latitudeController.text = position.latitude.toString();
        longitudeController.text = position.longitude.toString();
        selectedLocation = location;
      });
      mapController.move(location, 15);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("GPS location captured.")),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Could not get location: $e")),
      );
    } finally {
      if (mounted) setState(() => gettingLocation = false);
    }
  }

  Future<void> pickPhoto() async {
    try {
      final file = await imagePicker.pickImage(source: ImageSource.gallery);
      if (!mounted || file == null) return;
      setState(() => selectedPhoto = file);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Could not select photo: $e")),
      );
    }
  }

  Future<void> pickVideo() async {
    try {
      final file = await imagePicker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(seconds: 30),
      );
      if (!mounted || file == null) return;
      setState(() => selectedVideo = file);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Could not select video: $e")),
      );
    }
  }
  void prepareReport() {
    if (!formKey.currentState!.validate()) return;

    if (!confirmed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please confirm the incident details.')),
      );
      return;
    }

    final latitude = double.tryParse(latitudeController.text.trim());
    final longitude = double.tryParse(longitudeController.text.trim());

    if (latitudeController.text.trim().isNotEmpty &&
        (latitude == null || latitude < -90 || latitude > 90)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enter a valid latitude.')));
      return;
    }

    if (longitudeController.text.trim().isNotEmpty &&
        (longitude == null || longitude < -180 || longitude > 180)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enter a valid longitude.')));
      return;
    }

    final report = EmergencyReport(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      category: category,
      severity: severity,
      description: descriptionController.text.trim(),
      createdAt: DateTime.now(),
      latitude: latitude,
      longitude: longitude,
      status: widget.offlineMode
          ? 'Pending offline (demo)'
          : 'Saved locally (demo)',
    );

    Navigator.pop(context, report);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SOS report')),
      body: Form(
        key: formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SectionHeading(
              title: 'Report an incident',
              subtitle:
                  'Provide accurate information to help responders '
                  'understand the situation.',
            ),
            const SizedBox(height: 20),
            if (widget.offlineMode)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Offline demo mode: this report will be marked pending. '
                  'It will not be transmitted automatically.',
                  style: TextStyle(color: warningColor),
                ),
              ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              initialValue: category,
              decoration: const InputDecoration(
                labelText: 'Emergency category',
                prefixIcon: Icon(Icons.category_outlined),
              ),
              items: emergencyCategories
                  .map(
                    (item) => DropdownMenuItem(value: item, child: Text(item)),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => category = value);
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: severity,
              decoration: const InputDecoration(
                labelText: 'Severity',
                prefixIcon: Icon(Icons.warning_amber_outlined),
              ),
              items: severityLevels
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: severityColors[item],
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(item),
                        ],
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => severity = value);
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: descriptionController,
              maxLines: 5,
              maxLength: 1000,
              decoration: const InputDecoration(
                labelText: 'Incident description',
                hintText: 'What happened? Where? Is anyone injured?',
                alignLabelWithHint: true,
              ),
              validator: (value) {
                if (value == null || value.trim().length < 10) {
                  return 'Describe the incident in at least 10 characters.';
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            const Text(
              'Location',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Capture your GPS location or enter coordinates manually.',
              style: TextStyle(color: mutedText, height: 1.5),
            ),
            OutlinedButton.icon(
              onPressed: gettingLocation ? null : getCurrentLocation,
              icon: gettingLocation
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location),
              label: Text(
                gettingLocation
                    ? 'Getting location...'
                    : 'Use my current location',
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 280,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: FlutterMap(
                  mapController: mapController,
                  options: MapOptions(
                    initialCenter: defaultMapCenter,
                    initialZoom: 12,
                    onTap: (tapPosition, point) {
                      setState(() {
                        selectedLocation = point;
                        latitudeController.text =
                            point.latitude.toStringAsFixed(6);
                        longitudeController.text =
                            point.longitude.toStringAsFixed(6);
                      });
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.example.mobile',
                    ),
                    if (selectedLocation != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: selectedLocation!,
                            width: 48,
                            height: 48,
                            child: const Icon(
                              Icons.location_pin,
                              color: Colors.red,
                              size: 44,
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
              'Tap the map to select the incident location.',
              style: TextStyle(color: mutedText),
            ),
            TextFormField(
              controller: latitudeController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Latitude (optional)',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: longitudeController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Longitude (optional)',
                prefixIcon: Icon(Icons.map_outlined),
              ),
            ),
            const SizedBox(height: 18),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.photo_camera_outlined),
                    title: const Text('Attach a photo'),
                    subtitle: Text(
                      selectedPhoto?.name ?? 'Choose a photo from your device',
                    ),
                    onTap: pickPhoto,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.videocam_outlined),
                    title: const Text('Attach a short video'),
                    subtitle: Text(
                      selectedVideo?.name ?? 'Choose a video up to 30 seconds',
                    ),
                    onTap: pickVideo,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              value: confirmed,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('I confirm these details are accurate.'),
              onChanged: (value) {
                setState(() => confirmed = value ?? false);
              },
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: prepareReport,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB91C1C),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 17),
              ),
              icon: const Icon(Icons.sos),
              label: const Text('Prepare SOS report'),
            ),
            const SizedBox(height: 12),
            const Text(
              'This prototype does not send reports to POST /sos/submit. '
              'Backend integration is still required.',
              textAlign: TextAlign.center,
              style: TextStyle(color: mutedText, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  void showNotConfigured(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$feature will be added during integration.')),
    );
  }
}

// ============================================================
// MY REPORTS
// ============================================================

class ReportsTab extends StatelessWidget {
  const ReportsTab({super.key, required this.reports});

  final List<EmergencyReport> reports;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SectionHeading(
          title: 'My Reports',
          subtitle: 'Review your prepared emergency reports.',
        ),
        const SizedBox(height: 20),
        if (reports.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(30),
              child: Column(
                children: [
                  Icon(
                    Icons.confirmation_number_outlined,
                    size: 55,
                    color: mutedText,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'No reports yet',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Reports you prepare from the SOS form will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: mutedText, height: 1.5),
                  ),
                ],
              ),
            ),
          )
        else
          ...reports.map(
            (report) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ReportCard(report: report),
            ),
          ),
        const SizedBox(height: 12),
        const PrototypeNotice(),
      ],
    );
  }
}

class ReportCard extends StatelessWidget {
  const ReportCard({super.key, required this.report});

  final EmergencyReport report;

  @override
  Widget build(BuildContext context) {
    // Unknown severity defaults to High so it is never under-warned.
    final severity = severityLevels.contains(report.severity)
        ? report.severity
        : 'High';

    final color = severityColors[severity]!;
    final hasCoordinates = report.latitude != null && report.longitude != null;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          showDialog<void>(
            context: context,
            builder: (dialogContext) => AlertDialog(
              title: Text(report.category),
              content: SingleChildScrollView(
                child: Text(
                  'Report ID: ${report.id}\n\n'
                  'Severity: $severity\n'
                  'Status: ${report.status}\n'
                  'Created: ${report.createdAt.toLocal()}\n\n'
                  'Description:\n${report.description}\n\n'
                  'Location: ${hasCoordinates ? '${report.latitude}, ${report.longitude}' : 'Not provided'}\n\n'
                  'Dispatcher message: ${report.dispatcherMessage.isEmpty ? 'No messages yet' : report.dispatcherMessage}\n\n'
                  'This is local prototype data, not a confirmed server ticket.',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Close'),
                ),
              ],
            ),
          );
        },
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(width: 7, color: color),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(15),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            report.category,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: primaryColor,
                            ),
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: mutedText),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        SeverityBadge(severity: severity),
                        StatusBadge(status: report.status),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      report.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: mutedText, height: 1.4),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      report.createdAt.toLocal().toString(),
                      style: const TextStyle(color: mutedText, fontSize: 11),
                    ),
                    RichAttributionWidget(
                      attributions: [
                        TextSourceAttribution('© OpenStreetMap contributors'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SeverityBadge extends StatelessWidget {
  const SeverityBadge({super.key, required this.severity});

  final String severity;

  @override
  Widget build(BuildContext context) {
    final safeSeverity = severityLevels.contains(severity) ? severity : 'High';

    final color = severityColors[safeSeverity]!;
    final textColor = safeSeverity == 'Medium'
        ? const Color(0xFF1F2937)
        : Colors.white;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        safeSeverity.toUpperCase(),
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: const TextStyle(
          color: primaryColor,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ============================================================
// OFFLINE SAFETY GUIDE
// ============================================================

class SafetyGuideTab extends StatelessWidget {
  const SafetyGuideTab({super.key});

  static const guides = [
    (
      title: 'Floods and heavy rain',
      icon: Icons.water,
      steps: [
        'Move to higher ground if flooding threatens your area.',
        'Avoid walking or driving through floodwater.',
        'Keep away from electrical equipment in wet areas.',
        'Follow verified local emergency instructions.',
        'Keep essential supplies and important documents ready.',
      ],
    ),
    (
      title: 'Fire safety',
      icon: Icons.local_fire_department_outlined,
      steps: [
        'Alert people nearby and leave the building if safe to do so.',
        'Use stairs rather than elevators during an evacuation.',
        'Stay low if smoke makes breathing difficult.',
        'Do not re-enter a burning building.',
        'Contact local emergency services when safe.',
      ],
    ),
    (
      title: 'Disease outbreaks',
      icon: Icons.health_and_safety_outlined,
      steps: [
        'Follow current advice from public health authorities.',
        'Wash your hands regularly and maintain good hygiene.',
        'Avoid close contact with people who may be contagious.',
        'Seek medical advice for concerning symptoms.',
        'Use trusted public health information rather than rumours.',
      ],
    ),
    (
      title: 'Road accidents',
      icon: Icons.car_crash_outlined,
      steps: [
        'Move to a safe place away from moving traffic if possible.',
        'Contact emergency services and give the location.',
        'Do not move seriously injured people unless there is immediate danger.',
        'Follow the instructions of trained responders.',
        'Warn approaching traffic only if it is safe to do so.',
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SectionHeading(
          title: 'Safety Guide',
          subtitle: 'Basic safety guidance for common emergencies.',
        ),
        const SizedBox(height: 10),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(Icons.menu_book_outlined, color: successColor),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'These built-in guides are available in the app bundle. '
                    'Encrypted local caching has not been implemented yet.',
                    style: TextStyle(color: mutedText, height: 1.5),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        ...guides.map(
          (guide) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: ExpansionTile(
                leading: Icon(guide.icon, color: primaryColor),
                title: Text(
                  guide.title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                children: [
                  for (int i = 0; i < guide.steps.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            radius: 13,
                            backgroundColor: primaryColor.withValues(
                              alpha: 0.08,
                            ),
                            child: Text(
                              '${i + 1}',
                              style: const TextStyle(
                                color: primaryColor,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              guide.steps[i],
                              style: const TextStyle(
                                height: 1.5,
                                color: primaryColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ============================================================
// PROFILE AND SETTINGS
// ============================================================

class ProfileTab extends StatefulWidget {
  const ProfileTab({
    super.key,
    required this.name,
    required this.phone,
    required this.emergencyContact,
    required this.language,
    required this.notificationsEnabled,
    required this.lowBandwidthMode,
    required this.onSaveProfile,
    required this.onLanguageChanged,
    required this.onNotificationsChanged,
    required this.onLowBandwidthChanged,
  });

  final String name;
  final String phone;
  final String emergencyContact;
  final String language;
  final bool notificationsEnabled;
  final bool lowBandwidthMode;

  final void Function({
    required String name,
    required String phone,
    required String contact,
  })
  onSaveProfile;

  final ValueChanged<String> onLanguageChanged;
  final ValueChanged<bool> onNotificationsChanged;
  final ValueChanged<bool> onLowBandwidthChanged;

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  late final TextEditingController nameController;
  late final TextEditingController phoneController;
  late final TextEditingController contactController;

  @override
  void initState() {
    super.initState();
    nameController = TextEditingController(text: widget.name);
    phoneController = TextEditingController(text: widget.phone);
    contactController = TextEditingController(text: widget.emergencyContact);
  }

  @override
  void didUpdateWidget(covariant ProfileTab oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.name != widget.name && nameController.text != widget.name) {
      nameController.text = widget.name;
    }

    if (oldWidget.phone != widget.phone &&
        phoneController.text != widget.phone) {
      phoneController.text = widget.phone;
    }

    if (oldWidget.emergencyContact != widget.emergencyContact &&
        contactController.text != widget.emergencyContact) {
      contactController.text = widget.emergencyContact;
    }
  }

  @override
  void dispose() {
    nameController.dispose();
    phoneController.dispose();
    contactController.dispose();
    super.dispose();
  }

  void saveProfile() {
    if (nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a display name first.')),
      );
      return;
    }

    widget.onSaveProfile(
      name: nameController.text.trim(),
      phone: phoneController.text.trim(),
      contact: contactController.text.trim(),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile saved for this app session.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SectionHeading(
          title: 'Profile & Settings',
          subtitle: 'Manage your citizen profile and preferences.',
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 35,
                  backgroundColor: Color(0xFFE2E8F0),
                  child: Icon(
                    Icons.person_outline,
                    size: 40,
                    color: primaryColor,
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: nameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Display name',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone number',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: contactController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Emergency contact',
                    prefixIcon: Icon(Icons.contact_phone_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: saveProfile,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Save profile'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Preferences',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.language_outlined),
                title: const Text('Language'),
                subtitle: const Text(
                  'Language selection preview; translations are not connected.',
                ),
                trailing: DropdownButton<String>(
                  value: widget.language,
                  underline: const SizedBox.shrink(),
                  items: supportedLanguages
                      .map(
                        (item) =>
                            DropdownMenuItem(value: item, child: Text(item)),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      widget.onLanguageChanged(value);
                    }
                  },
                ),
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: const Icon(Icons.notifications_outlined),
                title: const Text('Notifications'),
                subtitle: const Text(
                  'Preference preview; push notifications are not connected.',
                ),
                value: widget.notificationsEnabled,
                onChanged: widget.onNotificationsChanged,
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: const Icon(Icons.data_saver_on_outlined),
                title: const Text('Low-bandwidth mode'),
                subtitle: const Text(
                  'Preference preview; network optimization is not connected.',
                ),
                value: widget.lowBandwidthMode,
                onChanged: widget.onLowBandwidthChanged,
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.lock_outline),
                title: const Text('Security'),
                subtitle: const Text(
                  'Authentication and certificate pinning not configured.',
                ),
                onTap: () => showDialog<void>(
                  context: context,
                  builder: (dialogContext) => AlertDialog(
                    title: const Text('Security status'),
                    content: const Text(
                      'This prototype does not authenticate users or '
                      'communicate with the production backend. Before '
                      'release, implement authentication, secure token '
                      'storage, HTTPS, certificate pinning where appropriate, '
                      'and permission handling.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(dialogContext),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.privacy_tip_outlined),
                title: const Text('Privacy'),
                subtitle: const Text(
                  'Review location and personal-data handling before release.',
                ),
                onTap: () => showDialog<void>(
                  context: context,
                  builder: (dialogContext) => AlertDialog(
                    title: const Text('Privacy information'),
                    content: const Text(
                      'This prototype does not transmit profile information. '
                      'Location access, uploads, server retention, and '
                      'watch-area sharing need an approved privacy policy '
                      'before production use.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(dialogContext),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        const PrototypeNotice(),
      ],
    );
  }
}
