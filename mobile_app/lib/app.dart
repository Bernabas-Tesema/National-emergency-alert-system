import 'package:flutter/material.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

class NeaApp extends StatelessWidget {
  const NeaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'National Emergency Alert',
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}