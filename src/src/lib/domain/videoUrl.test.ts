import { describe, expect, it } from "vitest";
import { isValidVideoUrl, resolveVideoEmbed } from "./videoUrl";

describe("isValidVideoUrl", () => {
  it("6. una URL vacía no se valida aquí (el campo es opcional, se maneja aparte)", () => {
    expect(isValidVideoUrl("")).toBe(false);
    expect(isValidVideoUrl("   ")).toBe(false);
  });

  it("acepta https://", () => {
    expect(isValidVideoUrl("https://www.youtube.com/watch?v=ABC123")).toBe(true);
  });

  it("acepta http://", () => {
    expect(isValidVideoUrl("http://servidor.com/videos/ejercicio.mp4")).toBe(true);
  });

  it("7. rechaza texto claramente inválido", () => {
    expect(isValidVideoUrl("no es una url")).toBe(false);
    expect(isValidVideoUrl("ejercicio.mp4")).toBe(false);
  });

  it("rechaza esquemas peligrosos o no soportados", () => {
    expect(isValidVideoUrl("javascript:alert(1)")).toBe(false);
    expect(isValidVideoUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isValidVideoUrl("ftp://servidor.com/video.mp4")).toBe(false);
  });
});

describe("resolveVideoEmbed", () => {
  it("11. sin URL no intenta embeber nada (kind: none)", () => {
    expect(resolveVideoEmbed(null)).toEqual({ kind: "none", embedUrl: null });
    expect(resolveVideoEmbed(undefined)).toEqual({ kind: "none", embedUrl: null });
    expect(resolveVideoEmbed("")).toEqual({ kind: "none", embedUrl: null });
  });

  it("8. convierte una URL de YouTube (watch) a su embed", () => {
    const result = resolveVideoEmbed("https://www.youtube.com/watch?v=ABC123");
    expect(result).toEqual({ kind: "youtube", embedUrl: "https://www.youtube.com/embed/ABC123" });
  });

  it("respeta parámetros adicionales en la URL de YouTube", () => {
    const result = resolveVideoEmbed("https://www.youtube.com/watch?v=ABC123&t=30s");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/ABC123");
  });

  it("9. convierte una URL de YouTube Shorts a su embed", () => {
    const result = resolveVideoEmbed("https://youtube.com/shorts/XYZ789");
    expect(result).toEqual({ kind: "youtube", embedUrl: "https://www.youtube.com/embed/XYZ789" });
  });

  it("convierte un enlace corto youtu.be a su embed", () => {
    const result = resolveVideoEmbed("https://youtu.be/ABC123");
    expect(result).toEqual({ kind: "youtube", embedUrl: "https://www.youtube.com/embed/ABC123" });
  });

  it("10. reconoce una URL directa de video (.mp4) como reproducible", () => {
    const result = resolveVideoEmbed("https://servidor.com/videos/ejercicio.mp4");
    expect(result).toEqual({ kind: "direct", embedUrl: "https://servidor.com/videos/ejercicio.mp4" });
  });

  it("una URL de otro proveedor (ej. Vimeo) no se embebe: solo botón de apertura", () => {
    const result = resolveVideoEmbed("https://vimeo.com/123456789");
    expect(result).toEqual({ kind: "none", embedUrl: null });
  });

  it("una URL inválida nunca se embebe", () => {
    expect(resolveVideoEmbed("no es una url")).toEqual({ kind: "none", embedUrl: null });
  });
});
