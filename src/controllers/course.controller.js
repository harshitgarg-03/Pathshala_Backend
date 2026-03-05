import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  CourseModel,
  LectureModel,
  SectionModel,
} from "../models/course.model.js";
import { uploadOnCloud } from "../services/fileUploder.services.js";
import { coursePurchase } from "../models/course.purchase.js";


export const createCourse = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title, description, price, category, level, language, status } =
    req.body;

  let thumbnailUrl = null;

  if (req.file?.path) {
    thumbnailUrl = await uploadOnCloud(req.file.path);
    console.log("thumb", thumbnailUrl.url);
  } else {
    throw new ApiError(400, "Thumbnail is required!");
  }

  if (
    !title ||
    !description ||
    !price ||
    !category ||
    !level ||
    !language ||
    !status
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const newCourse = await CourseModel.create({
    title,
    description,
    language,
    price: price,
    category,
    level,
    status,
    thumbnail: thumbnailUrl?.url,
    instructor: user._id,
  });

  res
    .status(200)
    .json(new ApiResponse(200, newCourse, "course added successfully."));
});

// Student
export const getCourse = asyncHandler(async (req, res) => {
  const {
    search, //title
    category,
    level, 
    language,
    minPrice,
    maxPrice,
    sortBy,
    page = 1,
    limit = 10,
  } = req.query;

  const filters = { status: "Published" };

  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (category) filters.category = { $in: [category] };
  if (level) filters.level = level;
  if (language) filters.language = language;
  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = Number(minPrice);
    if (maxPrice) filters.price.$lte = Number(maxPrice);
  }

  let sort = { createdAt: -1 };
  if (sortBy === "price_low_high") sort = { price: 1 };
  if (sortBy === "price_high_low") sort = { price: -1 };
  if (sortBy === "rating") sort = { averageRating: -1 };

  const course = await CourseModel.find(filters)
    .populate("instructor", "name email avatar")
    .populate({
      path: "sections",
      select: "_id title description",
    })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort(sort);

  const totalCourses = await CourseModel.countDocuments(filters);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        course,
        pagination: {
          total: totalCourses,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalCourses / limit),
        },
      },
      "Courses fetched successfully",
    ),
  );
});

// Admin
export const getAllCourse = asyncHandler(async (req, res) => {
  // const {
  //     search, //title
  //     category,
  //     level,
  //     language,
  //     sortBy,
  //     page = 1,
  //     limit = 10,
  //     status //Admin can filter by status
  // } = req.query;

  // const filters = {};

  // if (search) {
  //     filters.$or = [
  //         { title: { $regex: search, $options: "i" } },
  //         { description: { $regex: search, $options: "i" } },
  //     ];
  // };

  // if (category) filters.category = { $in: [category] };
  // if (level) filters.level = level;
  // if (language) filters.language = language;
  // if (status) filters.status = status;

  // let sort = { createdAt: -1 };
  // if (sortBy === "price_low_high") sort = { price: 1 };
  // if (sortBy === "price_high_low") sort = { price: -1 };
  // if (sortBy === "rating") sort = { averageRating: -1 };

  const filters = { status: "published" };
  const course = await CourseModel.find()
    .populate("instructor", "name email avatar")
    .populate({
      path: "sections",
      select: "_id title description",
      populate: {
        path: "lectures",
      },
    })
    .sort({ createdAt: -1 });
  // .skip((Number(page) - 1) * Number(limit))
  // .limit(Number(limit))

  const totalCourses = await CourseModel.countDocuments(filters);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        course,
        // pagination: {
        //     total: totalCourses,
        //     page: Number(page),
        //     limit: Number(limit),
        //     totalPages: Math.ceil(totalCourses / limit),
        // }
      },
      "Courses fetched successfully",
    ),
  );
});

export const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  const course = await CourseModel.findById(courseId);
  if (!course) throw new ApiError(400, "Course not found.");

  const { title, description, price, category, level, language, status } = req.body;
  
  // console.log(
  //   "backend data ",
  //   title,
  //   description,
  //   price,
  //   category,
  //   level,
  //   language,
  //   status,
  // );

  if (req.file?.path) {
    const thumbnail = await uploadOnCloud(req.file.path);
    course.thumbnail = thumbnail.url;
    // console.log(thumbnail);
  }
  
  if (title) course.title = title;
  if (description) course.description = description;
  if (language) course.language = language;
  if (level) course.level = level;
  if (price) course.price = Number(price);
  if (status) course.status = status;
  if (category)
    course.category = Array.isArray(category) ? category : category.split(",");

  await course.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course update successfully."));
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  console.log("del", courseId);
  
  const course = await CourseModel.findById(courseId);
  if (!course) throw new ApiError(400, "Course not found.");

  await CourseModel.findByIdAndDelete(courseId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Course delete successfully!"));
});

export const addSection = asyncHandler(async (req, res) => {
  const { title, description, order } = req.body;
  const { courseId } = req.params;

  //if (!title || !description || !order || !courseId) throw new ApiError(400, "All fields are required.");

  const isCourse = await CourseModel.findById(courseId);
  if (!isCourse) throw new ApiError(404, "Course not found");
  const isTitle = await SectionModel.findOne({ title, courseId });
  if (isTitle) throw new ApiError(409, "Duplicate title");

  const newSection = await SectionModel.create({
    title,
    description,
    order,
    courseId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, newSection, "Section add successfully."));
});

