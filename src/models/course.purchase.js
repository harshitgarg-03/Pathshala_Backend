import mongoose from "mongoose";

const CoursePurchaseSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      min: [0, "amout must be non-negative"],
      required: [true, "Purechase amount is required"],
    },
    currency: {
      type: String,
      uppercase: true,
      required: [true, "Currency  is required"],
      default: "USD",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "completed", "failed", "refunded"],
        message: "Please select a valid status ",
      },
      default: "pending",
    },

    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
    },
    paymentId: {
      type: String,
      required: [true, "Payment id is required"],
    },
    refundid: {
      type: String,
    },
    refundAmount: {
      type: String,
    },
    refundreason: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);


CoursePurchaseSchema.index({user:1, course:1})
CoursePurchaseSchema.index({status: 1})
CoursePurchaseSchema.index({createdAt : -1})

CoursePurchaseSchema.virtual('isRefundable').get(function() {
    if(this.status !== 'completed') return false;
    const ThirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000)
    return this.createdAt > ThirtyDaysAgo;
})

CoursePurchaseSchema.methods.processRefund= async function(reason, amount) {
    this.status = "refunded",
    this.reason = reason,
    this.refundAmount = amount || this.amount
    return this.save();
}

export const coursePurchase = mongoose.models.Course-purchase || mongoose.model("Course-purchase", CoursePurchaseSchema);