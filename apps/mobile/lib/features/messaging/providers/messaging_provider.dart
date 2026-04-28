import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/message.dart';
import '../data/messaging_api.dart';

final conversationsProvider = FutureProvider<List<Conversation>>((ref) async {
  return ref.watch(messagingApiProvider).conversations();
});

final messagesWithProvider =
    FutureProvider.family<List<Message>, int>((ref, userId) async {
  return ref.watch(messagingApiProvider).messages(userId);
});
