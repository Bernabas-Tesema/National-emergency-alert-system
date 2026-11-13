import 'package:flutter/material.dart';

import '../api/ethio_api.dart';
import '../theme/ethio_theme.dart';
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

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _aiController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final alerts = await EthioApi.instance.myAlerts();
      final cases = await EthioApi.instance.myCases();
      setState(() {
        _alerts = alerts;
        _reports = cases;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
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
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [ethioGreen, ethioForest],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: ethioGreen.withValues(alpha: 0.28),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(
                _index == 2 ? Icons.auto_awesome_rounded : Icons.shield_rounded,
                color: Colors.white,
                size: 20,
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
          if (_index != 2)
            IconButton(
              onPressed: _loading ? null : _refresh,
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
              text: 'No dispatched alerts for your registered region yet.',
            )
          else
            ...alerts.map(
              (alert) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: ethioGreen.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.campaign_rounded, color: ethioGreen),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                alert['title']?.toString() ?? 'Alert',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                alert['message']?.toString() ?? '',
                                style: const TextStyle(color: ethioMuted, height: 1.4),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${alert['region'] ?? ''} · ${alert['severity'] ?? ''}',
                                style: TextStyle(
                                  color: ethioGreen.withValues(alpha: 0.9),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
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
            ),
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

class _EaiTab extends StatelessWidget {
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
                  'Ask calm safety steps for fire, flood, accidents, and SOS timing.',
                  style: TextStyle(color: ethioInk, fontSize: 12.5, height: 1.35),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            itemCount: messages.length + (busy ? 1 : 0),
            itemBuilder: (context, index) {
              if (busy && index == messages.length) {
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
              final m = messages[index];
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
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    avatar: const Icon(Icons.bolt_rounded, size: 16, color: ethioGold),
                    label: Text(q),
                    onPressed: busy ? null : () => onSend(q),
                  ),
                ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controller,
                    decoration: const InputDecoration(
                      hintText: 'Ask EAi about emergencies…',
                      prefixIcon: Icon(Icons.chat_bubble_outline_rounded, color: ethioMuted),
                    ),
                    onSubmitted: busy ? null : onSend,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  style: IconButton.styleFrom(
                    backgroundColor: ethioGold,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: busy ? null : () => onSend(controller.text),
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
