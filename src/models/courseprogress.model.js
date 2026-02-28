import mongoose from "mongoose";

const Schema = mongoose.Schema;

const lectureProgressSchema = new Schema(
  {
    lecture: {
      type: mongoose.Types.ObjectId,
      ref: "Lecture",
      required: [true, "lecture reference required"],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    watchTime: {
      type: Number,
      default: 0,
    },
    LastWatched: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const CourseProgressSchema = new Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "User reference required"],
    },
    course: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference required"],
    },

    CourseProgress: [lectureProgressSchema],
    CourseCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    LastAccessed: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CourseProgressSchema.methods.updateLastAccessed = async function () {
  this.LastAccessed = Date.now();
  await this.save();
};

CourseProgressSchema.pre("save", function (next) {
  if (lectureProgressSchema.length > 0) {
    const completedLecture = lectureProgressSchema.filter(
      (lp) => lp.isCompleted,
    ).length;
    const CourseProgress = Math.round(
      (completedLecture / this.lectureProgressSchema.length) * 100,
    );
    this.CourseCompletion = CourseProgress;
    this.isCompleted = CourseCompletion === 100;
  }
  next();
});

export const courseProgressModel = mongoose.models.Course-Progress || mongoose.model("Course-Progress", CourseProgressSchema);