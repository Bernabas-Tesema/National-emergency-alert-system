import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/theme/severity.dart';

/// Shows the alert area as a shaded polygon. Not interactive on purpose, so
/// it does not fight with scrolling the page.
///
/// Tiles: the OpenStreetMap public server is fine for development only.
/// The backend team must say which tile source is allowed in production.
class AreaMap extends StatelessWidget {
  const AreaMap({super.key, required this.polygon, required this.severity});

  final List<LatLng> polygon;
  final Severity severity;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 220,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: FlutterMap(
          options: MapOptions(
            initialCameraFit: CameraFit.bounds(
              bounds: LatLngBounds.fromPoints(polygon),
              padding: const EdgeInsets.all(32),
            ),
            interactionOptions:
                const InteractionOptions(flags: InteractiveFlag.none),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'et.gov.nea.nea_citizen',
            ),
            PolygonLayer(
              polygons: [
                Polygon(
                  points: polygon,
                  color: severity.color.withValues(alpha: 0.25),
                  borderColor: severity.color,
                  borderStrokeWidth: 3,
                ),
              ],
            ),
            const RichAttributionWidget(
              attributions: [
                TextSourceAttribution('© OpenStreetMap contributors'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}