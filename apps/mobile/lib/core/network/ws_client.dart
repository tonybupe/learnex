import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_config.dart';
import '../storage/secure_store.dart';

/// Lightweight WS wrapper. Each feature (messaging, notifications) gets its
/// own instance. Auto-reconnects with exponential backoff up to 30s.
class WsClient {
  WsClient(this.path);

  /// Path under [AppConfig.wsBaseUrl], e.g. '/ws/messages/42'
  final String path;

  WebSocketChannel? _channel;
  StreamController<Map<String, dynamic>>? _controller;
  bool _disposed = false;
  int _retry = 0;
  Timer? _reconnectTimer;

  Stream<Map<String, dynamic>> get stream {
    _controller ??= StreamController<Map<String, dynamic>>.broadcast();
    _connect();
    return _controller!.stream;
  }

  Future<void> _connect() async {
    if (_disposed) return;
    final token = await SecureStore.instance.readAccessToken();
    final uri = Uri.parse(
      '${AppConfig.wsBaseUrl}$path${token != null ? '?token=$token' : ''}',
    );
    try {
      _channel = WebSocketChannel.connect(uri);
      _retry = 0;
      _channel!.stream.listen(
        (raw) {
          try {
            final decoded = jsonDecode(raw as String);
            if (decoded is Map<String, dynamic>) {
              _controller?.add(decoded);
            }
          } catch (_) {}
        },
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _retry = (_retry + 1).clamp(1, 6);
    final delay = Duration(seconds: 1 << _retry); // 2,4,8,16,32,64 -> capped
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(
      delay > const Duration(seconds: 30) ? const Duration(seconds: 30) : delay,
      _connect,
    );
  }

  void send(Map<String, dynamic> data) {
    _channel?.sink.add(jsonEncode(data));
  }

  Future<void> dispose() async {
    _disposed = true;
    _reconnectTimer?.cancel();
    await _channel?.sink.close();
    await _controller?.close();
  }
}
