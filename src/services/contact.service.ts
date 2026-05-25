import { FilterQuery } from 'mongoose';
import { Contact } from '../models';
import { IContact } from '../models/Contact.model';
import { ApiError } from '../utils/ApiError';
import {
  buildPaginationMeta,
  PaginatedResult,
  parsePagination,
  searchRegex,
} from '../utils/pagination';
import { AdminListQuery } from '../types/adminList';

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

  static async getAllAdmin(
    query: AdminListQuery
  ): Promise<PaginatedResult<IContact>> {
    const { page, limit, skip } = parsePagination(query);
    const filter: FilterQuery<IContact> = {};
    const regex = searchRegex(query.search ?? '');
    if (regex) {
      filter.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const [items, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(filter),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(page, limit, total),
    };
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
