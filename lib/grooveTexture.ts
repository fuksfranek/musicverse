import * as THREE from "three";

type GrooveTextureSet = {
  color: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
};

type GrooveOptions = {
  size?: number;
  grooveStart?: number;
  grooveEnd?: number;
  ringCount?: number;
  labelR?: number;
  contrast?: number;
};

export function createGrooveTextures({
  size = 1024,
  grooveStart = 0.4,
  grooveEnd = 0.94,
  ringCount = 90,
  labelR = 0.36,
  contrast = 1,
}: GrooveOptions = {}): GrooveTextureSet {
  const midBright = 41;
  const midRough = 117;
  const brightSpread = 37 * contrast;
  const roughSpread = 92 * contrast;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext("2d")!;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext("2d")!;

  const colorImage = colorCtx.createImageData(size, size);
  const roughImage = roughCtx.createImageData(size, size);
  const colorData = colorImage.data;
  const roughData = roughImage.data;

  const center = size / 2;
  const maxR = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const r = Math.sqrt(dx * dx + dy * dy);
      const t = r / maxR;

      let colR = 32;
      let colG = 32;
      let colB = 32;
      let rough = 55;

      if (t >= labelR && t <= 1) {
        if (t >= grooveStart && t <= grooveEnd) {
          const u = (t - grooveStart) / (grooveEnd - grooveStart);
          const wave = Math.sin(u * ringCount * Math.PI * 2);
          const brightness = THREE.MathUtils.clamp(
            midBright + wave * brightSpread,
            0,
            255,
          );
          colR = brightness;
          colG = brightness;
          colB = brightness;
          rough = Math.round(
            THREE.MathUtils.clamp(midRough + wave * roughSpread, 0, 255),
          );
        } else {
          colR = 48;
          colG = 48;
          colB = 48;
          rough = 45;
        }
      }

      const i = (y * size + x) * 4;
      colorData[i + 0] = colR;
      colorData[i + 1] = colG;
      colorData[i + 2] = colB;
      colorData[i + 3] = 255;

      roughData[i + 0] = rough;
      roughData[i + 1] = rough;
      roughData[i + 2] = rough;
      roughData[i + 3] = 255;
    }
  }

  colorCtx.putImageData(colorImage, 0, 0);
  roughCtx.putImageData(roughImage, 0, 0);

  const color = new THREE.CanvasTexture(colorCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = THREE.ClampToEdgeWrapping;
  color.wrapT = THREE.ClampToEdgeWrapping;
  color.anisotropy = 8;

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.colorSpace = THREE.NoColorSpace;
  roughness.wrapS = THREE.ClampToEdgeWrapping;
  roughness.wrapT = THREE.ClampToEdgeWrapping;
  roughness.anisotropy = 8;

  return { color, roughness };
}