export const updateSection = asyncHandler(async (req, res) => {
  const { title, description, order } = req.body;
  const { sectionId } = req.params;

  const update = {};
  if (title) update.title = title;
  if (description) update.description = description;
  if (order) update.order = order;

  const section = await SectionModel.findByIdAndUpdate(
    sectionId,
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!section) throw new ApiError(404, "Section not found");

  return res.status(200).json(new ApiResponse(200, section, "Section updated"));
});

export const deleteSection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;

  if (!sectionId) throw new ApiError(404, "Section not found.");
  const section = await SectionModel.findByIdAndDelete(sectionId);

  if (!section) throw new ApiError(404, "Section not found.");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Section delete successfully."));
});

export const addLecture = asyncHandler(async (req, res) => {
  const { title, duration, order, isPreviewFree, sectionId } = req.body;
  const { courseId } = req.params;
  const user = req.user;
  // console.log(title, duration, order, isPreviewFree, courseId, sectionId);

  if (!courseId || !sectionId)
    throw new ApiError(400, "Course ID and Section ID are required!");
  if (!title || duration == null || order == null) {
    throw new ApiError(
      400,
      "Title, description, duration, and order are required!",
    );
  }

  // Upload all files in parallel
  let videoUrl = null;
  let pdfUrl = null;

  if (req.files?.video) {
    videoUrl = await uploadOnCloud(req.files.video[0].path);
    if (!videoUrl.url) {
      throw new ApiError(404, "Video not found .!");
    }
  }

  if (req.files?.pdf) {
    pdfUrl = await uploadOnCloud(req.files.pdf[0].path);
    if (!pdfUrl.url) {
      throw new ApiError(404, "Pdf not found!");
    }
  }

  const newLecture = await LectureModel.create({
    videoUrl: videoUrl?.url,
    // thumbnail: thumbnailUrl.url,
    // videoPublicId: videoUrl.public_id,
    // thumbnailPublicId: thumbnailUrl.public_id,
    title,
    duration,
    courseId,
    isPreviewFree,
    sectionId,
    instructor: user._id,
    resourceFiles: pdfUrl?.url || null,
    order,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newLecture, "Lecture added successfully."));
});

export const updateLecture = asyncHandler(async (req, res) => {
  const { title, description, duration, order } = req.body;
  const { lectureId } = req.params;

  if (!lectureId) throw new ApiError(404, "Lecture Id not found!");

  const update = {};
  if (req.files.video[0].path) {
    const videoUrl = await uploadOnCloud(req.files.video[0].path);
    update.videoUrl = videoUrl.url;
    update.videoPublicId = videoUrl.public_id;
  }

  if (req.files.thumbnail[0].path) {
    const thumbnail = await uploadOnCloud(req.files.thumbnail[0].path);
    update.thumbnail = thumbnail.url;
    update.thumbnailPublicId = thumbnail.public_id;
  }

  if (req.files.pdf[0].path) {
    const pdfUrl = await uploadOnCloud(req.files.pdf[0].path);
    update.resourceFiles = pdfUrl.url;
  }

  if (title) update.title = title;
  if (description) update.description = description;
  if (duration) update.duration = duration;
  if (order) update.order = order;

  const lecture = await LectureModel.findByIdAndUpdate(
    lectureId,
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!lecture) throw new ApiError(404, "Lecture not found");

  return res
    .status(200)
    .json(new ApiResponse(200, lecture, "Lecture update successfully."));
});

export const deleteLecture = asyncHandler(async (req, res) => {
  const { lectureId } = req.params;

  const lecture = await LectureModel.findByIdAndDelete(lectureId);
  if (!lecture) throw new ApiError(400, "Lecture not found.");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Lecture delete successfully."));
});

export const getPublishedCourse = asyncHandler(async (req, res) => {
  const filters = { status: "Published" };
  const course = await CourseModel.find(filters)
    .populate("instructor", "name email avatar")
    .populate({
      path: "sections",
      select: "_id title description",
      populate: {
        path: "lectures",
      },
    })
    .sort({ createdAt: -1 });
  // .skip((Number(page) - 1) * Number(limit))
  // .limit(Number(limit))

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        course,
        // pagination: {
        //     total: totalCourses,
        //     page: Number(page),
        //     limit: Number(limit),
        //     totalPages: Math.ceil(totalCourses / limit),
        // }
      },
      "Courses fetched successfully",
    ),
  );
});

export const getPurchasedCourse = asyncHandler(async (req, res) => {
  const filter = { status: "succeeded", user: req.user._id};
  const purchasedCourse = await coursePurchase.find(filter).populate(
    {path: "course",
      select: "title description discount thumbnail price reviews averageRating _id sections",
      populate: {
        path: "sections",
        select: "title _id lectures",
        populate: {
          path: "lectures",
          select: "title, +videoUrl"
        }
      }
    })
    console.log(purchasedCourse);
    
  //console.log("purchase course backend", JSON.stringify(purchasedCourse[0].course, null, 2));
  
  
  return res.status(200).json(
    new ApiResponse(200, 
      purchasedCourse
    ,
    "Purchased course Fetched success "
  )
  )
});

