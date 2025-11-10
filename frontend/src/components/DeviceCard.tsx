import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Power, Lightbulb, Wifi, Sun, Palette, Sparkles, Zap } from 'lucide-react';
import { devicesApi } from '../lib/api';
import type { WizDevice } from '../../../src/shared/types';

// Common WIZ scene IDs
const SCENES = [
  { id: 1, name: 'Ocean', color: '#0080FF' },
  { id: 2, name: 'Romance', color: '#FF1493' },
  { id: 3, name: 'Sunset', color: '#FF6347' },
  { id: 4, name: 'Party', color: '#FF00FF' },
  { id: 5, name: 'Fireplace', color: '#FF4500' },
  { id: 6, name: 'Cozy', color: '#FFD700' },
  { id: 7, name: 'Forest', color: '#228B22' },
  { id: 8, name: 'Pastel Colors', color: '#FFB6C1' },
  { id: 9, name: 'Wake up', color: '#FFFF00' },
  { id: 10, name: 'Bedtime', color: '#4B0082' },
  { id: 11, name: 'Warm White', color: '#FFA500' },
  { id: 12, name: 'Daylight', color: '#87CEEB' },
  { id: 13, name: 'Cool white', color: '#E0FFFF' },
  { id: 14, name: 'Night light', color: '#191970' },
  { id: 15, name: 'Focus', color: '#FFFFFF' },
  { id: 16, name: 'Relax', color: '#FFE4B5' },
  { id: 17, name: 'True colors', color: '#FF69B4' },
  { id: 18, name: 'TV time', color: '#4169E1' },
  { id: 19, name: 'Plant growth', color: '#9370DB' },
  { id: 20, name: 'Spring', color: '#98FB98' },
  { id: 21, name: 'Summer', color: '#FFD700' },
  { id: 22, name: 'Fall', color: '#FF8C00' },
  { id: 23, name: 'Deep dive', color: '#000080' },
  { id: 24, name: 'Jungle', color: '#006400' },
  { id: 25, name: 'Mojito', color: '#7FFF00' },
  { id: 26, name: 'Club', color: '#FF1493' },
  { id: 27, name: 'Christmas', color: '#DC143C' },
  { id: 28, name: 'Halloween', color: '#FF6600' },
  { id: 29, name: 'Candlelight', color: '#FFA500' },
  { id: 30, name: 'Golden white', color: '#FFD700' },
  { id: 31, name: 'Pulse', color: '#00FFFF' },
  { id: 32, name: 'Steampunk', color: '#8B4513' },
];

interface DeviceCardProps {
  device: WizDevice;
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const queryClient = useQueryClient();
  const [brightness, setBrightness] = useState(device.state?.brightness || 100);
  const [colorTemp, setColorTemp] = useState(device.state?.colorTemp || 4000);
  const [selectedScene, setSelectedScene] = useState<number | null>(device.state?.sceneId || null);
  const [sceneSpeed, setSceneSpeed] = useState(100);
  const [rgb, setRgb] = useState({
    r: device.state?.rgb?.r || 255,
    g: device.state?.rgb?.g || 255,
    b: device.state?.rgb?.b || 255,
  });
  const [controlMode, setControlMode] = useState<'manual' | 'scene' | 'rgb'>('manual');

