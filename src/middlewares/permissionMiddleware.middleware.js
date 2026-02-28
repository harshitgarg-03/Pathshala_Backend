import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

export const allowPermission = asyncHandler((...requiredPermission) => {
    return async (req, res, next) => {
        if (!req.role && !req.permission) throw new ApiError(401, "Unauthorized: No user context");

        if (req.user.permissions.includes("ALL")) {
            return next(); // admin full access
        }

        const hasPermission = requiredPermission.every(p => req.user.permissions.includes(p) );

        if (!hasPermission) {
            throw new ApiError(403, "Forbidden: You do not have required permissions");
        }
        next();
    }
})