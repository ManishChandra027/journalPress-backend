import mongoose,{Schema,model} from "mongoose";
const bookmarkSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },
    },
    { timestamps: true }
);

bookmarkSchema.index(
   { user: 1, post: 1 },
   { unique: true }
);


const Bookmark = model("Bookmark", bookmarkSchema);
export default Bookmark;