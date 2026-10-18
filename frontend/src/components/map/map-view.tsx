"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeolocatePositionEvent, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { IncidentNearbyItem } from "@/types/incident";
import type { SystemZoneOut } from "@/types/zone";
import { FALLBACK_DANANG_ZONES } from "@/lib/api";
import { cn } from "@/lib/utils";

// Cấu hình worker tĩnh MapLibre phục vụ trực tiếp từ frontend/public/
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

export interface MapViewProps {
  selectedCoords: { latitude: number; longitude: number } | null;
  onSelectCoords: (coords: { latitude: number; longitude: number }) => void;
  nearbyIncidents?: IncidentNearbyItem[];
  activeZones?: SystemZoneOut[];
  isInsideZone?: boolean;
  className?: string;
}

// Giới hạn không gian địa lý TP. Đà Nẵng theo quy chuẩn IOC (.agents/rules/frontend-nextjs-maplibre.md)
const DANANG_CENTER: [number, number] = [108.2022, 16.0544]; // Kinh độ trước, vĩ độ sau
const DANANG_MAX_BOUNDS: [[number, number], [number, number]] = [
  [107.80, 15.80],
  [108.50, 16.35],
];

// Style raster Carto Voyager Retina sắc nét, hiển thị rõ ràng đường phố tiếng Việt, sông Hàn và các cây cầu tại Đà Nẵng
// Nguồn basemaps.cartocdn.com hoạt động 100% ổn định tại Việt Nam (không bị chặn DNS như tile.openstreetmap.org) và không cần API key
const CARTO_VOYAGER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "carto-voyager-layer",
      type: "raster",
      source: "carto-voyager",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const SOURCE_ZONES = "danang-active-zones";
const LAYER_ZONES_FILL = "danang-active-zones-fill";
const LAYER_ZONES_LINE = "danang-active-zones-line";

const SOURCE_RADIUS = "selected-radius-50m";
const LAYER_RADIUS_FILL = "selected-radius-50m-fill";
const LAYER_RADIUS_LINE = "selected-radius-50m-line";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/**
 * Sinh GeoJSON FeatureCollection chứa Polygon vòng tròn bán kính (mặc định 50m) quanh (lat, lon).
 * Sử dụng công thức trắc địa mặt cầu WGS84 với 64 đỉnh.
 * Tọa độ GeoJSON bắt buộc thứ tự [longitude, latitude].
 */
function createCircleGeoJSON(
  centerLat: number,
  centerLng: number,
  radiusInMeters = 50,
  points = 64
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const coordinates: [number, number][] = [];
  const earthRadius = 6378137; // Bán kính Trái Đất WGS84 (mét)
  const angularDistance = radiusInMeters / earthRadius;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const bearing = (2 * Math.PI * i) / points;
    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLat)
      );

    // Thứ tự [longitude, latitude] cho GeoJSON
    coordinates.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    ],
  };
}

/**
 * Chuyển đổi danh sách SystemZoneOut sang GeoJSON FeatureCollection cho bản đồ.
 * Mặc định sử dụng FALLBACK_DANANG_ZONES nếu activeZones chưa có hoặc rỗng.
 */
