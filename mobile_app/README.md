# Mobile App (Flutter): Citizen

Owners: Mobile Dev 1 (auth, alerts, push), Mobile Dev 2 (SOS, profile, offline).

## Run
```
flutter pub get
flutter run -d <device-id>          # mock API (default)
flutter test
flutter analyze
```
Needs `android/app/google-services.json` from the team Firebase project (never commit it).

## Mock vs real backend
The mock API is on by default (`USE_MOCK=true`).
```
flutter run --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://<sandbox>/v1
```
Mock login numbers: `+251911000201` linked (OTP `123456`), `+251911000202` not linked,
`+251911000203` rate-limited. In debug builds with the mock, the bug icon on Home
simulates an "all clear" for the flood alert.

## Structure
```
lib/core       config, theme (severity enum, colours), router, network (Dio, mock API),
               storage (secure token store), device (device ID), push (FCM, notifications)
lib/features   auth (login, lock screen), alerts (Home, Detail, History)
lib/shared     reusable widgets (severity badge, alert card, area map, error/empty views)
test           unit and widget tests (test/helpers has the fake storage and app launcher)
```

## Assumptions to replace when the backend confirms (all marked ASSUMPTION in code)
- `features/auth/data/auth_repository.dart`: phone/verify and phone/confirm shapes, refresh
- `core/network/api_exception.dart` and `mock_api_interceptor.dart`: error codes
- `features/alerts/domain/alert.dart`: alert fields, status values, polygon order
- `features/alerts/data/alert_repository.dart`: `GET /alerts/mine` paging and sort
- `features/alerts/domain/push_payload.dart` and `core/push/push_service.dart`: push data fields,
  device registration (`POST /devices`), token vs Firebase Installation ID
- `shared/widgets/area_map.dart`: map tile provider (public OpenStreetMap is for development only)

## Pending team decisions (not final)
- Three or four severity levels (`lib/core/theme/severity.dart`)
- Launch languages; one language per alert or translations inside it
- Alert fields title / message / action
- All-clear colour (green for now)
- All-clear notification is quiet even for CRITICAL alerts

## Not done yet
iOS (APNs, Critical Alerts entitlement), localization files (with Mobile Dev 2),
accessibility extras, "how to link your number" text on the not-linked screen.