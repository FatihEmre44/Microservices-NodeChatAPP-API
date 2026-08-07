const UserService = require('../services/userservices');
const User = require('../models/usermodel');

const userService = new UserService(User);

async function getUser(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.query.phoneNumber;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'phoneNumber is required' });
        }

        const user = await userService.findUserByPhoneNumber(phoneNumber);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

async function createUser(req, res, next) {
    try {
        const user = await userService.createUser(req.body);
        return res.status(201).json({ success: true, message: 'User created', data: user });
    } catch (error) {
        next(error);
    }
}

async function updateUser(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'phoneNumber is required' });
        }

        const updatedUser = await userService.updateUserByPhoneNumber(phoneNumber, req.body);

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, message: 'User updated', data: updatedUser });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getUser,
    createUser,
    updateUser,
};
