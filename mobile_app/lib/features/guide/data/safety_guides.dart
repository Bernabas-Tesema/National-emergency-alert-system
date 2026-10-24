import 'package:flutter/material.dart';

typedef SafetyGuide = ({String title, IconData icon, List<String> steps});

/// Built-in guidance, written by Mobile Dev 2. The emergency authority should
/// review the wording before release, and it needs translating.
const List<SafetyGuide> safetyGuides = [
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