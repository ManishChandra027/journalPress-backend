import mongoose,{Schema,model} from "mongoose";
const bookmarkSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        blog: {
            type: Schema.Types.ObjectId,
            ref: "Blog",
            required: true,
        },
    },
    { timestamps: true }
);

bookmarkSchema.index(
   { user: 1, blog: 1 },
   { unique: true }
);


const Bookmark = model("Bookmark", bookmarkSchema);
export default Bookmark;