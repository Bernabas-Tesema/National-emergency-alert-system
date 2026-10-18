# Mobile App (Flutter): Citizen

Owners: Mobile Dev 1 (auth, alerts, push), Mobile Dev 2 (SOS, profile, offline).

## Run
flutter pub get
flutter run

## Structure
lib/core       theme, router, network, storage
lib/features   auth, alerts (one folder per feature)
lib/shared     reusable widgets

## Pending decisions (not final)
- Three or four severity levels (lib/core/theme/severity.dart)
- Launch languages
- Alert fields: title / message / action
- All-clear colour
