const std = @import("std");
const math = std.math;
const Canvas = @import("canvas.zig").Canvas;
const Point = @import("point.zig").Point;
const Allocator = std.mem.Allocator;
const audio = @import("audio.zig");

fn clamp01(v: f32) f32 {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

pub const NUM_POINTS: i32 = 256;

const Setup = struct {
    setup: *const fn (*Canvas, *[NUM_POINTS]Point) void,
    animate: *const fn (*Canvas, *[NUM_POINTS]Point, f32, f32) void,
};

const setups = [_]Setup{
    .{ .setup = @import("setups.zig").setupA, .animate = @import("setups.zig").animateA },
    .{ .setup = @import("setups.zig").setupB, .animate = @import("setups.zig").animateB },
    .{ .setup = @import("setups.zig").setupC, .animate = @import("setups.zig").animateC },
};

var current_setup: usize = 0;

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var points: [NUM_POINTS]Point = undefined;
var canvas: Canvas = undefined;

export fn init(width: usize, height: usize) void {
    const allocator = gpa.allocator();
    canvas = Canvas.init(allocator, width, height) catch unreachable;
    for (&points) |*point| {
        point.* = Point.init();
    }
    setups[current_setup].setup(&canvas, &points);
}

export fn go(mouseX: f32, mouseY: f32) [*]const u8 {
    setups[current_setup].animate(&canvas, &points, mouseX, mouseY);
    return canvas.getBufferPtr();
}

export fn toggle() void {
    current_setup = (current_setup + 1) % setups.len;
    init(canvas.width, canvas.height);
    init(canvas.width, canvas.height);
    // deinit();
}

export fn deinit() void {
    canvas.deinit();
    points = undefined;
    _ = gpa.deinit();
}

// Audio-reactive setters. All inputs are clamped so the JS side can pass
// raw FFT-derived values without worrying about overflow.

export fn setEnergy(low: f32, mid: f32, high: f32) void {
    audio.energy_low = clamp01(low);
    audio.energy_mid = clamp01(mid);
    audio.energy_high = clamp01(high);
}

export fn setDensity(d: f32) void {
    audio.density = if (d < 0) 0 else d;
}

export fn setSpeedScale(s: f32) void {
    audio.speed_scale = if (s < 0) 0 else s;
}

export fn setIntensity(i: f32) void {
    audio.intensity = if (i < 0) 0 else i;
}
