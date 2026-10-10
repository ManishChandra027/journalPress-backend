import nodemailer from "nodemailer";
import ApiError from "./ApiError.js";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        await transporter.sendMail({
            from: `"JournalPress" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
        });

        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error("Email sending failed:", error);

        throw new ApiError(500, "Error during sending email");
    }
};

export default sendEmail;
