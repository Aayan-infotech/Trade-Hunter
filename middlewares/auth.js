const jwt = require("jsonwebtoken");
const User = require("../models/hunterModel");
const Provider = require("../models/providerModel");

const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({err, message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: 401,
      message: ["Unauthorized access."],
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.user = {
      id: decoded._id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: ["expired token. Please login again."],
    });
  }
};

// const refreshToken = async (req, res) => {
//   try {
//     const { refreshToken, userType } = req.body;
//     const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

//     let user;
//     if (userType === "hunter") {
//       user = await User.findOne({ _id: decoded.userId, refreshToken });
//     }

//     if (userType === "provider") {
//       user = await Provider.findOne({ _id: decoded.userId, refreshToken });
//     }

//     if (!user) {
//       return res.status(403).json({
//         status: 403,
//         message: ["Invalid refresh token."],
//       });
//     }

//     const newAccessToken = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "24h" }
//     );

//     return res.status(200).json({
//       status: 200,
//       message: ["New access token generated."],
//       accessToken: newAccessToken,
//     });
//   } catch (error) {
//     return res.status(403).json({
//       status: 403,
//       message: error.message,
//     });
//   }
// };

const refreshToken = async (req, res) => {
  try {
    const { refreshToken, userType } = req.body;
    if (!refreshToken || !userType) {
      return res.status(400).json({ status: 400, message: ["Missing required fields."] });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    let userModel = userType === "hunter" ? Hunter : Provider;
    
    const user = await userModel.findOne({ _id: decoded.userId, refreshToken });
    if (!user) {
      return res.status(403).json({
        status: 403,
        message: ["Invalid refresh token."],
      });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Update the token field in the database
    user.token = newAccessToken;
    await user.save();

    return res.status(200).json({
      status: 200,
      message: ["New access token generated."],
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(403).json({
      status: 403,
      message: error.message,
    });
  }
};

module.exports = {
  verifyUser,
  authenticateUser,
  refreshToken,
};
