import Razorpay from "razorpay";
import crypto from "crypto";
import { CourseModel } from "../models/course.model.js";
import { coursePurchase } from "../models/course.purchase.js";
import { Stripe } from "stripe"

export const stripes = new Stripe(process.env.STRIPE_KEY_SECRET);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user;
    const { course } = req.body;
    
    const existCourse = await CourseModel.findById(course._id);
    if (!existCourse) return res.status(404).json({ message: "Course Not found" });

    const seesion = await stripes.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "INR",
            product_data: {
              name: existCourse.title,
            },
            unit_amount: existCourse.price*100
          },
          quantity: 1,
        },
      ],

      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",

      metadata: {
        courseId: String(existCourse._id),
        userId: String(req.user._id)
      }

    });
    res.json({ url: seesion.url})
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const verifyPayment = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;
  
  try {
    event = stripes.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET 
    );
    console.log("STATUS: try", event);
  } catch (error) {    
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }  
  if(event.type === "checkout.session.completed"){
    const session = event.data.object;

    const courseId = session.metadata.courseId;
    const userId = session.metadata.userId;

    await coursePurchase.create({
      course: courseId,
      user: userId,
      paymentId: session.payment_intent,
      amount: session.amount_total,
      currency: session.currency,
      paymentMethod: session.payment_method_types[0],
      status: session.status
    })
  }
  res.json({ received: true, dataStripe: event });
}

// RAZORPAY PAYMENT METHOD 
/*
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRTE,
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user;
    const { courseId } = req.body;
    console.log("id", courseId);
    
    const course = await CourseModel.findById(courseId);
    console.log("course model", course);
    if (!course) return res.status(404).json({ message: "Course Not found" });

    const newPurchase = new coursePurchase({
      course: courseId,
      user: userId,
      amount: course.price,
      status: "pending",
    });

    const options = {
      amount: course.price * 100,
      currency: "INR",
      receipt: `course_${courseId}`,
      notes: {
        courseId: courseId,
        userId: userId,
      },
    };

    const order = await razorpay.orders.create(options);

    newPurchase.paymentId = order.id;
    await newPurchase.save();

    res.status(200).json({
      success: true,
      order,
      course: {
        name: course.title,
        description: course.description,
      },
    });
  } catch (error) {}
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRTE)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
      return res.status(400).json({ message: "Payment Verification Failed " });
    }

    const purchase = await coursePurchase.findOne({
      paymentId: razorpay_order_id,
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase record not found" });
    }

    purchase.status = "completed";
    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      courseId: purchase.courseId,
    });
    
  } catch (error) {}
};
*/