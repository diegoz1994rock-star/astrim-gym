import { describe, expect, it } from "vitest";
import { DEFAULT_FACE_MATCH_THRESHOLD, euclideanDistance, findBestMatch } from "./faceMatching";

describe("euclideanDistance", () => {
  it("1. mismo embedding: distancia cero", () => {
    expect(euclideanDistance([0.1, 0.2, 0.3], [0.1, 0.2, 0.3])).toBe(0);
  });

  it("2. embeddings de longitud distinta: infinito, nunca revienta", () => {
    expect(euclideanDistance([0.1, 0.2], [0.1, 0.2, 0.3])).toBe(Number.POSITIVE_INFINITY);
  });

  it("3. embeddings vacíos: infinito, no NaN", () => {
    expect(euclideanDistance([], [])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("findBestMatch", () => {
  it("1. coincidencia clara por debajo del umbral: devuelve el cliente", () => {
    const candidate = [0, 0, 0];
    const enrolled = [{ clientId: "c1", embedding: [0.01, 0, 0] }];
    expect(findBestMatch(candidate, enrolled, 0.5)).toEqual({ clientId: "c1", distance: 0.01 });
  });

  it("2. distancia justo en el umbral: no hay coincidencia (límite exclusivo)", () => {
    const candidate = [0, 0, 0];
    const enrolled = [{ clientId: "c1", embedding: [0.5, 0, 0] }];
    expect(findBestMatch(candidate, enrolled, 0.5)).toBeNull();
  });

  it("3. ningún rostro enrolado: null sin comparar nada", () => {
    expect(findBestMatch([0, 0, 0], [], 0.5)).toBeNull();
  });

  it("4. dos candidatos parecidos: devuelve el de menor distancia, no el primero", () => {
    const candidate = [0, 0, 0];
    const enrolled = [
      { clientId: "lejano", embedding: [0.3, 0, 0] },
      { clientId: "cercano", embedding: [0.05, 0, 0] },
    ];
    expect(findBestMatch(candidate, enrolled, 0.5)).toEqual({ clientId: "cercano", distance: 0.05 });
  });

  it("5. mejor candidato por encima del umbral: null, no se conforma con 'el menos malo'", () => {
    const candidate = [0, 0, 0];
    const enrolled = [
      { clientId: "c1", embedding: [1, 0, 0] },
      { clientId: "c2", embedding: [2, 0, 0] },
    ];
    expect(findBestMatch(candidate, enrolled, DEFAULT_FACE_MATCH_THRESHOLD)).toBeNull();
  });
});