  const powerMutation = useMutation({
    mutationFn: (power: boolean) => devicesApi.setPower(device.id, power),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const brightnessMutation = useMutation({
    mutationFn: (value: number) =>
      devicesApi.setState(device.id, { brightness: value, power: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const colorTempMutation = useMutation({
    mutationFn: (value: number) =>
      devicesApi.setState(device.id, { colorTemp: value, power: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const sceneMutation = useMutation({
    mutationFn: ({ sceneId, speed }: { sceneId: number; speed: number }) =>
      devicesApi.setScene(device.id, sceneId, speed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const rgbMutation = useMutation({
    mutationFn: (color: { r: number; g: number; b: number }) =>
      devicesApi.setState(device.id, { rgb: color, power: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
  };

  const handleBrightnessCommit = () => {
    brightnessMutation.mutate(brightness);
  };

  const handleColorTempChange = (value: number) => {
    setColorTemp(value);
  };

  const handleColorTempCommit = () => {
    colorTempMutation.mutate(colorTemp);
  };

  const handleSceneSelect = (sceneId: number) => {
    setSelectedScene(sceneId);
    sceneMutation.mutate({ sceneId, speed: sceneSpeed });
  };

  const handleSceneSpeedCommit = () => {
    if (selectedScene) {
      sceneMutation.mutate({ sceneId: selectedScene, speed: sceneSpeed });
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    setRgb(prev => ({ ...prev, [channel]: value }));
  };

  const handleRgbCommit = () => {
    rgbMutation.mutate(rgb);
  };

  const getConfidenceBadge = () => {
    const colors = {
      high: 'bg-neon-green/20 text-neon-green shadow-[0_0_10px_rgba(57,255,20,0.3)]',
      medium: 'bg-neon-yellow/20 text-neon-yellow shadow-[0_0_10px_rgba(255,255,0,0.3)]',
      low: 'bg-neon-orange/20 text-neon-orange shadow-[0_0_10px_rgba(255,102,0,0.3)]',
    };
    return colors[device.confidence];
  };

  return (
    <div className="bg-card border-2 border-primary/30 rounded-lg p-6 hover:border-primary transition-all duration-300 shadow-[8px_8px_30px_rgba(0,0,0,0.6),12px_12px_40px_rgba(0,0,0,0.4),4px_4px_15px_rgba(0,255,255,0.2)] hover:shadow-[12px_12px_40px_rgba(0,0,0,0.7),16px_16px_50px_rgba(0,0,0,0.5),6px_6px_20px_rgba(0,255,255,0.35)] hover:-translate-y-2 hover:translate-x-[-2px] backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              device.state?.power ? 'bg-primary/20' : 'bg-muted'
            }`}
          >
            <Lightbulb
              size={24}
              className={device.state?.power ? 'text-primary' : 'text-muted-foreground'}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {device.name || device.ip}
            </h3>
            <p className="text-xs text-muted-foreground">{device.mac || 'Unknown MAC'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceBadge()}`}>
          {device.confidence}
        </span>
      </div>

      {/* Info */}
      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Wifi size={14} />
          <span>{device.ip}</span>
        </div>
        {device.state?.colorTemp && (
          <div className="flex items-center gap-1">
            <Sun size={14} />
            <span>{device.state.colorTemp}K</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Power Toggle */}
        <button
          onClick={() => powerMutation.mutate(!device.state?.power)}
          disabled={powerMutation.isPending}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold font-mono tracking-wide uppercase transition-all duration-300 disabled:opacity-50 ${
            device.state?.power
              ? 'bg-primary text-black shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_30px_rgba(0,255,255,0.7)] hover:scale-105'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-2 border-primary/30'
          }`}
        >
          <Power size={18} className={device.state?.power ? 'animate-glow-pulse' : ''} />
          {device.state?.power ? 'Power Off' : 'Power On'}
        </button>

        {/* Brightness Slider */}
        {device.state?.power && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Sun size={16} />
              Brightness: {brightness}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              onMouseUp={handleBrightnessCommit}
              onTouchEnd={handleBrightnessCommit}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        )}

        {/* Color Temperature Slider */}
        {device.state?.power && controlMode === 'manual' && device.state?.colorTemp !== undefined && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Palette size={16} />
              Color Temp: {colorTemp}K
            </label>
            <input
              type="range"
              min="2200"
              max="6500"
              value={colorTemp}
              onChange={(e) => handleColorTempChange(parseInt(e.target.value))}
              onMouseUp={handleColorTempCommit}
              onTouchEnd={handleColorTempCommit}
              className="w-full h-2 bg-gradient-to-r from-orange-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Control Mode Tabs */}
        {device.state?.power && (
          <div className="flex gap-2 border-t border-primary/20 pt-4 mt-4">
            <button
              onClick={() => setControlMode('manual')}
              className={`flex-1 px-3 py-2 rounded font-mono text-xs uppercase tracking-wide transition-all ${
                controlMode === 'manual'
                  ? 'bg-primary/20 text-primary border-2 border-primary'
                  : 'bg-muted text-muted-foreground border-2 border-transparent hover:border-primary/30'
              }`}
            >
              <Sun size={14} className="inline mr-1" />
              Manual
            </button>
            <button
              onClick={() => setControlMode('scene')}
              className={`flex-1 px-3 py-2 rounded font-mono text-xs uppercase tracking-wide transition-all ${
                controlMode === 'scene'
                  ? 'bg-primary/20 text-primary border-2 border-primary'
                  : 'bg-muted text-muted-foreground border-2 border-transparent hover:border-primary/30'
              }`}
            >
              <Sparkles size={14} className="inline mr-1" />
              Scenes
            </button>
            <button
              onClick={() => setControlMode('rgb')}
              className={`flex-1 px-3 py-2 rounded font-mono text-xs uppercase tracking-wide transition-all ${
                controlMode === 'rgb'
                  ? 'bg-primary/20 text-primary border-2 border-primary'
                  : 'bg-muted text-muted-foreground border-2 border-transparent hover:border-primary/30'
              }`}
            >
              <Palette size={14} className="inline mr-1" />
              RGB
            </button>
          </div>
        )}

        {/* Scene Selection */}
        {device.state?.power && controlMode === 'scene' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleSceneSelect(scene.id)}
                  className={`p-2 rounded text-xs font-mono transition-all border-2 ${
                    selectedScene === scene.id
                      ? 'border-primary bg-primary/20 shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                      : 'border-primary/20 bg-card hover:border-primary/50'
                  }`}
                  style={{
                    color: selectedScene === scene.id ? scene.color : undefined,
                  }}
                >
                  {scene.name}
                </button>
              ))}
            </div>
            
            {/* Scene Speed */}
            {selectedScene && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Zap size={16} />
                  Speed: {sceneSpeed}
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={sceneSpeed}
                  onChange={(e) => setSceneSpeed(parseInt(e.target.value))}
                  onMouseUp={handleSceneSpeedCommit}
                  onTouchEnd={handleSceneSpeedCommit}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
                  <span>SLOW</span>
                  <span>FAST</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RGB Controls */}
        {device.state?.power && controlMode === 'rgb' && (
          <div className="space-y-3">
            {/* Red */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  Red
                </span>
                <span className="font-mono text-xs">{rgb.r}</span>
              </label>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb.r}
                onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                onMouseUp={handleRgbCommit}
                onTouchEnd={handleRgbCommit}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #000 0%, #ff0000 100%)`,
                }}
              />
            </div>

            {/* Green */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Green
                </span>
                <span className="font-mono text-xs">{rgb.g}</span>
              </label>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb.g}
                onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                onMouseUp={handleRgbCommit}
                onTouchEnd={handleRgbCommit}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #000 0%, #00ff00 100%)`,
                }}
              />
            </div>

            {/* Blue */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Blue
                </span>
                <span className="font-mono text-xs">{rgb.b}</span>
              </label>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb.b}
                onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                onMouseUp={handleRgbCommit}
                onTouchEnd={handleRgbCommit}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #000 0%, #0000ff 100%)`,
                }}
              />
            </div>

            {/* Color Preview */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div
                className="w-8 h-8 rounded-full border-2 border-primary/30"
                style={{
                  backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                  boxShadow: `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
                }}
              ></div>
              <span className="font-mono text-xs text-muted-foreground">
                RGB({rgb.r}, {rgb.g}, {rgb.b})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
