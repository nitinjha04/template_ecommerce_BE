export declare const env: {
    nodeEnv: string;
    port: number;
    mongodbUri: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    corsOrigin: string[];
    imagekit: {
        publicKey: string;
        privateKey: string;
        urlEndpoint: string;
    };
    seedAdmin: {
        email: string;
        password: string;
        name: string;
    };
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        from: string;
        adminEmail: string;
    };
    emailEnabled: boolean;
};
export declare const isImageKitConfigured: () => boolean;
export declare const isEmailConfigured: () => boolean;
/** Emails are off until EMAIL_ENABLED=true and SMTP vars are set. */
export declare const isEmailEnabled: () => boolean;
//# sourceMappingURL=env.d.ts.map