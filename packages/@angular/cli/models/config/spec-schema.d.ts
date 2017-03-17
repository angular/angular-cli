export interface CliConfig {
    requiredKey: number;
    stringKeyDefault?: string;
    stringKey?: string;
    booleanKey?: boolean;
    numberKey?: number;
    objectKey1?: {
        stringKey?: string;
        objectKey?: {
            stringKey?: string;
        };
    };
    objectKey2?: {
        [name: string]: any;
        stringKey?: string;
    };
    arrayKey1?: any[];
    arrayKey2?: any[];
}
