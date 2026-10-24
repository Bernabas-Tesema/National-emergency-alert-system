import 'package:image_picker/image_picker.dart';

enum MediaChoice { takePhoto, choosePhoto, recordVideo, chooseVideo }

class PickedMedia {
  const PickedMedia({
    required this.path,
    required this.name,
    required this.isVideo,
  });

  final String path;
  final String name;
  final bool isVideo;
}

class MediaException implements Exception {
  const MediaException(this.message);
  final String message;
}

/// ASSUMPTION: the size limit is a guess until the backend says.
const maxMediaBytes = 25 * 1024 * 1024;

class MediaPickerService {
  final ImagePicker _picker = ImagePicker();

  Future<PickedMedia?> pick(
    MediaChoice choice, {
    required bool lowBandwidth,
  }) async {
    final quality = lowBandwidth ? 50 : 85;
    final XFile? file = switch (choice) {
      MediaChoice.takePhoto => await _picker.pickImage(
          source: ImageSource.camera, imageQuality: quality, maxWidth: 1600),
      MediaChoice.choosePhoto => await _picker.pickImage(
          source: ImageSource.gallery, imageQuality: quality, maxWidth: 1600),
      MediaChoice.recordVideo => await _picker.pickVideo(
          source: ImageSource.camera,
          maxDuration: const Duration(seconds: 30)),
      MediaChoice.chooseVideo => await _picker.pickVideo(
          source: ImageSource.gallery,
          maxDuration: const Duration(seconds: 30)),
    };
    if (file == null) return null;
    if (await file.length() > maxMediaBytes) {
      throw const MediaException('That file is too large. Choose a smaller one.');
    }
    return PickedMedia(
      path: file.path,
      name: file.name,
      isVideo: choice == MediaChoice.recordVideo ||
          choice == MediaChoice.chooseVideo,
    );
  }
}