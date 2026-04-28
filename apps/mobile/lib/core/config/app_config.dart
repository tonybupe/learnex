import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'https://api.learn-ex.online/api/v1';

  static String get wsBaseUrl =>
      dotenv.env['WS_BASE_URL'] ?? 'wss://api.learn-ex.online';

  static String get appName => dotenv.env['APP_NAME'] ?? 'Learnex';

  static String get appEnv => dotenv.env['APP_ENV'] ?? 'production';

  static bool get isProduction => appEnv == 'production';
  static bool get isDevelopment => appEnv == 'development';
}
