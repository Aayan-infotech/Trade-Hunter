require("dotenv").config();

const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");
const { S3 } = require("@aws-sdk/client-s3");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secretsManagerClient = new SecretsManagerClient({ region: 'us-east-1' });

const getAwsCredentials = async () => {
  try {
    const command = new GetSecretValueCommand({ SecretId:'aws-secret-curd' });
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
      region:'us-east-1',
    });
  } catch (error) {
    console.error('Error initializing S3:', error.message);
    throw error;
  }
};


const uploadToS3 = async (req, res, next) => {
  const s3 = await getS3Client();

  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    // Combine all uploaded fields (image, files, etc.) into a single array
    const allFiles = [];

    for (const key in req.files) {
      const value = req.files[key];
      if (Array.isArray(value)) {
        allFiles.push(...value);
      } else {
        allFiles.push(value);
      }
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-matroska',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const fileLocations = [];

    for (const file of allFiles) {
      if (!file || !allowedTypes.includes(file.mimetype)) {
        return res.status(400).send(`Unsupported file type: ${file?.mimetype}`);
      }

      const params = {
        Bucket: 'tradehunters',
        Key: `${Date.now()}-${file.name}`,
        Body: file.data,
        ContentType: file.mimetype,
      };

      await s3.putObject(params);
      const fileUrl = `https://tradehunters.s3.us-east-1.amazonaws.com/${params.Key}`;
      fileLocations.push(fileUrl);
    }

    // Attach file URLs to req.files
    req.files = fileLocations;
    next();
  } catch (uploadError) {
    return res.status(500).send(uploadError.message);
  }
};


module.exports={
  uploadToS3
}