import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load env, but don't crash if .env is missing in some build flavours.
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {}

  // English short locale for messaging timestamps
  timeago.setLocaleMessages('en_short', timeago.EnShortMessages());

  // Brand-coloured status bar (Android)
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const ProviderScope(child: LearnexApp()));
}
