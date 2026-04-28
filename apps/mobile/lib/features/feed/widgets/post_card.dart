import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../core/theme/app_colors.dart';
import '../../../models/post.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../data/posts_api.dart';

class PostCard extends ConsumerStatefulWidget {
  const PostCard({required this.post, super.key});
  final Post post;

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard> {
  late Post _post = widget.post;
  bool _liking = false;

  Future<void> _toggleLike() async {
    if (_liking) return;
    setState(() {
      _liking = true;
      _post = _post.copyWith(
        isLiked: !_post.isLiked,
        likeCount: _post.likeCount + (_post.isLiked ? -1 : 1),
      );
    });
    try {
      await ref.read(postsApiProvider).toggleLike(_post.id);
    } catch (_) {
      // revert on failure
      if (mounted) {
        setState(() {
          _post = _post.copyWith(
            isLiked: !_post.isLiked,
            likeCount: _post.likeCount + (_post.isLiked ? -1 : 1),
          );
        });
      }
    } finally {
      if (mounted) setState(() => _liking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                UserAvatar(
                  imageUrl: _post.authorAvatar,
                  name: _post.authorName,
                  radius: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              _post.authorName ?? 'Unknown',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (_post.authorRole == 'teacher') ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.verified,
                                color: AppColors.brand, size: 14),
                          ],
                        ],
                      ),
                      Row(
                        children: [
                          if (_post.className != null) ...[
                            Flexible(
                              child: Text(
                                _post.className!,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.color,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Text(' · ',
                                style: TextStyle(fontSize: 12)),
                          ],
                          if (_post.createdAt != null)
                            Text(
                              timeago.format(_post.createdAt!),
                              style: const TextStyle(fontSize: 12),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.more_horiz),
                  onPressed: () {},
                ),
              ],
            ),
            if (_post.content.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(_post.content, style: const TextStyle(height: 1.4)),
            ],
            if (_post.mediaUrls.isNotEmpty) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: _post.mediaUrls.first,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    height: 200,
                    color: Colors.black12,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                _ActionButton(
                  icon: _post.isLiked
                      ? Icons.favorite
                      : Icons.favorite_border,
                  color: _post.isLiked ? AppColors.danger : null,
                  count: _post.likeCount,
                  onTap: _toggleLike,
                ),
                const SizedBox(width: 16),
                _ActionButton(
                  icon: Icons.chat_bubble_outline,
                  count: _post.commentCount,
                  onTap: () {},
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.bookmark_border, size: 20),
                  onPressed: () {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.count,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final int count;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 6),
            Text('$count', style: TextStyle(color: color)),
          ],
        ),
      ),
    );
  }
}
