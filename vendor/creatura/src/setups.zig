const Canvas = @import("canvas.zig").Canvas;
const Point = @import("point.zig").Point;
const NUM_POINTS = @import("main.zig").NUM_POINTS;
const audio = @import("audio.zig");

// Audio-reactive helpers. All scale a base parameter by an audio-derived
// factor while keeping the upstream behaviour as the default (when audio
// state is at its zero values, scale_* returns the original argument).

fn radiusPulse() f32 {
    // Bass kicks bloom every painted circle.
    return 1.0 + 0.6 * audio.energy_low;
}

fn intensityFactor() f32 {
    // Highs sparkle through blur + chromatic aberration; the master
    // intensity (driven by portal fade-in) caps the whole effect.
    return audio.intensity * (0.6 + 0.9 * audio.energy_high);
}

fn scaleI32(base: i32, factor: f32) i32 {
    const f = @as(f32, @floatFromInt(base)) * factor;
    if (f < 0) return 0;
    return @as(i32, @intFromFloat(f));
}

fn scaleUsize(base: usize, factor: f32) usize {
    const f = @as(f32, @floatFromInt(base)) * factor;
    if (f < 0) return 0;
    return @as(usize, @intFromFloat(f));
}

pub fn setupA(c: *Canvas, p: *[NUM_POINTS]Point) void {
    c.setClearColor(.White);
    _ = p[0]
        .setPosition(0.9, -0.9)
        .setVelocity(-0.008, 0.004);
    _ = p[1]
        .setPosition(0.0, 0.0)
        .setOscillation(0.09, -0.04, 2, 2)
        .followPoint(&p[2]);
    _ = p[2]
        .setPosition(-0.5, 0.8)
        .setOscillation(0.01, 0.01, 2, 1)
        .setVelocity(0.004, -0.004);
    _ = p[3]
        .setPosition(0.9, 0.9)
        .setVelocity(-0.008, -0.008);

    _ = p[4]
        .setPosition(-0.6, 0.6)
        .setOscillation(0.001, 0.001, 1.3, 0.3);
    _ = p[5]
        .setPosition(0.6, 0.6)
        .setOscillation(0.001, 0.001, 1.3, 0.3);
    _ = p[6]
        .setPosition(0.6, -0.6)
        .setOscillation(0.001, 0.001, 1.3, 0.3);
    _ = p[7]
        .setPosition(-0.6, -0.6);
    _ = p[8]
        .setPosition(-0.6, -0.0);
}

pub fn animateA(c: *Canvas, p: *[NUM_POINTS]Point, mx: f32, my: f32) void {
    c.clear();

    if (mx != 0 and my != 0) {
        _ = p[0].setPosition(mx, my);
    }

    for (p) |*point| {
        _ = point.update();
    }

    const r = radiusPulse();
    const it = intensityFactor();

    c.paintCircle(p[1], 0.1 * r, 0.4, .Black);
    c.paintCircle(p[2], 0.3 * r, 0.01, .Black);
    c.paintCircle(p[3], 0.3 * r, @abs(p[0].position[1]) / 4 + 0.01, .Black);

    c.renderWetSpot(p[0], 2.0 + 0.6 * audio.energy_mid, .LightGrey);

    c.paintCircle(p[4], 0.5 * r, @abs(p[0].position[1]) / 4 + 0.01, .Black);
    c.paintCircle(p[5], 0.37 * r, @abs(p[1].position[1]) / 3 + 0.01, .Black);
    c.paintCircle(p[6], 0.29 * r, @abs(p[1].position[1]) / 4 + 0.01, .Black);
    c.paintCircle(p[7], 0.22 * r, @abs(p[0].position[1]) / 3 + 0.01, .Black);

    c.drawBezierCurve(p[0], p[1], p[3], 0.012, .Black);
    c.drawBezierCurve(p[1], p[2], p[3], 0.012, .Black);
    c.drawBezierCurve(p[2], p[0], p[3], 0.012, .Black);
    c.drawBezierCurve(p[0], p[1], p[3], 0.012, .Black);

    c.drawWigglyLine(p[7], p[1], 0.05, p[7].position[0] * 20, p[7].position[1] * 2, 0.01, .Black);

    c.fastBlur(1, scaleUsize(6, it), p[0]);
    c.chromaticAberration(scaleI32(4, it), scaleI32(4, it));
    c.applyLensDistortion(384);
    c.addFilmGrain(0.3);
}

