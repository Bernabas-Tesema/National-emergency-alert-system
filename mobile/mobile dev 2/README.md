# National Emergency Alert & Citizen Safety System (NESS) — Mobile App

## Overview

The NESS Mobile App is a Flutter-based citizen safety application designed to help users identify locations and submit reports about emergencies and safety incidents.

This application is part of the National Emergency Alert & Citizen Safety System project.

## Features

- **Interactive Map:** View, zoom, and pan around the map and select a location.
- **Current Location:** Request the device's current location.
- **Emergency Reporting:** Fill out a form to report an emergency or safety incident.
- **Form Validation:** Validate required fields before submitting a report.
- **Media Selection:** Attach photos or videos selected from the device.
- **Severity Levels:** Use severity indicators to distinguish incident levels.
- **Submission Feedback:** Display confirmation feedback after submitting a report.

## Technologies Used

- Flutter
- Dart
- OpenStreetMap
- `flutter_map`
- `latlong2`
- `geolocator`
- `image_picker`
- `shared_preferences`

## Prerequisites

Before running the application, install:

- [Flutter SDK](https://docs.flutter.dev/get-started/install)
- Git
- Visual Studio Code or Android Studio
- An emulator, connected device, or supported browser

Verify your Flutter installation:

```bash
flutter --version
flutter doctor
```

## Installation and Setup

### 1. Navigate to the mobile directory

From the project repository root, run:

```bash
cd mobile
```

### 2. Install dependencies

```bash
flutter pub get
```

### 3. Run the application

Run on an available device or emulator:

```bash
flutter devices
flutter run
```

To run the application in Google Chrome:

```bash
flutter run -d chrome
```

## Testing and Code Analysis

Run the automated tests:

```bash
flutter test
```

Analyze the project for potential issues:

```bash
flutter analyze
```

Build the web version:

```bash
flutter build web
```

## Project Structure

```text
mobile/
├── android/       # Android platform configuration
├── ios/           # iOS platform configuration
├── linux/         # Linux platform configuration
├── macos/         # macOS platform configuration
├── windows/       # Windows platform configuration
├── web/           # Web platform configuration
├── lib/
│   └── main.dart  # Main application code
├── test/          # Automated tests
├── pubspec.yaml   # Project configuration and dependencies
├── pubspec.lock   # Locked dependency versions
└── README.md      # Mobile application documentation
```

## Permissions and Map Attribution

The Android application declares internet and location permissions. Location features require appropriate device permissions and location services.

Map data is provided by OpenStreetMap contributors. See the [OpenStreetMap Copyright and License](https://www.openstreetmap.org/copyright) page.

## Current Limitations

- Emergency reports are currently handled locally within the application.
- Backend integration for submitting reports to emergency responders is not yet implemented.
- Media selection does not currently upload attachments to a server.
- End-to-end emergency notifications and persistent server-side report storage are not yet implemented.

## Development Status

The mobile application is under development. Features and integrations may change as the project progresses.

## Contribution

- Keep changes within the mobile application scope when working on the mobile component.
- Run `flutter analyze` and `flutter test` before submitting changes.
- Coordinate with the project team when changes affect shared functionality or integration points.
