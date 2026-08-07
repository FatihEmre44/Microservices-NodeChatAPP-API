const UserRepository = require('../repositories/userrepository');
const UserService = require('../services/userservice');

const userService = new UserService(new UserRepository());

async function getUser(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.query.phoneNumber;
        const user = await userService.findByPhoneNumber(phoneNumber);

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
        const updatedUser = await userService.updateProfile(phoneNumber, req.body);
        return res.status(200).json({ success: true, message: 'User updated', data: updatedUser });
    } catch (error) {
        next(error);
    }
}

async function getUsers(req, res, next) {
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 20;
        const result = await userService.getUsers(page, limit);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

async function searchUsers(req, res, next) {
    try {
        const query = req.query.q || '';
        const page = req.query.page || 1;
        const limit = req.query.limit || 20;
        const result = await userService.searchUsers(query, page, limit);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

async function updatePhoto(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;
        const user = await userService.updatePhoto(phoneNumber, req.body.photo);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

async function updateBio(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;
        const user = await userService.updateBio(phoneNumber, req.body.bio);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

async function updateStatus(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;
        const user = await userService.updateStatus(phoneNumber, req.body.status);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

async function deactivateUser(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;
        const user = await userService.deactivateUser(phoneNumber);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

async function deleteUser(req, res, next) {
    try {
        const phoneNumber = req.params.phoneNumber || req.body.phoneNumber;
        const user = await userService.deleteUser(phoneNumber);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getUser,
    createUser,
    updateUser,
    getUsers,
    searchUsers,
    updatePhoto,
    updateBio,
    updateStatus,
    deactivateUser,
    deleteUser,
};
