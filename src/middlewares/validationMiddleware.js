import { z } from "zod";

const UserSchema = z.object({
    name: z
        .string({ message: "Invalid name!" })
        .trim()
        .min(3, { message: "Name must be at least 3 characters long!" })
        .max(15, { message: "Name must be at most 15 characters long!" }),

    email: z.preprocess(
        (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
        z.email({ message: "Invalid email address" })
    ),

    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(64, { message: "Password must be at most 64 characters long" })
        .regex(/[A-Z]/, {
            message: "Password must contain at least one uppercase letter",
        })
        .regex(/[a-z]/, {
            message: "Password must contain at least one lowercase letter",
        })
        .regex(/[0-9]/, { message: "Password must contain at least one number" })
        .regex(/[@$!%*?&#]/, {
            message:
                "Password must contain at least one special character (@, $, !, %, *, ?, &, #)",
        }),
});

const PasswordSchema = z.object({
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(64, { message: "Password must be at most 64 characters long" })
        .regex(/[A-Z]/, {
            message: "Password must contain at least one uppercase letter",
        })
        .regex(/[a-z]/, {
            message: "Password must contain at least one lowercase letter",
        })
        .regex(/[0-9]/, { message: "Password must contain at least one number" })
        .regex(/[@$!%*?&#]/, {
            message:
                "Password must contain at least one special character (@, $, !, %, *, ?, &, #)",
        }),
})

const ValidationMiddleware = (req, res, next) => {
    const { name, email, password, role } = req.body;
    const result = UserSchema.safeParse({ name, email, password });
    if (!result.success) {
        return res.status(400).json({ errors: result.error.format() });
    }
    req.validateData = result.data;
    req.role = role;
    next();
};

const passwordValidator = (req, res, next) => {
    const { newPassword } = req.body;
    
    const result = PasswordSchema.safeParse({ password: newPassword });
    if (!result.success) {
        return res.status(400).json({ errors: result.error.format() });
    }
    next();
}

export { ValidationMiddleware, passwordValidator };