function createZonesGeoJSON(
  zones?: SystemZoneOut[]
): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  const targetZones = zones && zones.length > 0 ? zones : FALLBACK_DANANG_ZONES;

  const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];

  for (const zone of targetZones) {
    if (zone.geojson_geometry) {
      features.push({
        type: "Feature",
        properties: {
          id: zone.id,
          name: zone.name,
          description: zone.description ?? "",
        },
        geometry: zone.geojson_geometry as unknown as GeoJSON.Geometry,
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Thoát các ký tự đặc biệt trong chuỗi để hiển thị an toàn trong Popup HTML.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function MapView({
  selectedCoords,
  onSelectCoords,
  nearbyIncidents = [],
  activeZones = [],
  isInsideZone = true,
  className,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Lưu trữ các marker và cờ trạng thái thông qua ref để tránh re-render không cần thiết
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const nearbyMarkersRef = useRef<maplibregl.Marker[]>([]);
  const isDraggingRef = useRef(false);

  // Đồng bộ props vào refs để event listeners MapLibre luôn gọi dữ liệu mới nhất
  const onSelectCoordsRef = useRef(onSelectCoords);
  const activeZonesRef = useRef(activeZones);
  const selectedCoordsRef = useRef(selectedCoords);
  const isInsideZoneRef = useRef(isInsideZone);

  useEffect(() => {
    onSelectCoordsRef.current = onSelectCoords;
    activeZonesRef.current = activeZones;
    selectedCoordsRef.current = selectedCoords;
    isInsideZoneRef.current = isInsideZone;
  }, [onSelectCoords, activeZones, selectedCoords, isInsideZone]);

  // 1. Khởi tạo instance MapLibre map và các Controls
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] = selectedCoordsRef.current
      ? [selectedCoordsRef.current.longitude, selectedCoordsRef.current.latitude]
      : DANANG_CENTER;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_VOYAGER_STYLE,
      center: initialCenter,
      zoom: 12.5,
      maxBounds: DANANG_MAX_BOUNDS,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    // Bắt lỗi runtime của Map an toàn để không kích hoạt Next.js dev overlay
    map.on("error", (e) => {
      console.warn("MapLibre runtime notice:", e.error?.message || e);
    });

    // Controls: NavigationControl & GeolocateControl
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: false,
    });
    map.addControl(geolocate, "top-right");

    geolocate.on("geolocate", (e: GeolocatePositionEvent) => {
      if (e.coords) {
        onSelectCoordsRef.current({
          latitude: e.coords.latitude,
          longitude: e.coords.longitude,
        });
      }
    });

    // Sự kiện click lên bản đồ để chọn tọa độ phản ánh
    map.on("click", (e: MapMouseEvent) => {
      onSelectCoordsRef.current({
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
      });
    });

    // Khi bản đồ tải xong style
    map.on("load", () => {
      // 1.1 Khởi tạo GeoJSON Source & Layers cho Active Zones (mặc định FALLBACK_DANANG_ZONES nếu rỗng)
      if (!map.getSource(SOURCE_ZONES)) {
        map.addSource(SOURCE_ZONES, {
          type: "geojson",
          data: createZonesGeoJSON(activeZonesRef.current),
        });

        map.addLayer({
          id: LAYER_ZONES_FILL,
          type: "fill",
          source: SOURCE_ZONES,
          paint: {
            "fill-color": "#1051A6",
            "fill-opacity": 0.08,
          },
        });

        map.addLayer({
          id: LAYER_ZONES_LINE,
          type: "line",
          source: SOURCE_ZONES,
          paint: {
            "line-color": "#1051A6",
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });
      }

      // 1.2 Khởi tạo GeoJSON Source & Layers cho Vòng tròn bán kính 50m
      if (!map.getSource(SOURCE_RADIUS)) {
        const initialRadiusData = selectedCoordsRef.current
          ? createCircleGeoJSON(
              selectedCoordsRef.current.latitude,
              selectedCoordsRef.current.longitude,
              50
            )
          : EMPTY_FEATURE_COLLECTION;

        map.addSource(SOURCE_RADIUS, {
          type: "geojson",
          data: initialRadiusData,
        });

        map.addLayer({
          id: LAYER_RADIUS_FILL,
          type: "fill",
          source: SOURCE_RADIUS,
          paint: {
            "fill-color":
              isInsideZoneRef.current === false
                ? "rgba(225, 29, 72, 0.15)"
                : "rgba(16, 81, 166, 0.12)",
          },
        });

        map.addLayer({
          id: LAYER_RADIUS_LINE,
          type: "line",
          source: SOURCE_RADIUS,
          paint: {
            "line-color":
              isInsideZoneRef.current === false ? "#E11D48" : "#1051A6",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      }

      setMapLoaded(true);
    });

    return () => {
      setMapLoaded(false);
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      nearbyMarkersRef.current.forEach((m) => m.remove());
      nearbyMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Theo dõi kích thước container để tự động resize MapLibre canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(mapContainerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  // 3. Cập nhật ranh giới phân vùng Active Zones khi prop activeZones thay đổi
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource(SOURCE_ZONES) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(createZonesGeoJSON(activeZones));
    }
  }, [activeZones, mapLoaded]);

  // 4. Cập nhật màu sắc vòng tròn bán kính khi trạng thái geofence isInsideZone thay đổi
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer(LAYER_RADIUS_FILL)) {
      map.setPaintProperty(
        LAYER_RADIUS_FILL,
        "fill-color",
        isInsideZone === false
          ? "rgba(225, 29, 72, 0.15)"
          : "rgba(16, 81, 166, 0.12)"
      );
    }
    if (map.getLayer(LAYER_RADIUS_LINE)) {
      map.setPaintProperty(
        LAYER_RADIUS_LINE,
        "line-color",
        isInsideZone === false ? "#E11D48" : "#1051A6"
      );
    }
  }, [isInsideZone, mapLoaded]);

  // 5. Cập nhật vị trí Marker và Vòng tròn 50m khi selectedCoords thay đổi
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // 5.1 Cập nhật dữ liệu GeoJSON vòng tròn bán kính 50m
    const radiusSource = map.getSource(SOURCE_RADIUS) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (radiusSource) {
      radiusSource.setData(
        selectedCoords
          ? createCircleGeoJSON(
              selectedCoords.latitude,
              selectedCoords.longitude,
              50
            )
          : EMPTY_FEATURE_COLLECTION
      );
    }

    // 5.2 Cập nhật hoặc khởi tạo Draggable Marker
    if (selectedCoords) {
      if (!selectedMarkerRef.current) {
        const marker = new maplibregl.Marker({
          color: "#1051A6", // Primary Blue Đà Nẵng
          draggable: true,
        })
          .setLngLat([selectedCoords.longitude, selectedCoords.latitude])
          .addTo(map);

        marker.on("dragstart", () => {
          isDraggingRef.current = true;
        });

        marker.on("drag", () => {
          const lngLat = marker.getLngLat();
          const liveSource = map.getSource(SOURCE_RADIUS) as
            | maplibregl.GeoJSONSource
            | undefined;
          if (liveSource) {
            liveSource.setData(createCircleGeoJSON(lngLat.lat, lngLat.lng, 50));
          }
        });

        marker.on("dragend", () => {
          isDraggingRef.current = false;
          const lngLat = marker.getLngLat();
          onSelectCoordsRef.current({
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          });
        });

        selectedMarkerRef.current = marker;
      } else {
        if (!isDraggingRef.current) {
          const currentPos = selectedMarkerRef.current.getLngLat();
          if (
            Math.abs(currentPos.lng - selectedCoords.longitude) > 1e-6 ||
            Math.abs(currentPos.lat - selectedCoords.latitude) > 1e-6
          ) {
            selectedMarkerRef.current.setLngLat([
              selectedCoords.longitude,
              selectedCoords.latitude,
            ]);
          }
        }
      }

      // 5.3 Di chuyển camera nhẹ nhàng nếu vị trí chọn nằm xa tâm hiện tại
      if (!isDraggingRef.current) {
        const center = map.getCenter();
        const distLat = Math.abs(center.lat - selectedCoords.latitude);
        const distLng = Math.abs(center.lng - selectedCoords.longitude);
        if (distLat > 0.008 || distLng > 0.008) {
          map.easeTo({
            center: [selectedCoords.longitude, selectedCoords.latitude],
            duration: 600,
          });
        }
      }
    } else {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    }
  }, [selectedCoords, mapLoaded]);

  // 6. Cập nhật các Markers sự cố lân cận (Nearby Incidents) kèm Popup thông tin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Dọn dẹp markers lân cận cũ
    nearbyMarkersRef.current.forEach((marker) => marker.remove());
    nearbyMarkersRef.current = [];

    if (!nearbyIncidents || nearbyIncidents.length === 0) return;

    for (const incident of nearbyIncidents) {
      const isEmergency =
        incident.priority === "EMERGENCY" || incident.priority === "HIGH";
      const markerColor = isEmergency ? "#E11D48" : "#D97706";

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 210px; max-width: 260px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-family: monospace; font-variant-numeric: tabular-nums; font-weight: 700; color: #0F172A; font-size: 12px;">
              ${escapeHtml(incident.ticket_code)}
            </span>
            <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 600; border-radius: 4px; background-color: ${
              isEmergency ? "#FFE4E6" : "#FEF3C7"
            }; color: ${isEmergency ? "#9F1239" : "#92400E"}; border: 1px solid ${
              isEmergency ? "#FDA4AF" : "#FCD34D"
            };">
              ${escapeHtml(incident.status)}
            </span>
          </div>
          <p style="font-size: 12px; font-weight: 600; color: #0F172A; margin: 0 0 6px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(incident.title)}
          </p>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748B;">
            <span>Khoảng cách:</span>
            <span style="font-family: monospace; font-variant-numeric: tabular-nums; font-weight: 600; color: #1E293B;">
              ${Math.round(incident.distance_meters)}m
            </span>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 24,
        closeButton: true,
        closeOnClick: true,
        maxWidth: "280px",
      }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({
        color: markerColor,
        scale: 0.85,
      })
        .setLngLat([incident.longitude, incident.latitude])
        .setPopup(popup)
        .addTo(map);

      // Ngăn chặn sự kiện click trên marker lan ra canvas bản đồ làm đổi vị trí chọn
      const markerElement = marker.getElement();
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      nearbyMarkersRef.current.push(marker);
    }
  }, [nearbyIncidents, mapLoaded]);

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[350px] overflow-hidden bg-slate-100",
        className
      )}
    >
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Cảnh báo nằm ngoài hàng rào địa lý Đà Nẵng (Chuẩn GovTech / Rule 6) */}
      {selectedCoords && isInsideZone === false && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50/95 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          Tọa độ nằm ngoài phạm vi hành chính Đà Nẵng
        </div>
      )}
    </div>
  );
}
