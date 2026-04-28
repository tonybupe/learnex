import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/message.dart';

class MessagingApi {
  MessagingApi(this._dio);
  final Dio _dio;

  Future<List<Conversation>> conversations() async {
    final res = await _dio.get(Endpoints.conversations);
    final list = res.data is List
        ? res.data as List
        : (res.data['items'] as List? ?? []);
    return list
        .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Message>> messages(int userId, {int limit = 50}) async {
    final res = await _dio.get(
      Endpoints.messagesWith(userId),
      queryParameters: {'limit': limit},
    );
    final list = res.data is List
        ? res.data as List
        : (res.data['items'] as List? ?? []);
    return list
        .map((e) => Message.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Message> send(int userId, String content) async {
    final res = await _dio.post(
      Endpoints.messagesWith(userId),
      data: {'content': content},
    );
    return Message.fromJson(res.data as Map<String, dynamic>);
  }
}

final messagingApiProvider = Provider<MessagingApi>(
  (ref) => MessagingApi(ref.watch(dioProvider)),
);
