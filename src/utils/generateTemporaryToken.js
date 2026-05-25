import crypto from "crypto";

const generateTemporaryToken = () => {
    // generate random token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // do token hash 
    const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
        
    // return BOTH
    return { rawToken, hashedToken };
};

export default generateTemporaryToken;
