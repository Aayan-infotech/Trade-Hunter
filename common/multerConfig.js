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
    const command = new GetSecretValueCommand({ SecretId: "aws-secret" });
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
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:  process.env.AWS_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_REGION,
    });
  } catch (error) {
    throw error;
  }
};

const uploadToS3 = async (req, res, next) => {
  const s3 = await getS3Client();

  try {
    // If no file is uploaded, simply proceed.
    if (!req.files || !req.files.image) {
      req.fileLocations = '';  //added new line
      return next();
    }

    console.log(req.file);
    const file = req.file;
    const files = Array.isArray(file) ? file : [file];
    const fileLocations = [];
    console.log(file);

    for (const file of files) {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${Date.now()}-${file.originalname}`,
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
    return res.status(500).send(uploadError.message);
  }
};



module.exports = { uploadToS3 };