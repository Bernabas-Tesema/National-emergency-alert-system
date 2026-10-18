class AppConfig {
  /// Run against the real backend with: --dart-define=USE_MOCK=false
  static const useMock = bool.fromEnvironment('USE_MOCK', defaultValue: true);

  /// ASSUMPTION: confirm with backend. The OpenAPI file and the proposal differ.
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.ethioalert.insa.gov.et/v1',
  );
}