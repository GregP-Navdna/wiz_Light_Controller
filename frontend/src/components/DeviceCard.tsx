import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Power, Lightbulb, Wifi, Sun, Palette } from 'lucide-react';
import { devicesApi } from '../lib/api';
import type { WizDevice } from '../../../src/shared/types';

interface DeviceCardProps {
  device: WizDevice;
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const queryClient = useQueryClient();
  const [brightness, setBrightness] = useState(device.state?.brightness || 100);
  const [colorTemp, setColorTemp] = useState(device.state?.colorTemp || 4000);

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
        {device.state?.power && device.state?.colorTemp !== undefined && (
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
      </div>
    </div>
  );
}
