import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/ethio_theme.dart';

const introSeenKey = 'ethio_intro_seen';

class IntroScreen extends StatefulWidget {
  const IntroScreen({super.key, required this.onFinished});

  final VoidCallback onFinished;

  @override
  State<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends State<IntroScreen>
    with SingleTickerProviderStateMixin {
  final _controller = PageController();
  int _page = 0;

  late final AnimationController _motionController;
  late final Animation<double> _floatAnim;
  late final Animation<double> _pulseAnim;

  static const _slides = [
    _Slide(
      icon: Icons.notifications_active_rounded,
      title: 'Stay alert',
      body: 'Get clear regional emergency alerts so you know what is happening near you.',
      accent: ethioGreen,
    ),
    _Slide(
      icon: Icons.sos_rounded,
      title: 'Send SOS fast',
      body: 'Share your exact coordinates, camera photos, video and voice with responders in seconds.',
      accent: ethioDanger,
    ),
    _Slide(
      icon: Icons.auto_awesome_rounded,
      title: 'Ask EAi by voice',
      body: 'EthioAlert AI gives calm citizen safety advice by text or direct voice recording.',
      accent: ethioGold,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _motionController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);

    _floatAnim = Tween<double>(begin: -8.0, end: 8.0).animate(
      CurvedAnimation(parent: _motionController, curve: Curves.easeInOut),
    );

    _pulseAnim = Tween<double>(begin: 0.94, end: 1.08).animate(
      CurvedAnimation(parent: _motionController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _motionController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(introSeenKey, true);
    widget.onFinished();
  }

  void _next() {
    if (_page >= _slides.length - 1) {
      _finish();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              ethioForest,
              ethioGreen,
              Color.lerp(ethioGreen, ethioGold, 0.35)!,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header with EthioAlert Logo & Skip Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.2),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(7),
                            child: Image.asset(
                              'assets/images/ethioalert_logo.jpg',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'EthioAlert',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: _finish,
                      child: Text(
                        'Skip',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Motion Slides
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _slides.length,
                  onPageChanged: (i) => setState(() => _page = i),
                  itemBuilder: (context, index) {
                    final s = _slides[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Animated Motion Icon with Floating & Pulsing Glow Rings
                          AnimatedBuilder(
                            animation: _motionController,
                            builder: (context, child) {
                              return Transform.translate(
                                offset: Offset(0, _floatAnim.value),
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    // Outer Radar Halo
                                    Transform.scale(
                                      scale: _pulseAnim.value,
                                      child: Container(
                                        width: 150,
                                        height: 150,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: s.accent.withValues(alpha: 0.18),
                                        ),
                                      ),
                                    ),
                                    // Mid Glowing Ring
                                    Transform.scale(
                                      scale: 1.0 + (_pulseAnim.value - 1.0) * 0.5,
                                      child: Container(
                                        width: 130,
                                        height: 130,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: s.accent.withValues(alpha: 0.45),
                                            width: 2,
                                          ),
                                        ),
                                      ),
                                    ),
                                    // Core Icon Container
                                    Container(
                                      width: 112,
                                      height: 112,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.18),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: Colors.white,
                                          width: 2.5,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: s.accent.withValues(alpha: 0.5),
                                            blurRadius: 32,
                                            offset: const Offset(0, 10),
                                          ),
                                        ],
                                      ),
                                      child: Icon(s.icon, size: 54, color: Colors.white),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 38),

                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(color: Colors.white24),
                            ),
                            child: Text(
                              'NATIONAL EMERGENCY SYSTEM',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.95),
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.1,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          Text(
                            s.title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 34,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.8,
                              height: 1.1,
                            ),
                          ),
                          const SizedBox(height: 16),

                          Text(
                            s.body,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 16,
                              height: 1.55,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              // Page Indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_slides.length, (i) {
                  final active = i == _page;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: active ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: active ? Colors.white : Colors.white38,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              // Bottom Button
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: ethioForest,
                    minimumSize: const Size.fromHeight(54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 3,
                  ),
                  onPressed: _next,
                  child: Text(
                    _page == _slides.length - 1 ? 'Get started' : 'Continue',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({
    required this.icon,
    required this.title,
    required this.body,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String body;
  final Color accent;
}
