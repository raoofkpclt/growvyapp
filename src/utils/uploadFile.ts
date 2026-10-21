import { Upload } from "@aws-sdk/lib-storage";
import { s3, bucketName } from "../config/s3bucket/s3";

const REGION = "ap-south-1";

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const publicUrl = (key: string) =>
  `https://${bucketName}.s3.${REGION}.amazonaws.com/${key}`;

/** Images and other small files. */
export const uploadFile = async (file: File): Promise<string> => {
  const key = `${Date.now()}-${safeName(file.name)}`;

  try {
    await new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: file.type,
      },
    }).done();

    return publicUrl(key);
  } catch (error) {
    console.log("S3 Upload Error:", error);
    throw error;
  }
};

export const uploadVideo = async (
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `reels/videos/${Date.now()}-${safeName}`;

  const upload = new Upload({
    client: s3,
    params: { Bucket: bucketName, Key: key, Body: file, ContentType: file.type },
    partSize: 10 * 1024 * 1024,
    queueSize: 4,
    leavePartsOnError: false,
  });

  upload.on("httpUploadProgress", (p) => {
    if (p.loaded && p.total) {
      onProgress?.(Math.round((p.loaded / p.total) * 100));
    }
  });

  signal?.addEventListener("abort", () => upload.abort());

  await upload.done();

  return `https://${bucketName}.s3.ap-south-1.amazonaws.com/${key}`;
};

/** Large videos: multipart upload with progress + cancel support. */
// export const uploadVideo = async (
//   file: File,
//   onProgress?: (percent: number) => void,
//   signal?: AbortSignal,
// ): Promise<string> => {
//   const key = `reels/videos/${Date.now()}-${safeName(file.name)}`;

//   const upload = new Upload({
//     client: s3,
//     params: {
//       Bucket: bucketName,
//       Key: key,
//       Body: file,
//       ContentType: file.type || "video/mp4",
//     },
//     partSize: 10 * 1024 * 1024, // 10 MB parts
//     queueSize: 4, // 4 parts in parallel
//     leavePartsOnError: false, // clean up incomplete uploads
//   });

//   upload.on("httpUploadProgress", (p) => {
//     if (p.loaded && p.total) {
//       onProgress?.(Math.round((p.loaded / p.total) * 100));
//     }
//   });

//   const onAbort = () => upload.abort();
//   signal?.addEventListener("abort", onAbort);

//   try {
//     await upload.done();
//     return publicUrl(key);
//   } catch (error) {
//     console.log("S3 Video Upload Error:", error);
//     throw error;
//   } finally {
//     signal?.removeEventListener("abort", onAbort);
//   }
// };




// import { Upload } from "@aws-sdk/lib-storage";
// import { s3, bucketName } from "../config/s3bucket/s3";

// export const uploadFile = async (file: File) => {
//   try {
//     console.log("01")
//     const fileName = `${Date.now()}-${file.name}`;

//     const upload = new Upload({
//       client: s3,
//       params: {
//         Bucket: bucketName,
//         Key: fileName,
//         Body: file,
//         ContentType: file.type,
//       },
//     });
// console.log("02")
//     await upload.done();
// console.log("03")
//     return `https://${bucketName}.s3.ap-south-1.amazonaws.com/${fileName}`;
//   } catch (error) {
//     console.log("S3 Upload Error:", error);
//     throw error;
//   }
// };

// export const uploadVideo = async (
//   file: File,
//   onProgress?: (percent: number) => void,
//   signal?: AbortSignal,
// ): Promise<string> => {
//   const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
//   const key = `reels/videos/${Date.now()}-${safeName}`;

//   const upload = new Upload({
//     client: s3,
//     params: { Bucket: BUCKET, Key: key, Body: file, ContentType: file.type },
//     partSize: 10 * 1024 * 1024, // 10 MB parts
//     queueSize: 4, // 4 parts in parallel
//     leavePartsOnError: false, // clean up incomplete uploads
//   });

//   upload.on("httpUploadProgress", (p) => {
//     if (p.loaded && p.total) {
//       onProgress?.(Math.round((p.loaded / p.total) * 100));
//     }
//   });

//   signal?.addEventListener("abort", () => upload.abort());

//   await upload.done();

//   return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
// };