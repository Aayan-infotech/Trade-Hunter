require("dotenv").config();

const { S3, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secretsManagerClient = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});

const getAwsCredentials = async () => {
  try {
    const command = new GetSecretValueCommand({ SecretId: "aayan-config" });
    const data = await secretsManagerClient.send(command);

    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);
      return {
        accessKeyId: secret.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:
          secret.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
  } catch (error) {
    throw new Error("Failed to retrieve AWS credentials");
  }
};

const getS3Client = async () => {
  try {
    const credentials = await getAwsCredentials();
    return new S3({
      credentials, // use the credentials from Secrets Manager
      region: process.env.AWS_REGION,
    });
  } catch (error) {
    throw error;
  }
};

const uploadToS3 = async (req, res, next) => {
  if (!req.file) {
    console.log("No file uploaded, skipping S3 upload.");
    return next();
  }

  const s3 = await getS3Client();
  try {
    const file = req.file;
    const files = Array.isArray(file) ? file : [file];
    const fileLocations = [];

    for (const file of files) {
      console.log("Uploading file:", file.originalname);
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // Use AWS SDK v3's command-based approach
      await s3.send(new PutObjectCommand(params));
      const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
      console.log("Uploaded file URL:", fileUrl);
      fileLocations.push(fileUrl);
    }

    req.fileLocations = fileLocations;
    next();
  } catch (uploadError) {
    console.error("S3 upload error:", uploadError);
    return res.status(500).send(uploadError.message);
  }
};

module.exports = { uploadToS3 };
