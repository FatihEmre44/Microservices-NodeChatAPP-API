const User = require('../models/usermodel');

class UserRepository {
  constructor(userModel = User) {
    this.userModel = userModel;
  }

  async create(data) {
    const user = new this.userModel(data);
    return user.save();
  }

  async findById(id) {
    return this.userModel.findById(id).exec();
  }

  async findByPhoneNumber(phoneNumber) {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async exists(phoneNumber) {
    return this.userModel.exists({ phoneNumber });
  }

  async updateByPhoneNumber(phoneNumber, updates) {
    return this.userModel.findOneAndUpdate({ phoneNumber }, updates, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async updateById(id, updates) {
    return this.userModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteByPhoneNumber(phoneNumber) {
    return this.userModel.findOneAndDelete({ phoneNumber }).exec();
  }

  async softDeleteByPhoneNumber(phoneNumber) {
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      { status: 'deleted', isDeleted: true, deletedAt: new Date() },
      { new: true, runValidators: true }
    ).exec();
  }

  async search(query = '', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const searchQuery = query ? { name: { $regex: query, $options: 'i' } } : {};

    const [users, total] = await Promise.all([
      this.userModel.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.userModel.countDocuments(searchQuery),
    ]);

    return { users, total, page, limit };
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.userModel.countDocuments({}),
    ]);

    return { users, total, page, limit };
  }

  async count() {
    return this.userModel.countDocuments({});
  }
}

module.exports = UserRepository;