pub fn setupB(c: *Canvas, p: *[NUM_POINTS]Point) void {
    c.setClearColor(.White);
    _ = p[0]
        .setPosition(0.0, 0.0);
    _ = p[1]
        .setPosition(0.4, -0.4)
        .orbitAround(&p[0], 0.2, 0.2);
    _ = p[2]
        .setPosition(0.4, 0.4)
        .orbitAround(&p[1], 0.2, 0.22);
    _ = p[3]
        .setPosition(-0.4, -0.4)
        .orbitAround(&p[2], 0.2, 0.24);
    _ = p[4]
        .setPosition(-0.4, 0.4)
        .orbitAround(&p[3], 0.2, 0.26);
    _ = p[5]
        .setPosition(-0.4, 0.4)
        .orbitAround(&p[4], 0.2, 0.28);

    _ = p[6]
        .orbitAround(&p[0], 0.8, 0.01);
    _ = p[7]
        .orbitAround(&p[0], 0.8, 0.02);
    _ = p[8]
        .orbitAround(&p[0], 0.8, 0.03);
    _ = p[9]
        .orbitAround(&p[0], 0.8, 0.05);
    _ = p[10]
        .orbitAround(&p[0], 0.8, 0.07);
    _ = p[11]
        .orbitAround(&p[0], 0.8, 0.1);
    _ = p[12]
        .orbitAround(&p[0], 0.8, 0.14);
    _ = p[13]
        .orbitAround(&p[0], 0.8, 0.19);
}

pub fn animateB(c: *Canvas, p: *[NUM_POINTS]Point, mx: f32, my: f32) void {
    c.clear();

    if (mx != 0 and my != 0) {
        _ = p[14].setPosition(mx, my);
    }

    for (p) |*point| {
        _ = point.update();
    }

    const r = radiusPulse();
    const it = intensityFactor();
    const d = audio.density;

    // Density gates: lower-index orbits stay; the outer ones fade in as
    // the mid energy rises.
    const orbit_radius = (0.05 + p[14].position[0]) * r;
    if (d > 0.00) c.paintCircle(p[6], orbit_radius, 0.04, .LightGrey);
    if (d > 0.15) c.paintCircle(p[7], orbit_radius, 0.04, .LightGrey);
    if (d > 0.30) c.paintCircle(p[8], orbit_radius, 0.04, .LightGrey);
    if (d > 0.45) c.paintCircle(p[9], orbit_radius, 0.04, .LightGrey);
    if (d > 0.60) c.paintCircle(p[10], orbit_radius, 0.04, .LightGrey);
    if (d > 0.75) c.paintCircle(p[11], orbit_radius, 0.04, .LightGrey);
    if (d > 0.90) c.paintCircle(p[12], orbit_radius, 0.04, .LightGrey);
    if (d > 1.05) c.paintCircle(p[13], orbit_radius, 0.04, .LightGrey);

    c.paintCircle(p[14], 0.01 * r, 0.04, .LightGrey);

    c.paintCircle(p[1], 0.1 * r, 0.03, .Black);
    c.renderWetSpot(p[1], 0.2 + p[14].position[1] + 0.4 * audio.energy_mid, .LightGrey);
    c.paintCircle(p[2], 0.1 * r, 0.06, .Black);
    c.renderWetSpot(p[2], 0.3 + p[14].position[1] + 0.4 * audio.energy_mid, .LightGrey);
    c.paintCircle(p[3], 0.1 * r, 0.08, .Black);
    c.renderWetSpot(p[3], 0.1 + p[14].position[1] + 0.4 * audio.energy_mid, .Black);
    c.paintCircle(p[4], 0.1 * r, 0.1, .Black);
    c.paintCircle(p[5], 0.1 * r, 0.1, .Black);

    c.fastBlur(1, scaleUsize(16, it), p[0]);
    c.chromaticAberration(scaleI32(16, it), scaleI32(16, it));
    c.applyLensDistortion(512);
    c.addFilmGrain(0.3);
}

