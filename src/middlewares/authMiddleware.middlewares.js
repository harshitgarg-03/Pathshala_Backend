import { UserModel } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { permissions } from "../utils/permissions.js";

export const auth = asyncHandler( async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!token) throw new ApiError(401, "Unauthorized request"); 

    try {
        const decode = jwt.verify(token, process.env.ACCESS_JWT_SECRET);

        const user = await UserModel.findById(decode?._id).select(
            "-password -verificationToken -resetPasswordToken -refreshToken"
        )

        if(!user) throw new ApiError(401, "Invalid access token");

        req.user = user;
        req.role = user.role;
        req.permissions = permissions[user.role] || [];
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid access token");
    }
});