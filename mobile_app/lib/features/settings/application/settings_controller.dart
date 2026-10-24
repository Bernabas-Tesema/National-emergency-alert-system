import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppLanguage {
  const AppLanguage(this.code, this.name, this.nativeName);
  final String code;
  final String name;
  final String nativeName;
}

/// From the Web Dev 1 handoff. Which of these are on at launch is still open.
const appLanguages = [
  AppLanguage('am', 'Amharic', 'አማርኛ'),
  AppLanguage('en', 'English', 'English'),
  AppLanguage('om', 'Afan Oromo', 'Afaan Oromoo'),
  AppLanguage('ti', 'Tigrinya', 'ትግርኛ'),
  AppLanguage('so', 'Somali', 'Soomaali'),
];

class SettingsState {
  const SettingsState({
    this.displayName = '',
    this.emergencyContact = '',
    this.languageCode = 'en',
    this.notifications = true,
    this.lowBandwidth = false,
  });

  final String displayName;
  final String emergencyContact;
  final String languageCode;
  final bool notifications;
  final bool lowBandwidth;

  SettingsState copyWith({
    String? displayName,
    String? emergencyContact,
    String? languageCode,
    bool? notifications,
    bool? lowBandwidth,
  }) =>
      SettingsState(
        displayName: displayName ?? this.displayName,
        emergencyContact: emergencyContact ?? this.emergencyContact,
        languageCode: languageCode ?? this.languageCode,
        notifications: notifications ?? this.notifications,
        lowBandwidth: lowBandwidth ?? this.lowBandwidth,
      );
}

/// TODO: these reset when the app restarts. Persisting them needs a decision
/// on where personal data such as the emergency contact may be stored.
class SettingsController extends Notifier<SettingsState> {
  @override
  SettingsState build() => const SettingsState();

  void saveProfile({required String name, required String contact}) =>
      state = state.copyWith(displayName: name, emergencyContact: contact);

  void setLanguage(String code) => state = state.copyWith(languageCode: code);

  void setNotifications(bool value) =>
      state = state.copyWith(notifications: value);

  void setLowBandwidth(bool value) =>
      state = state.copyWith(lowBandwidth: value);
}

final settingsProvider =
    NotifierProvider<SettingsController, SettingsState>(SettingsController.new);