pub fn setupC(c: *Canvas, p: *[NUM_POINTS]Point) void {
    c.setClearColor(.Black);
    _ = p[0]
        .setPosition(0.0, 0.0);
    _ = p[1]
        .setPosition(0.4, -0.4)
        .orbitAround(&p[0], 0.2, 0.2);
    _ = p[2]
        .setPosition(0.4, 0.4)
        .orbitAround(&p[1], 0.2, 0.22);
    _ = p[3]
        .setPosition(-0.4, -0.4)
        .orbitAround(&p[2], 0.2, 0.24);
    _ = p[4]
        .setPosition(-0.4, 0.4)
        .orbitAround(&p[3], 0.2, 0.26);
    _ = p[5]
        .setPosition(-0.4, 0.4)
        .orbitAround(&p[4], 0.2, 0.28);

    _ = p[6]
        .orbitAround(&p[0], 0.8, 0.01);
    _ = p[7]
        .orbitAround(&p[0], 0.8, 0.02);
    _ = p[8]
        .orbitAround(&p[0], 0.8, 0.03);
    _ = p[9]
        .orbitAround(&p[0], 0.8, 0.05);
    _ = p[10]
        .orbitAround(&p[0], 0.8, 0.07);
    _ = p[11]
        .orbitAround(&p[0], 0.8, 0.1);
    _ = p[12]
        .orbitAround(&p[0], 0.8, 0.14);
    _ = p[13]
        .orbitAround(&p[0], 0.8, 0.19);
}

pub fn animateC(c: *Canvas, p: *[NUM_POINTS]Point, mx: f32, my: f32) void {
    c.clear();

    if (mx != 0 and my != 0) {
        _ = p[14].setPosition(mx, my);
    }

    for (p) |*point| {
        _ = point.update();
    }

    const r = radiusPulse();
    const it = intensityFactor();
    const d = audio.density;

    const orbit_radius = (0.05 + p[14].position[0]) * r;
    if (d > 0.00) c.paintCircle(p[6], orbit_radius, 0.04, .LightGrey);
    if (d > 0.15) c.paintCircle(p[7], orbit_radius, 0.04, .LightGrey);
    if (d > 0.30) c.paintCircle(p[8], orbit_radius, 0.04, .LightGrey);
    if (d > 0.45) c.paintCircle(p[9], orbit_radius, 0.04, .LightGrey);
    if (d > 0.60) c.paintCircle(p[10], orbit_radius, 0.04, .LightGrey);
    if (d > 0.75) c.paintCircle(p[11], orbit_radius, 0.04, .LightGrey);
    if (d > 0.90) c.paintCircle(p[12], orbit_radius, 0.04, .LightGrey);
    if (d > 1.05) c.paintCircle(p[13], orbit_radius, 0.04, .LightGrey);

    c.paintCircle(p[14], 0.01 * r, 0.04, .LightGrey);

    c.paintCircle(p[1], 0.1 * r, 0.03, .Black);
    c.renderWetSpot(p[1], 0.2 + p[14].position[1] + 0.4 * audio.energy_mid, .LightGrey);
    c.paintCircle(p[2], 0.1 * r, 0.06, .Black);
    c.renderWetSpot(p[2], 0.3 + p[14].position[1] + 0.4 * audio.energy_mid, .LightGrey);
    c.paintCircle(p[3], 0.1 * r, 0.08, .Black);
    c.renderWetSpot(p[3], 0.1 + p[14].position[1] + 0.4 * audio.energy_mid, .Black);
    c.paintCircle(p[4], 0.1 * r, 0.1, .Black);
    c.paintCircle(p[5], 0.1 * r, 0.1, .Black);

    c.fastBlur(1, scaleUsize(16, it), p[0]);
    c.chromaticAberration(scaleI32(6, it), scaleI32(6, it));
    c.applyLensDistortion(512);
    c.addFilmGrain(0.3);
}
