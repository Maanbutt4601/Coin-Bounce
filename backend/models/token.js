const mongoose = require('mongoose');
const { Schema } = mongoose;

// "Schema" type of object.
const refreshTokenSchema = Schema({
    token: { type: String, required: true },
    userid: { type: mongoose.SchemaTypes.ObjectId, ref:"User" },
},
    { timestamps: true }
);

module.exports = mongoose.model('RefreshToken',refreshTokenSchema,'tokens');