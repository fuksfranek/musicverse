// Audio-reactive state shared between main.zig, point.zig and setups.zig.
// Defaults are picked so that, with no setters called, behaviour is identical
// to the upstream Creatura demo.

pub var energy_low: f32 = 0;
pub var energy_mid: f32 = 0;
pub var energy_high: f32 = 0;

pub var density: f32 = 1.0;
pub var speed_scale: f32 = 1.0;
pub var intensity: f32 = 1.0;
