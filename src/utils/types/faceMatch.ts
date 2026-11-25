/**
 * Face matching in the browser (face-api). Loaded only when first needed.
 * Models live in /public/models.
 */
type FaceApi = typeof import("@vladmandic/face-api");

export const FACE = {
  modelsPath: "/models",
  /** lower = stricter. 0.6 is the library default; 0.5 is a good balance */
  maxDistance: 0.5,
};

export type FaceState =
  | "matched"
  | "mismatch"
  | "no_face"
  | "multiple_faces"
  | "no_reference" // staff has no usable profile photo: allowed, but flagged for HR
  | "error"; // face check unavailable: allowed, but flagged for HR

export type FaceResult = { state: FaceState; distance: number | null };

/** these results stop check-in; the others are allowed but flagged for HR review */
export const BLOCKING: FaceState[] = ["mismatch", "no_face", "multiple_faces"];

let api: Promise<FaceApi> | null = null;

// export const loadFaceApi = (): Promise<FaceApi> => {
//   if (!api) {
//     api = (async () => {
//       const faceapi = await import("@vladmandic/face-api");
//       await Promise.all([
//         faceapi.nets.tinyFaceDetector.loadFromUri(FACE.modelsPath),
//         faceapi.nets.faceLandmark68Net.loadFromUri(FACE.modelsPath),
//         faceapi.nets.faceRecognitionNet.loadFromUri(FACE.modelsPath),
//       ]);
//       return faceapi;
//     })().catch((e) => {
//       api = null; // allow a retry
//       throw e;
//     });
//   }
//   return api;
// };

const MODEL_SOURCES = [
  "/models",
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model",
];

export const loadFaceApi = (): Promise<FaceApi> => {
  if (!api) {
    api = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      let lastErr: unknown;

      for (const path of MODEL_SOURCES) {
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(path),
            faceapi.nets.faceLandmark68Net.loadFromUri(path),
            faceapi.nets.faceRecognitionNet.loadFromUri(path),
          ]);
          return faceapi;
        } catch (e) {
          lastErr = e; // try the next source
        }
      }
      throw new Error(
        "Face models could not be loaded. " +
          (lastErr instanceof Error ? lastErr.message : "")
      );
    })().catch((e) => {
      api = null; // allow a retry
      throw e;
    });
  }
  return api;
};

const describe = async (input: HTMLImageElement | HTMLCanvasElement) => {
  const faceapi = await loadFaceApi();
  return faceapi
    .detectAllFaces(
      input,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();
};

// const loadImage = (url: string) =>
//   new Promise<HTMLImageElement>((resolve, reject) => {
//     const img = new Image();
//     img.crossOrigin = "anonymous";
//     img.onload = () => resolve(img);
//     img.onerror = () =>
//       reject(new Error("Could not load the profile photo (check the S3 CORS rule)."));
//     // cache-buster so a cached non-CORS copy of the image isn't reused
//     img.src = url + (url.includes("?") ? "&" : "?") + "cors=1";
//   });
const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Could not load the profile photo (check the S3 CORS rule)."));
    // cache-buster: any name except S3 sub-resource names (cors, acl, policy, versions…)
    img.src = url + (url.includes("?") ? "&" : "?") + "cb=1";
  });

const referenceCache = new Map<string, Float32Array | null>();

/** Face descriptor of the staff profile photo (cached). null = no face in the photo. */
export async function loadReference(url: string): Promise<Float32Array | null> {
  if (referenceCache.has(url)) return referenceCache.get(url)!;
  const faces = await describe(await loadImage(url));
  const d = faces.length ? faces[0].descriptor : null;
  referenceCache.set(url, d);
  return d;
}

/** Compare a selfie (canvas) with the reference descriptor */
export async function compareFace(
  selfie: HTMLCanvasElement,
  reference: Float32Array | null
): Promise<FaceResult> {
  const faces = await describe(selfie);
  if (faces.length === 0) return { state: "no_face", distance: null };
  if (faces.length > 1) return { state: "multiple_faces", distance: null };
  if (!reference) return { state: "no_reference", distance: null };

  const faceapi = await loadFaceApi();
  const distance = faceapi.euclideanDistance(reference, faces[0].descriptor);
  return {
    state: distance <= FACE.maxDistance ? "matched" : "mismatch",
    distance: Math.round(distance * 1000) / 1000,
  };
}