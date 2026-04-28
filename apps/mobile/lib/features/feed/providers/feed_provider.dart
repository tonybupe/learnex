import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/post.dart';
import '../data/posts_api.dart';

final selectedFeedTabProvider = StateProvider<FeedTab>((ref) => FeedTab.latest);

final feedProvider =
    FutureProvider.family<List<Post>, FeedTab>((ref, tab) async {
  return ref.watch(postsApiProvider).list(tab: tab);
});

final classFeedProvider =
    FutureProvider.family<List<Post>, int>((ref, classId) async {
  return ref
      .watch(postsApiProvider)
      .list(tab: FeedTab.latest, classId: classId);
});
