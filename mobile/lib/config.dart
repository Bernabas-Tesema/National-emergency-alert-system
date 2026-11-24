/// Backend Django API. Override at build time:
/// flutter run --dart-define=API_BASE=http://10.0.2.2:8081
const String apiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://127.0.0.1:8081',
);
