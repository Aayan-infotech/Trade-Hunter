require("dotenv").config();

const { S3 } = require("@aws-sdk/client-s3");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secretsManagerClient = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});

const getAwsCredentials = async () => {
  try {
    const command = new GetSecretValueCommand({ SecretId: "aws-7jan" });
    const data = await secretsManagerClient.send(command);

    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);
      return {
        accessKeyId: secret.AWS_ACCESS_KEY_ID,
        secretAccessKey: secret.AWS_SECRET_ACCESS_KEY,
      };
    }
  } catch (error) {
    console.error("Error fetching secrets:", error.message);
    throw new Error("Failed to retrieve AWS credentials");
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
      region: process.env.AWS_REGION,
    });
  } catch (error) {
    console.error("Error initializing S3:", error.message);
    throw error;
  }
};

const uploadToS3 = async (req, res, next) => {
  const s3 = await getS3Client();

  try {
    const file = req.files;
    console.log("file:", file);

    const files = Array.isArray(file) ? file : [file];
    const fileLocations = [];

    for (const file of files) {
      console.log("file:", file);
      console.log("files:", files);
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${Date.now()}-${file.name}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3.putObject(params);
      const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
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
