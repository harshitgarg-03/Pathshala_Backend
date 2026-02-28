import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const Schema = mongoose.Schema;

const user = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
      required: true,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    avatar: { type: String },
    bio: { type: String },
    enrolledCourse: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    teachingCourse: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpire: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true },
);

user.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

user.methods.isPasswordCorrect = async function (password) {
  console.log("OLD: ", password);
  console.log("USER PASS: ", this.password);
  
  return await bcrypt.compare(password, this.password);
};

user.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    process.env.ACCESS_JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

user.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    process.env.REFRESH_JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

user.methods.generateTempToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");

  const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 min
  return { unHashedToken, hashedToken, tokenExpiry };
};

export const UserModel = mongoose.model("User", user);
