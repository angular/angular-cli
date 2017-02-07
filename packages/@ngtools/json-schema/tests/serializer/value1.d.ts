interface _ {
    requiredKey: number;
    stringKeyDefault?: string;
    stringKey?: string;
    booleanKey?: boolean;
    numberKey?: number;
    oneOfKey1?: (string | number);
    oneOfKey2?: (string | string[]);
    objectKey1?: {
        stringKey?: string;
        objectKey?: {
            stringKey?: string;
        };
    };
    objectKey2?: {
        stringKey?: string;
        [name: string]: any;
    };
    arrayKey1?: {
        stringKey?: string;
    }[];
    arrayKey2?: {
        stringKey?: string;
    }[];
}
export default _;
