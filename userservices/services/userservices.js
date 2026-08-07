const User = require('../models/usermodel');

class UserService {
    #userModel;
    #eventPublisher;

    constructor(userModel, eventPublisher) {
        this.#userModel = userModel || User;
        this.#eventPublisher = eventPublisher;
    }

    async createUser(input) {
        const user = new this.#userModel({
            phoneNumber: input.phoneNumber,
            name: input.name || input.phoneNumber,
            bio: input.bio ?? null,
            status: input.status ?? 'active',
            photo: input.photo ?? null,
        });

        await user.save();
        return user;
    }

    async findUserByPhoneNumber(phoneNumber) {
        return this.#userModel.findOne({ phoneNumber }).exec();
    }

    async updateUserByPhoneNumber(phoneNumber, updates) {
        return this.#userModel.findOneAndUpdate({ phoneNumber }, updates, {
            new: true,
            runValidators: true,
        }).exec();
    }
}

module.exports = UserService;