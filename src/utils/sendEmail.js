import nodemailer from "nodemailer";
import ApiError from "./ApiError.js";

const sendEmail = async ({ to, subject, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"JournalPress" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
    } catch (error) {
        throw new ApiError(500, "error during send mail");
        console.log(error);
    }
};

export default sendEmail;
