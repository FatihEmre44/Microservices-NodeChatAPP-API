const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        bi: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['active', 'banned', 'deleted'],
            default: 'active',
        },
        photo   : 
            {
                type: String,
            },
        
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', userSchema);

module.exports = User;