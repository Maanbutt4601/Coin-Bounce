const mongoose = require('mongoose');
const { Schema } = mongoose;
// const = mongoose.Schema

const blogSchema = Schema({
    title: { type: String, require: true },
    content: { type: String, require: true },
    photoPath: { type: String, require: true },

    /* Let suppose if you have a User document with ObjectId "64e7bbffdd967fce11887994", and you create a new Blog document with author field set to that ObjectId, Mongoose will understand that this author field refers to a User document with the same ObjectId. */
    author: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
},
    { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema, 'blogs');