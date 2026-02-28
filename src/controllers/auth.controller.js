import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/user.model.js";
import crypto from "crypto";
import {uploadOnCloud} from '../services/fileUploder.services.js'
import jwt from "jsonwebtoken";
import {
  sendEmail,
  emailVerificationContent,
  forgotPasswordContent,
} from "../services/sendMail.services.js";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI,
);

export const googleAuth = async (req, res) => {
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["profile", "email"],
  });
  res.json({ url });
};

export const googleCallback = async (req, res) => {
  const { code } = req.query;
  const { tokens } = await client.getToken(code);

  const googleRes = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    },
  );

  console.log("user logged in", googleRes.data);
  
  const { email, name, picture } = googleRes.data;

  let user = await UserModel.findOne({ email });
  
  // await usersave({validateBeforeSave : false});
  if (!user) {
    user = await UserModel.create({
      name,
      email,
      avatar: picture,
      isVerified: true,
      provider: "google",
      refreshToken: tokens?.refresh_token,
    });
  }
  
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };
  res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .redirect(`http://localhost:5173/oauth?token=${accessToken}`);
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await UserModel.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token.",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validateData;
  const role = req.role;
  // avoid duplicate user
  const isExist = await UserModel.findOne({ email });
  if (isExist) throw new ApiError(409, "User already exists", []);

  // add in db
  const newUser = await UserModel.create({
    email,
    name,
    password,
    isVerified: false,
    role,
    provider: "local",
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    newUser.generateTempToken();

  newUser.verificationToken = hashedToken;
  newUser.verificationTokenExpire = tokenExpiry;

  await newUser.save({ validateBeforeSave: false });

  // Send mail
  await sendEmail({
    email: newUser.email,
    subject: "Plesase verify your email.",
    mailgenContent: emailVerificationContent(
      newUser.name,
      `${req.protocol}://${req.get("host")}/api/v1/user/verify-email/${unHashedToken}`,
    ),
  });

  const data = await UserModel.findById(newUser._id).select(
    "-password -verificationToken -resetPasswordToken -refreshToken",
  );

  if (!data)
    throw new ApiError(500, "Something went wrong while Register a User.");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: data },
        "User added successfully and verification email send",
      ),
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ApiError(400, "Email and Password is required.");

  const user = await UserModel.findOne({ email }).select("+password");

  if (!user) throw new ApiError(400, "User does not exists!");

  //   if google user tries to manual login

  if (user.provider === "google") {
    return res.status(400).json({
      message: "please login with google ",
    });
  }
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(400, "Invalid Password");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await UserModel.findById(user._id).select(
    "-password -verificationToken -resetPasswordToken -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
        },
        "User logged in successfully.",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out."));
});

const getCurrentUser = asyncHandler(async (req, res) => {  
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched successfully."));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken)
    throw new ApiError(400, "Email verfication token is missing.");

  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await UserModel.findOne({
    verificationToken: hashedToken,
    verificationTokenExpire: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, "Token is invalid or expired");

  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  user.isVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
      },
      "Email is verified",
    ),
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user?._id);

  if (!user) throw new ApiError(404, "User does not exist");

  if (user.isVerified) throw new ApiError(409, "Email is already verified.");

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTempToken();
  user.verificationToken = hashedToken;
  user.verificationTokenExpire = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email.",
    mailgenContent: emailVerificationContent(
      user?.name,
      `${req.protocol}://${req.get("host")}/api/v1/user/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your email ID."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized access");

  try {
    const decode = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_JWT_SECRET,
    );
    const user = await UserModel.findById(decode?._id);
    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    user.refreshToken = newRefreshToken;

    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed.",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token.");
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });

  if (!user) throw new ApiError(404, "User does not exists");

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTempToken();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Password reset request.",
    mailgenContent: forgotPasswordContent(
      user?.name,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent on your mail.",
      ),
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password: newPassword } = req.body;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await UserModel.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(409, "Token is invalid or expired.");
  }

  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  console.log(req.body);
  
  const user = await UserModel.findById(req.user?._id).select("+password");
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) throw new ApiError(400, "Invalid old Password.");

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully."));
});

const UpdateProfile = asyncHandler(async (req, res) => {
  const {_id} = req.user;
  const {firstname, lastname, email} = req.body;

  let update = {}
  if(email) {
    update.email = email;
  }
  if(firstname && lastname) {
    
    const fullname = `${firstname} ${lastname}`;
    console.log(fullname);
    update.name  = fullname;
  }
  if(req.file) {
    console.log("update avatar", req.file.path.avatar);
    const file = req.file;
    const avatar = await uploadOnCloud(file.path);
    if (!avatar) throw new ApiError(404, "Failed to upload on cloud.");
    update.avatar = avatar.url;
  }

  const updatedUser = await UserModel.findByIdAndUpdate(_id, update, { new: true });
  if (!updatedUser) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User update successfully"));
})

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPassword,
  resetForgotPassword,
  changeCurrentPassword,
  UpdateProfile
};
