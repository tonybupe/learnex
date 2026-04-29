import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/post.dart';

enum FeedTab { latest, trending, popular, following, classes }

class PostsApi {
  PostsApi(this._dio);
  final Dio _dio;

  Future<List<Post>> list({
    FeedTab tab = FeedTab.latest,
    int? classId,
    int page = 1,
    int pageSize = 20,
  }) async {
    final res = await _dio.get(Endpoints.posts, queryParameters: {
      'tab': tab.name,
      if (classId != null) 'class_id': classId,
      'page': page,
      'page_size': pageSize,
    });
    final data = res.data;
    final list = data is List ? data : (data['items'] as List? ?? []);
    return list
        .map((e) => Post.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Post> create(String content, {List<String>? mediaUrls, int? classId}) async {
    final res = await _dio.post(Endpoints.posts, data: {
      'content': content,
      if (mediaUrls != null) 'media_urls': mediaUrls,
      if (classId != null) 'class_id': classId,
    });
    return Post.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> delete(int id) => _dio.delete(Endpoints.postById(id));

  Future<void> toggleLike(int id) => _dio.post(Endpoints.postLike(id));

  Future<List<Comment>> comments(int postId) async {
    final res = await _dio.get(Endpoints.postComments(postId));
    final list = res.data as List? ?? [];
    return list
        .map((e) => Comment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Comment> addComment(int postId, String content) async {
    final res = await _dio.post(
      Endpoints.postComments(postId),
      data: {'content': content},
    );
    return Comment.fromJson(res.data as Map<String, dynamic>);
  }

  Future<String> uploadMedia(File file) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path),
    });
    final res = await _dio.post(Endpoints.postsMedia, data: formData);
    return (res.data as Map)['url'] as String;
  }
}

final postsApiProvider = Provider<PostsApi>(
  (ref) => PostsApi(ref.watch(dioProvider)),
);
