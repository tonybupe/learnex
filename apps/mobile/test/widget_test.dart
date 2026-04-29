import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learnex_mobile/main.dart';
import 'package:learnex_mobile/app.dart';

void main() {
  testWidgets('App starts without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: LearnexApp()),
    );
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}