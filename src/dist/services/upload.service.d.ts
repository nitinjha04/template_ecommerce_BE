export declare class UploadService {
    static uploadImage(file: Express.Multer.File, folder?: string): Promise<{
        url: string;
        fileId: string;
        name: string;
    }>;
    static uploadMultiple(files: Express.Multer.File[], folder?: string): Promise<{
        url: string;
        fileId: string;
        name: string;
    }[]>;
}
//# sourceMappingURL=upload.service.d.ts.map