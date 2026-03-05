import express, { Router } from "express";
import {
  createCheckoutSession,
  verifyPayment,
} from "../controllers/razorpay.controller.js";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getAllCourse,
  getCourse,
  addSection,
  addLecture,
  updateSection,
  updateLecture,
  deleteLecture,
  deleteSection,
  getPublishedCourse,
  getPurchasedCourse,
} from "../controllers/course.controller.js";
import {
  ValidationMiddleware,
  passwordValidator,
} from "../middlewares/validationMiddleware.js";
import { auth } from "../middlewares/authMiddleware.middlewares.js";
import { allowPermission } from "../middlewares/permissionMiddleware.middleware.js";
import { upload } from "../middlewares/multerMiddleware.middlewares.js";
const router = Router();

router.post("/createCourse", auth, upload.single("thumbnail"), createCourse);
router.put(
  "/updateCourse/:courseId",
  auth,
  upload.single("thumbnail"),
  updateCourse,
);
router.delete("/deleteCourse/:courseId", deleteCourse);
router.get("/getallCourse", auth, getAllCourse);

router.post(
  "/createLecture/:courseId/:sectionId",
  auth,
  upload.fields([
    { name: "video", maxCount: 1, minCount: 0 },
    { name: "pdf", maxCount: 1, minCount: 0 },
  ]),
  addLecture,
);
router.post("/createSection/:courseId", auth, addSection);
router.get("/get-published-courses", auth, getPublishedCourse);
router.post("/create-order", auth, createCheckoutSession);
router.get("/getPurchasedCourse", auth, getPurchasedCourse);
export default router;
