import app from "./app.js";
import connectDb from "./db/index.js";

const port = process.env.PORT || 8000;
connectDb()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running at port ${port}`);
        });
    })
    .catch((err) => {
        console.error("mongoose connect failed \n", err);
        process.exit(1);
    });
