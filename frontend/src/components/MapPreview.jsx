import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';

export default function MapPreview() {
  // Default position: San Francisco coordinates as placeholder
  const position = [37.7749, -122.4194];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Evacuation Map Engine</h2>
            <p className="text-xs text-slate-400">React Leaflet Interactive Tile Preview</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <MapPin className="w-3.5 h-3.5" /> Leaflet Ready
        </span>
      </div>

      <div className="flex-1 w-full relative overflow-hidden rounded-lg border border-slate-800">
        <MapContainer 
          center={position} 
          zoom={13} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>
              <div className="text-slate-900 font-sans">
                <strong>Evacuation Center Alpha</strong><br />
                Status: Operational (Placeholder)
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
