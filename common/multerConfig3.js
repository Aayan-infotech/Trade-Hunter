require("dotenv").config();

const { S3 } = require("@aws-sdk/client-s3");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const secretsManagerClient = new SecretsManagerClient({ region: "us-east-1" });

const getAwsCredentials = async () => {
  try {
    const command = new GetSecretValueCommand({ SecretId: "aws-secret-curd" });
    const data = await secretsManagerClient.send(command);

    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);
      return {
        accessKeyId: secret.AWS_ACCESS_KEY_ID,
        secretAccessKey: secret.AWS_SECRET_ACCESS_KEY,
      };
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

const getS3Client = async () => {
  try {
    const credentials = await getAwsCredentials();
    return new S3({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      region: "us-east-1",
    });
  } catch (error) {
    console.error("Error initializing S3:", error.message);
    throw error;
  }
};

const uploadToS3 = async (req, res, next) => {
  try {
    const s3 = await getS3Client();

    if (!req.files || Object.keys(req.files).length === 0) {
      return next(); // nothing to upload
    }

    const allFiles = [];

    for (const key in req.files) {
      const value = req.files[key];
      if (Array.isArray(value)) {
        allFiles.push(...value);
      } else {
        allFiles.push(value);
      }
    }

    const fileUrls = [];
    const uploadedFileObjects = [];

    for (const file of allFiles) {
      if (!file) continue;

      // ✅ Check type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({
          message: `Unsupported file type: ${file.mimetype}`,
        });
      }

      // ✅ Check size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          message: `File "${file.name}" exceeds 5MB size limit.`,
        });
      }

      const fileKey = `${Date.now()}-${file.name}`;
      const params = {
        Bucket: "internal-n0wsvav8",
        Key: fileKey,
        Body: file.data,
        ContentType: file.mimetype,
      };

      await s3.putObject(params);
      const fileUrl = `https://tradehunters.s3.us-east-1.amazonaws.com/${fileKey}`;
      fileUrls.push(fileUrl);

      uploadedFileObjects.push({
        filename: fileKey,
        path: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
        originalname: file.name,
      });
    }

    // ✅ Backward compatibility
    req.files = fileUrls;

    // ✅ For use in controllers
    req.uploadedFileObjects = uploadedFileObjects;

    next();
  } catch (uploadError) {
    return res.status(500).json({ message: uploadError.message });
  }
};

module.exports = {
  uploadToS3,
};
