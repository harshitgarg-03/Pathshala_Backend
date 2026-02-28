import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "PATHSHALA",
            link: "http://localhost:3000/"
        }
    });

    const mailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
    const mailHtml = mailGenerator.generate(options.mailgenContent);

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",     // Gmail SMTP host
        port: 465,                  // 465 for secure, 587 for TLS
        secure: true,               // true for port 465, false for 587
        auth: {
            user: process.env.EMAIL_USER, // Your email
            pass: process.env.EMAIL_PASS, // App password (not your normal Gmail password)
        },
    });

    const mail = {
        from: "unknow.user.track@gamil.com",
        to: options.email,
        subject: options.subject,
        text: mailTextual,
        html: mailHtml
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {
        console.error("Email Service faild: ", error);
    }
}

const emailVerificationContent = (name, verificationUrl) => {
    return {
        body: {
            name: name,
            intro: "Welcome to our App! we'are excited to have you on board.",
            action: {
                instruction: "To verify your email please click on the following button",
                button: {
                    color: "#11fc11ff",
                    text: "Verify your email",
                    link: verificationUrl
                }
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
        }
    }
}

const forgotPasswordContent = (name, passwordResetUrl) => {
    return {
        body: {
            name: name,
            intro: "We got a request to reset the password of your account.",
            action: {
                instruction: "To reset your password click on the following button or link",
                button: {
                    color: "rgba(48, 236, 48, 0.67)",
                    text: "Reset password",
                    link: passwordResetUrl
                }
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
        }
    }
}

export { emailVerificationContent, forgotPasswordContent, sendEmail };