import { Contact } from '../models';
import { ApiError } from '../utils/ApiError';

interface CreateContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactService {
  static async create(input: CreateContactInput) {
    return Contact.create(input);
  }

  static async getAll() {
    return Contact.find().sort({ createdAt: -1 });
  }

  static async getById(id: string) {
    const message = await Contact.findById(id);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }
    return message;
  }

  static async markAsRead(id: string, read = true) {
    const message = await Contact.findByIdAndUpdate(
      id,
      { read },
      { new: true }
    );
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }
    return message;
  }

  static async remove(id: string) {
    const message = await Contact.findByIdAndDelete(id);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }
    return { id };
  }
}
