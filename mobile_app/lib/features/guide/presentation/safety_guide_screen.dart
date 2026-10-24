import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../data/safety_guides.dart';

class SafetyGuideScreen extends StatelessWidget {
  const SafetyGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Safety guide')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Basic guidance for common emergencies. It is built into the app, '
            'so it works without internet.',
            style: TextStyle(color: AppColors.textMuted, height: 1.5),
          ),
          const SizedBox(height: 16),
          for (final guide in safetyGuides)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: ExpansionTile(
                  shape: const Border(),
                  collapsedShape: const Border(),
                  leading: Icon(guide.icon, color: AppColors.primary),
                  title: Text(guide.title,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  children: [
                    for (var i = 0; i < guide.steps.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: MergeSemantics(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              CircleAvatar(
                                radius: 13,
                                backgroundColor:
                                    AppColors.primary.withValues(alpha: 0.08),
                                child: Text(
                                  '${i + 1}',
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(guide.steps[i],
                                    style: const TextStyle(height: 1.5)),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}