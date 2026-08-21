interface CreateContactInput {
    name: string;
    email: string;
    subject: string;
    message: string;
}
export declare class ContactService {
    static create(input: CreateContactInput): Promise<import("mongoose").Document<unknown, {}, import("../models").IContact, {}, {}> & import("../models").IContact & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getAll(): Promise<(import("mongoose").Document<unknown, {}, import("../models").IContact, {}, {}> & import("../models").IContact & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, import("../models").IContact, {}, {}> & import("../models").IContact & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static markAsRead(id: string, read?: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models").IContact, {}, {}> & import("../models").IContact & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static remove(id: string): Promise<{
        id: string;
    }>;
}
export {};
//# sourceMappingURL=contact.service.d.ts.map