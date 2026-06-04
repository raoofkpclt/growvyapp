import { Upload } from "@aws-sdk/lib-storage";
import { s3, bucketName } from "../config/s3bucket/s3";

export const uploadFile = async (file: File) => {
  try {
    console.log("01")
    const fileName = `${Date.now()}-${file.name}`;

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: fileName,
        Body: file,
        ContentType: file.type,
      },
    });
console.log("02")
    await upload.done();
console.log("03")
    return `https://${bucketName}.s3.ap-south-1.amazonaws.com/${fileName}`;
  } catch (error) {
    console.log("S3 Upload Error:", error);
    throw error;
  }
};