import 'dart:async';
import 'package:flutter/material.dart';

import '../api/ethio_api.dart';
import '../theme/ethio_theme.dart';
import '../utils/ambulance_alarm.dart';
import '../widgets/ai_message_bubble.dart';
import '../widgets/nav_icon.dart';
import 'sos_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.onSignedOut});

  final VoidCallback onSignedOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _alerts = [];
  List<Map<String, dynamic>> _reports = [];

  final _aiController = TextEditingController();
  final List<_ChatBubble> _aiMessages = [
    _ChatBubble(
      isUser: false,
      text:
          'Hi — I am EAi (EthioAlert AI).\nI help with citizen emergency safety tips: fire, flood, accidents, and when to send SOS.\nSuggestions only — call local responders if you are in danger.',
    ),
  ];
  bool _aiBusy = false;
  bool _alarmMuted = false;
  String? _lastAlarmedAlertId;
  Timer? _alertPollTimer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _alertPollTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (mounted) _refresh(silent: true);
    });
  }

  @override
  void dispose() {
    _alertPollTimer?.cancel();
    AmbulanceAlarm.stopAlarm();
    _aiController.dispose();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final alerts = await EthioApi.instance.myAlerts();
      final cases = await EthioApi.instance.myCases();
      if (!mounted) return;
      setState(() {
        _alerts = alerts;
        _reports = cases;
      });

      if (alerts.isNotEmpty) {
        final topAlert = alerts.first;
        final topId = topAlert['id']?.toString() ?? '';
        final isCritical = (topAlert['severity']?.toString().toLowerCase() ?? 'critical') == 'critical';
        final alertTitle = topAlert['title']?.toString() ?? 'Emergency Alert';
        final alertMessage = topAlert['message']?.toString() ?? '';

        if (topId.isNotEmpty && topId != _lastAlarmedAlertId) {
          _lastAlarmedAlertId = topId;
          if (!_alarmMuted) {
            AmbulanceAlarm.playAlertAlarm(
              title: alertTitle,
              message: alertMessage,
              isCritical: isCritical,
            );
          } else {
            AmbulanceAlarm.showNotification(
              title: alertTitle,
              message: alertMessage,
              isCritical: isCritical,
            );
          }
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('🚨 $alertTitle'),
                backgroundColor: isCritical ? ethioDanger : ethioForest,
                behavior: SnackBarBehavior.floating,
                duration: const Duration(seconds: 5),
                action: SnackBarAction(
                  label: 'Silence',
                  textColor: Colors.white,
                  onPressed: () => AmbulanceAlarm.stopAlarm(),
                ),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (!silent && mounted) setState(() => _error = e.toString());
    } finally {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openSos() async {
    final created = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (_) => const SosScreen()),
    );
    if (created == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('SOS #${created['id']} sent to responders'),
        backgroundColor: ethioSuccess,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
    await _refresh();
    setState(() => _index = 1);
  }

  Future<void> _askAi(String text) async {
    final message = text.trim();
    if (message.isEmpty || _aiBusy) return;
    setState(() {
      _aiBusy = true;
      _aiMessages.add(_ChatBubble(isUser: true, text: message));
      _aiController.clear();
    });
    try {
      final reply = await EthioApi.instance.askAi(message);
      setState(() => _aiMessages.add(_ChatBubble(isUser: false, text: reply)));
    } catch (e) {
      setState(
        () => _aiMessages.add(
          _ChatBubble(isUser: false, text: 'EAi unavailable: $e'),
        ),
      );
    } finally {
      setState(() => _aiBusy = false);
    }
  }

  Future<void> _signOut() async {
    await EthioApi.instance.clearSession();
    widget.onSignedOut();
  }

  String get _title {
    switch (_index) {
      case 1:
        return 'My reports';
      case 2:
        return 'EthioAlert AI';
      case 3:
        return 'Profile';
      default:
        return 'EthioAlert';
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _HomeTab(
        phone: EthioApi.instance.phone ?? '',
        alerts: _alerts,
        loading: _loading,
        error: _error,
        onRefresh: _refresh,
        onSos: _openSos,
        onOpenAi: () => setState(() => _index = 2),
      ),
      _ReportsTab(reports: _reports, loading: _loading, onRefresh: _refresh),
      _EaiTab(
        messages: _aiMessages,
        controller: _aiController,
        busy: _aiBusy,
        onSend: _askAi,
      ),
      _ProfileTab(phone: EthioApi.instance.phone ?? '', onSignOut: _signOut),
    ];

    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: ethioBorder),
                boxShadow: [
                  BoxShadow(
                    color: ethioGreen.withValues(alpha: 0.16),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: _index == 2
                    ? Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(colors: [ethioGold, ethioForest]),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
                      )
                    : Image.asset('assets/images/ethioalert_logo.jpg', fit: BoxFit.contain),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_title),
                  if (_index == 2)
                    const Text(
                      'EAi · citizen safety help',
                      style: TextStyle(
                        color: ethioMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              setState(() => _alarmMuted = !_alarmMuted);
              if (_alarmMuted) {
                AmbulanceAlarm.stopAlarm();
              } else if (_alerts.isNotEmpty) {
                AmbulanceAlarm.playAlertAlarm(
                  title: _alerts.first['title']?.toString() ?? 'Emergency Alert',
                  message: _alerts.first['message']?.toString() ?? '',
                );
              }
            },
            tooltip: _alarmMuted ? 'Unmute Ambulance Alarm' : 'Mute Ambulance Alarm',
            icon: Icon(
              _alarmMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
              color: _alarmMuted ? ethioMuted : ethioDanger,
            ),
          ),
          if (_index != 2)
            IconButton(
              onPressed: _loading ? null : () => _refresh(),
              icon: const Icon(Icons.refresh_rounded),
            ),
        ],
      ),
      floatingActionButton: _index == 0
          ? FloatingActionButton.extended(
              onPressed: _openSos,
              backgroundColor: ethioDanger,
              foregroundColor: Colors.white,
              elevation: 4,
              icon: const Icon(Icons.sos_rounded),
              label: const Text('SOS', style: TextStyle(fontWeight: FontWeight.w800)),
            )
          : null,
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(
            icon: NavGlyph(icon: Icons.home_rounded, selected: _index == 0),
            selectedIcon: const NavGlyph(icon: Icons.home_rounded, selected: true),
            label: 'Home',
          ),
          NavigationDestination(
            icon: NavGlyph(
              icon: Icons.assignment_rounded,
              selected: _index == 1,
              accent: ethioForest,
            ),
            selectedIcon: const NavGlyph(
              icon: Icons.assignment_rounded,
              selected: true,
              accent: ethioForest,
            ),
            label: 'Reports',
          ),
          NavigationDestination(
            icon: NavGlyph(
              icon: Icons.auto_awesome_rounded,
              selected: _index == 2,
              accent: ethioGold,
            ),
            selectedIcon: const NavGlyph(
              icon: Icons.auto_awesome_rounded,
              selected: true,
              accent: ethioGold,
            ),
            label: 'EAi',
          ),
          NavigationDestination(
            icon: NavGlyph(
              icon: Icons.person_rounded,
              selected: _index == 3,
              accent: ethioGreen,
            ),
            selectedIcon: const NavGlyph(
              icon: Icons.person_rounded,
              selected: true,
            ),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _ChatBubble {
  _ChatBubble({required this.isUser, required this.text});
  final bool isUser;
  final String text;
}

class _HomeTab extends StatelessWidget {
  const _HomeTab({
    required this.phone,
    required this.alerts,
    required this.loading,
    required this.error,
    required this.onRefresh,
    required this.onSos,
    required this.onOpenAi,
  });

  final String phone;
  final List<Map<String, dynamic>> alerts;
  final bool loading;
  final String? error;
  final Future<void> Function() onRefresh;
  final VoidCallback onSos;
  final VoidCallback onOpenAi;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: ethioGreen,
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: const LinearGradient(
                colors: [ethioForest, ethioGreen, Color(0xFF14B8A6)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: ethioForest.withValues(alpha: 0.28),
                  blurRadius: 24,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Text(
                    'Citizen safety',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Stay informed.\nStay safe.',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        height: 1.15,
                        letterSpacing: -0.5,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  phone.isEmpty ? 'Citizen session' : 'Signed in as $phone',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: ethioForest,
                          minimumSize: const Size.fromHeight(52),
                        ),
                        onPressed: onSos,
                        icon: const Icon(Icons.sos_rounded),
                        label: const Text('Send SOS'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white70),
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: onOpenAi,
                        icon: const Icon(Icons.auto_awesome_rounded),
                        label: const Text('Ask EAi'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _QuickTile(
                icon: Icons.campaign_rounded,
                label: 'Alerts',
                value: '${alerts.length}',
                color: ethioGreen,
              ),
              const SizedBox(width: 10),
              _QuickTile(
                icon: Icons.auto_awesome_rounded,
                label: 'EAi help',
                value: 'Tips',
                color: ethioGold,
                onTap: onOpenAi,
              ),
            ],
          ),
          const SizedBox(height: 22),
          const Text(
            'Live alerts for your region',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
          ),
          const SizedBox(height: 12),
          if (loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator(color: ethioGreen)),
            )
          else if (error != null)
            _InfoCard(
              icon: Icons.error_outline_rounded,
              color: ethioDanger,
              text: error!,
            )
          else if (alerts.isEmpty)
            const _InfoCard(
              icon: Icons.notifications_none_rounded,
              color: ethioGreen,
              text: 'No active emergency alerts at this moment.',
            )
          else ...[
            // Top Critical Emergency Alarm Banner if alerts exist
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF450A0A), Color(0xFF1E1015)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFDC2626), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFDC2626).withValues(alpha: 0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDC2626).withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.notifications_active_rounded,
                          color: Color(0xFFFCA5A5),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          '🚨 ACTIVE EMERGENCY BROADCAST ALARM',
                          style: TextStyle(
                            color: Color(0xFFFECACA),
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDC2626),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: const Text(
                          'ALL REGIONS',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    alerts.first['title']?.toString() ?? 'Emergency Warning',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    alerts.first['message']?.toString() ?? '',
                    style: const TextStyle(
                      color: Color(0xFFF1F5F9),
                      fontSize: 13,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFFDC2626),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(0, 42),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: onSos,
                          icon: const Icon(Icons.sos_rounded, size: 20),
                          label: const Text(
                            'Send SOS',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.16),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(0, 42),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Colors.white24),
                          ),
                        ),
                        onPressed: () {
                          AmbulanceAlarm.playAlertAlarm(
                            title: alerts.first['title']?.toString() ?? 'Emergency Alert',
                            message: alerts.first['message']?.toString() ?? '',
                          );
                        },
                        icon: const Icon(Icons.volume_up_rounded, size: 18, color: Color(0xFFFCA5A5)),
                        label: const Text(
                          'Siren',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 6),
                      IconButton(
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.12),
                          foregroundColor: Colors.white70,
                        ),
                        onPressed: () => AmbulanceAlarm.stopAlarm(),
                        tooltip: 'Stop Alarm',
                        icon: const Icon(Icons.volume_off_rounded, size: 18),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ...alerts.map(
              (alert) {
                final isCritical = (alert['severity']?.toString().toLowerCase() ?? '') == 'critical';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isCritical ? const Color(0xFFF87171) : ethioBorder,
                        width: isCritical ? 1.5 : 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isCritical
                                    ? const Color(0xFFFEE2E2)
                                    : ethioGreen.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(
                                Icons.campaign_rounded,
                                color: isCritical ? const Color(0xFFDC2626) : ethioGreen,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isCritical ? const Color(0xFFDC2626) : ethioForest,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          (alert['severity']?.toString() ?? 'WARNING').toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          alert['region']?.toString() ?? 'All Regions',
                                          style: const TextStyle(
                                            color: ethioMuted,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    alert['title']?.toString() ?? 'Alert',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 15,
                                      color: ethioInk,
                                      letterSpacing: -0.2,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          alert['message']?.toString() ?? '',
                          style: const TextStyle(color: ethioInk, fontSize: 13, height: 1.45),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.cell_tower_rounded, size: 14, color: ethioMuted),
                                const SizedBox(width: 4),
                                Text(
                                  'Broadcast: PUSH · SMS · CELL',
                                  style: TextStyle(color: ethioMuted.withValues(alpha: 0.8), fontSize: 11),
                                ),
                              ],
                            ),
                            TextButton(
                              style: TextButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                padding: EdgeInsets.zero,
                              ),
                              onPressed: onSos,
                              child: const Text('Send SOS', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: ethioBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        value,
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        label,
                        style: const TextStyle(
                          color: ethioMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
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
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.color,
    required this.text,
  });

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Icon(icon, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: TextStyle(color: ethioMuted.withValues(alpha: 0.95), height: 1.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReportsTab extends StatelessWidget {
  const _ReportsTab({
    required this.reports,
    required this.loading,
    required this.onRefresh,
  });

  final List<Map<String, dynamic>> reports;
  final bool loading;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: ethioGreen,
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          const Text(
            'My SOS & reports',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
          ),
          const SizedBox(height: 12),
          if (loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(color: ethioGreen),
              ),
            )
          else if (reports.isEmpty)
            const _InfoCard(
              icon: Icons.assignment_outlined,
              color: ethioGreen,
              text: 'No reports yet. Use SOS when you need help.',
            )
          else
            ...reports.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: ethioGold.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.assignment_rounded, color: ethioGold),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                r['title']?.toString().isNotEmpty == true
                                    ? r['title'].toString()
                                    : (r['description']?.toString() ?? 'Report'),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${r['status'] ?? ''} · ${r['case_type'] ?? ''} · ${r['region'] ?? ''}',
                                style: const TextStyle(color: ethioMuted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '#${r['id']}',
                          style: const TextStyle(
                            color: ethioGreen,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EaiTab extends StatefulWidget {
  const _EaiTab({
    required this.messages,
    required this.controller,
    required this.busy,
    required this.onSend,
  });

  final List<_ChatBubble> messages;
  final TextEditingController controller;
  final bool busy;
  final Future<void> Function(String) onSend;

  @override
  State<_EaiTab> createState() => _EaiTabState();
}

class _EaiTabState extends State<_EaiTab> {
  bool _isVoiceRecording = false;
  int _voiceSeconds = 0;
  Timer? _voiceTimer;

  @override
  void dispose() {
    _voiceTimer?.cancel();
    super.dispose();
  }

  void _startVoiceRecording() {
    setState(() {
      _isVoiceRecording = true;
      _voiceSeconds = 0;
    });
    _voiceTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_voiceSeconds >= 30) {
        _finishVoiceRecording(send: true);
      } else {
        setState(() => _voiceSeconds++);
      }
    });
  }

  void _finishVoiceRecording({required bool send}) {
    _voiceTimer?.cancel();
    final recordedSeconds = _voiceSeconds;
    setState(() {
      _isVoiceRecording = false;
      _voiceSeconds = 0;
    });

    if (send && recordedSeconds > 0) {
      final voiceInput = widget.controller.text.trim().isNotEmpty
          ? widget.controller.text.trim()
          : 'Voice Query (${recordedSeconds}s audio recording): Please give me immediate emergency safety steps.';
      widget.onSend(voiceInput);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(16, 4, 16, 0),
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                ethioGold.withValues(alpha: 0.16),
                ethioGreen.withValues(alpha: 0.10),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: ethioBorder),
          ),
          child: const Row(
            children: [
              Icon(Icons.tips_and_updates_rounded, color: ethioGold, size: 22),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Ask emergency safety guidance by text or tap the microphone for voice recording.',
                  style: TextStyle(color: ethioInk, fontSize: 12.5, height: 1.35),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            itemCount: widget.messages.length + (widget.busy ? 1 : 0),
            itemBuilder: (context, index) {
              if (widget.busy && index == widget.messages.length) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: ethioGold),
                      ),
                      SizedBox(width: 10),
                      Text('EAi is thinking…', style: TextStyle(color: ethioMuted)),
                    ],
                  ),
                );
              }
              final m = widget.messages[index];
              return AiMessageBubble(text: m.text, isUser: m.isUser);
            },
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              for (final q in const [
                'What should I do in a fire?',
                'When should I send SOS?',
                'Flood safety tips',
                'Heart attack first response',
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    avatar: const Icon(Icons.bolt_rounded, size: 16, color: ethioGold),
                    label: Text(q),
                    onPressed: widget.busy ? null : () => widget.onSend(q),
                  ),
                ),
            ],
          ),
        ),

        // Bottom Input Area (with Voice Recording Bar or Text/Mic Buttons)
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: _isVoiceRecording
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.fiber_manual_record_rounded, color: Colors.red, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Recording Voice Query: 00:${_voiceSeconds.toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            color: Color(0xFF991B1B),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () => _finishVoiceRecording(send: false),
                          icon: const Icon(Icons.close_rounded, color: Colors.grey),
                          tooltip: 'Cancel',
                        ),
                        FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: ethioDanger,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            minimumSize: const Size(0, 36),
                          ),
                          onPressed: () => _finishVoiceRecording(send: true),
                          icon: const Icon(Icons.arrow_upward_rounded, size: 16),
                          label: const Text('Ask EAi'),
                        ),
                      ],
                    ),
                  )
                : Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: widget.controller,
                          decoration: const InputDecoration(
                            hintText: 'Ask EAi or tap mic to speak…',
                            prefixIcon: Icon(Icons.chat_bubble_outline_rounded, color: ethioMuted),
                          ),
                          onSubmitted: widget.busy ? null : widget.onSend,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Voice Recording Microphone Button
                      IconButton.filledTonal(
                        style: IconButton.styleFrom(
                          backgroundColor: ethioForest.withValues(alpha: 0.12),
                          foregroundColor: ethioForest,
                          minimumSize: const Size(48, 48),
                        ),
                        onPressed: widget.busy ? null : _startVoiceRecording,
                        icon: const Icon(Icons.mic_rounded),
                        tooltip: 'Ask using voice recording',
                      ),
                      const SizedBox(width: 6),
                      // Text Send Button
                      IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: ethioGold,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(48, 48),
                        ),
                        onPressed: widget.busy ? null : () => widget.onSend(widget.controller.text),
                        icon: const Icon(Icons.send_rounded),
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.phone, required this.onSignOut});

  final String phone;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [ethioGreen, ethioForest]),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.person_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Citizen account',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(phone, style: const TextStyle(color: ethioMuted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        const _InfoCard(
          icon: Icons.auto_awesome_rounded,
          color: ethioGold,
          text:
              'EAi (EthioAlert AI) gives citizen emergency tips and SOS guidance. Alerts and SOS use the EthioAlert API.',
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: onSignOut,
          style: OutlinedButton.styleFrom(
            foregroundColor: ethioDanger,
            side: const BorderSide(color: ethioDanger),
            minimumSize: const Size.fromHeight(50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Sign out'),
        ),
      ],
    );
  }
}
