import 'package:flutter/material.dart';

enum SosCategory {
  // ASSUMPTION: only FIRE_CASE appears in the API document. The rest follow it.
  accident('ACCIDENT_CASE', 'Accident', Icons.car_crash_outlined),
  fire('FIRE_CASE', 'Fire', Icons.local_fire_department_outlined),
  missingPerson(
      'MISSING_PERSON_CASE', 'Missing person', Icons.person_search_outlined),
  health('HEALTH_CASE', 'Health / disease', Icons.health_and_safety_outlined),
  flood('FLOOD_WEATHER_CASE', 'Flood / weather', Icons.water_drop_outlined),
  other('OTHER_CASE', 'Other', Icons.help_outline);

  const SosCategory(this.apiValue, this.label, this.icon);
  final String apiValue;
  final String label;
  final IconData icon;

  static SosCategory fromApi(String? value) => SosCategory.values.firstWhere(
        (c) => c.apiValue == value,
        orElse: () => SosCategory.other,
      );
}