/**
 * Interface for interacting with a document.
 */
class Document {
    constructor(fields) {
        Object.defineProperty(this, "pageContent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The ID field is optional at the moment.
        // It will likely become required in a future major release after
        // it has been adopted by enough vectorstore implementations.
        /**
         * An optional identifier for the document.
         *
         * Ideally this should be unique across the document collection and formatted
         * as a UUID, but this will not be enforced.
         */
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.pageContent =
            fields.pageContent !== undefined ? fields.pageContent.toString() : "";
        this.metadata = fields.metadata ?? {};
        this.id = fields.id;
    }
}

var util;
(function (util) {
    util.assertEqual = (val) => val;
    function assertIs(_arg) { }
    util.assertIs = assertIs;
    function assertNever(_x) {
        throw new Error();
    }
    util.assertNever = assertNever;
    util.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
            obj[item] = item;
        }
        return obj;
    };
    util.getValidEnumValues = (obj) => {
        const validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
            filtered[k] = obj[k];
        }
        return util.objectValues(filtered);
    };
    util.objectValues = (obj) => {
        return util.objectKeys(obj).map(function (e) {
            return obj[e];
        });
    };
    util.objectKeys = typeof Object.keys === "function" // eslint-disable-line ban/ban
        ? (obj) => Object.keys(obj) // eslint-disable-line ban/ban
        : (object) => {
            const keys = [];
            for (const key in object) {
                if (Object.prototype.hasOwnProperty.call(object, key)) {
                    keys.push(key);
                }
            }
            return keys;
        };
    util.find = (arr, checker) => {
        for (const item of arr) {
            if (checker(item))
                return item;
        }
        return undefined;
    };
    util.isInteger = typeof Number.isInteger === "function"
        ? (val) => Number.isInteger(val) // eslint-disable-line ban/ban
        : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
        return array
            .map((val) => (typeof val === "string" ? `'${val}'` : val))
            .join(separator);
    }
    util.joinValues = joinValues;
    util.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value;
    };
})(util || (util = {}));
var objectUtil;
(function (objectUtil) {
    objectUtil.mergeShapes = (first, second) => {
        return {
            ...first,
            ...second, // second overwrites first
        };
    };
})(objectUtil || (objectUtil = {}));
const ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set",
]);
const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
        case "undefined":
            return ZodParsedType.undefined;
        case "string":
            return ZodParsedType.string;
        case "number":
            return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
        case "boolean":
            return ZodParsedType.boolean;
        case "function":
            return ZodParsedType.function;
        case "bigint":
            return ZodParsedType.bigint;
        case "symbol":
            return ZodParsedType.symbol;
        case "object":
            if (Array.isArray(data)) {
                return ZodParsedType.array;
            }
            if (data === null) {
                return ZodParsedType.null;
            }
            if (data.then &&
                typeof data.then === "function" &&
                data.catch &&
                typeof data.catch === "function") {
                return ZodParsedType.promise;
            }
            if (typeof Map !== "undefined" && data instanceof Map) {
                return ZodParsedType.map;
            }
            if (typeof Set !== "undefined" && data instanceof Set) {
                return ZodParsedType.set;
            }
            if (typeof Date !== "undefined" && data instanceof Date) {
                return ZodParsedType.date;
            }
            return ZodParsedType.object;
        default:
            return ZodParsedType.unknown;
    }
};

const ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite",
]);
const quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
};
class ZodError extends Error {
    constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
            this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
            this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            // eslint-disable-next-line ban/ban
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
    }
    get errors() {
        return this.issues;
    }
    format(_mapper) {
        const mapper = _mapper ||
            function (issue) {
                return issue.message;
            };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
            for (const issue of error.issues) {
                if (issue.code === "invalid_union") {
                    issue.unionErrors.map(processError);
                }
                else if (issue.code === "invalid_return_type") {
                    processError(issue.returnTypeError);
                }
                else if (issue.code === "invalid_arguments") {
                    processError(issue.argumentsError);
                }
                else if (issue.path.length === 0) {
                    fieldErrors._errors.push(mapper(issue));
                }
                else {
                    let curr = fieldErrors;
                    let i = 0;
                    while (i < issue.path.length) {
                        const el = issue.path[i];
                        const terminal = i === issue.path.length - 1;
                        if (!terminal) {
                            curr[el] = curr[el] || { _errors: [] };
                            // if (typeof el === "string") {
                            //   curr[el] = curr[el] || { _errors: [] };
                            // } else if (typeof el === "number") {
                            //   const errorArray: any = [];
                            //   errorArray._errors = [];
                            //   curr[el] = curr[el] || errorArray;
                            // }
                        }
                        else {
                            curr[el] = curr[el] || { _errors: [] };
                            curr[el]._errors.push(mapper(issue));
                        }
                        curr = curr[el];
                        i++;
                    }
                }
            }
        };
        processError(this);
        return fieldErrors;
    }
    static assert(value) {
        if (!(value instanceof ZodError)) {
            throw new Error(`Not a ZodError: ${value}`);
        }
    }
    toString() {
        return this.message;
    }
    get message() {
        return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
        return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
            if (sub.path.length > 0) {
                fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
                fieldErrors[sub.path[0]].push(mapper(sub));
            }
            else {
                formErrors.push(mapper(sub));
            }
        }
        return { formErrors, fieldErrors };
    }
    get formErrors() {
        return this.flatten();
    }
}
ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
};

const errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
        case ZodIssueCode.invalid_type:
            if (issue.received === ZodParsedType.undefined) {
                message = "Required";
            }
            else {
                message = `Expected ${issue.expected}, received ${issue.received}`;
            }
            break;
        case ZodIssueCode.invalid_literal:
            message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
            break;
        case ZodIssueCode.unrecognized_keys:
            message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
            break;
        case ZodIssueCode.invalid_union:
            message = `Invalid input`;
            break;
        case ZodIssueCode.invalid_union_discriminator:
            message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
            break;
        case ZodIssueCode.invalid_enum_value:
            message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
            break;
        case ZodIssueCode.invalid_arguments:
            message = `Invalid function arguments`;
            break;
        case ZodIssueCode.invalid_return_type:
            message = `Invalid function return type`;
            break;
        case ZodIssueCode.invalid_date:
            message = `Invalid date`;
            break;
        case ZodIssueCode.invalid_string:
            if (typeof issue.validation === "object") {
                if ("includes" in issue.validation) {
                    message = `Invalid input: must include "${issue.validation.includes}"`;
                    if (typeof issue.validation.position === "number") {
                        message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
                    }
                }
                else if ("startsWith" in issue.validation) {
                    message = `Invalid input: must start with "${issue.validation.startsWith}"`;
                }
                else if ("endsWith" in issue.validation) {
                    message = `Invalid input: must end with "${issue.validation.endsWith}"`;
                }
                else {
                    util.assertNever(issue.validation);
                }
            }
            else if (issue.validation !== "regex") {
                message = `Invalid ${issue.validation}`;
            }
            else {
                message = "Invalid";
            }
            break;
        case ZodIssueCode.too_small:
            if (issue.type === "array")
                message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
            else if (issue.type === "string")
                message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
            else if (issue.type === "number")
                message = `Number must be ${issue.exact
                    ? `exactly equal to `
                    : issue.inclusive
                        ? `greater than or equal to `
                        : `greater than `}${issue.minimum}`;
            else if (issue.type === "date")
                message = `Date must be ${issue.exact
                    ? `exactly equal to `
                    : issue.inclusive
                        ? `greater than or equal to `
                        : `greater than `}${new Date(Number(issue.minimum))}`;
            else
                message = "Invalid input";
            break;
        case ZodIssueCode.too_big:
            if (issue.type === "array")
                message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
            else if (issue.type === "string")
                message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
            else if (issue.type === "number")
                message = `Number must be ${issue.exact
                    ? `exactly`
                    : issue.inclusive
                        ? `less than or equal to`
                        : `less than`} ${issue.maximum}`;
            else if (issue.type === "bigint")
                message = `BigInt must be ${issue.exact
                    ? `exactly`
                    : issue.inclusive
                        ? `less than or equal to`
                        : `less than`} ${issue.maximum}`;
            else if (issue.type === "date")
                message = `Date must be ${issue.exact
                    ? `exactly`
                    : issue.inclusive
                        ? `smaller than or equal to`
                        : `smaller than`} ${new Date(Number(issue.maximum))}`;
            else
                message = "Invalid input";
            break;
        case ZodIssueCode.custom:
            message = `Invalid input`;
            break;
        case ZodIssueCode.invalid_intersection_types:
            message = `Intersection results could not be merged`;
            break;
        case ZodIssueCode.not_multiple_of:
            message = `Number must be a multiple of ${issue.multipleOf}`;
            break;
        case ZodIssueCode.not_finite:
            message = "Number must be finite";
            break;
        default:
            message = _ctx.defaultError;
            util.assertNever(issue);
    }
    return { message };
};

let overrideErrorMap = errorMap;
function setErrorMap(map) {
    overrideErrorMap = map;
}
function getErrorMap() {
    return overrideErrorMap;
}

const makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...(issueData.path || [])];
    const fullIssue = {
        ...issueData,
        path: fullPath,
    };
    if (issueData.message !== undefined) {
        return {
            ...issueData,
            path: fullPath,
            message: issueData.message,
        };
    }
    let errorMessage = "";
    const maps = errorMaps
        .filter((m) => !!m)
        .slice()
        .reverse();
    for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
        ...issueData,
        path: fullPath,
        message: errorMessage,
    };
};
const EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
        issueData: issueData,
        data: ctx.data,
        path: ctx.path,
        errorMaps: [
            ctx.common.contextualErrorMap,
            ctx.schemaErrorMap,
            overrideMap,
            overrideMap === errorMap ? undefined : errorMap, // then global default map
        ].filter((x) => !!x),
    });
    ctx.common.issues.push(issue);
}
class ParseStatus {
    constructor() {
        this.value = "valid";
    }
    dirty() {
        if (this.value === "valid")
            this.value = "dirty";
    }
    abort() {
        if (this.value !== "aborted")
            this.value = "aborted";
    }
    static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
            if (s.status === "aborted")
                return INVALID;
            if (s.status === "dirty")
                status.dirty();
            arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
                key,
                value,
            });
        }
        return ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
            const { key, value } = pair;
            if (key.status === "aborted")
                return INVALID;
            if (value.status === "aborted")
                return INVALID;
            if (key.status === "dirty")
                status.dirty();
            if (value.status === "dirty")
                status.dirty();
            if (key.value !== "__proto__" &&
                (typeof value.value !== "undefined" || pair.alwaysSet)) {
                finalObject[key.value] = value.value;
            }
        }
        return { status: status.value, value: finalObject };
    }
}
const INVALID = Object.freeze({
    status: "aborted",
});
const DIRTY = (value) => ({ status: "dirty", value });
const OK = (value) => ({ status: "valid", value });
const isAborted = (x) => x.status === "aborted";
const isDirty = (x) => x.status === "dirty";
const isValid = (x) => x.status === "valid";
const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var errorUtil;
(function (errorUtil) {
    errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));

var _ZodEnum_cache, _ZodNativeEnum_cache;
class ParseInputLazyPath {
    constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
    }
    get path() {
        if (!this._cachedPath.length) {
            if (this._key instanceof Array) {
                this._cachedPath.push(...this._path, ...this._key);
            }
            else {
                this._cachedPath.push(...this._path, this._key);
            }
        }
        return this._cachedPath;
    }
}
const handleResult = (ctx, result) => {
    if (isValid(result)) {
        return { success: true, data: result.value };
    }
    else {
        if (!ctx.common.issues.length) {
            throw new Error("Validation failed but no issues detected.");
        }
        return {
            success: false,
            get error() {
                if (this._error)
                    return this._error;
                const error = new ZodError(ctx.common.issues);
                this._error = error;
                return this._error;
            },
        };
    }
};
function processCreateParams(params) {
    if (!params)
        return {};
    const { errorMap, invalid_type_error, required_error, description } = params;
    if (errorMap && (invalid_type_error || required_error)) {
        throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap)
        return { errorMap: errorMap, description };
    const customMap = (iss, ctx) => {
        var _a, _b;
        const { message } = params;
        if (iss.code === "invalid_enum_value") {
            return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
        }
        if (typeof ctx.data === "undefined") {
            return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
        }
        if (iss.code !== "invalid_type")
            return { message: ctx.defaultError };
        return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
    };
    return { errorMap: customMap, description };
}
class ZodType {
    constructor(def) {
        /** Alias of safeParseAsync */
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
    }
    get description() {
        return this._def.description;
    }
    _getType(input) {
        return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
        return (ctx || {
            common: input.parent.common,
            data: input.data,
            parsedType: getParsedType(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent,
        });
    }
    _processInputParams(input) {
        return {
            status: new ParseStatus(),
            ctx: {
                common: input.parent.common,
                data: input.data,
                parsedType: getParsedType(input.data),
                schemaErrorMap: this._def.errorMap,
                path: input.path,
                parent: input.parent,
            },
        };
    }
    _parseSync(input) {
        const result = this._parse(input);
        if (isAsync(result)) {
            throw new Error("Synchronous parse encountered promise.");
        }
        return result;
    }
    _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
    }
    parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
            return result.data;
        throw result.error;
    }
    safeParse(data, params) {
        var _a;
        const ctx = {
            common: {
                issues: [],
                async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
                contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
            },
            path: (params === null || params === void 0 ? void 0 : params.path) || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
    }
    async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
            return result.data;
        throw result.error;
    }
    async safeParseAsync(data, params) {
        const ctx = {
            common: {
                issues: [],
                contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
                async: true,
            },
            path: (params === null || params === void 0 ? void 0 : params.path) || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (isAsync(maybeAsyncResult)
            ? maybeAsyncResult
            : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
    }
    refine(check, message) {
        const getIssueProperties = (val) => {
            if (typeof message === "string" || typeof message === "undefined") {
                return { message };
            }
            else if (typeof message === "function") {
                return message(val);
            }
            else {
                return message;
            }
        };
        return this._refinement((val, ctx) => {
            const result = check(val);
            const setError = () => ctx.addIssue({
                code: ZodIssueCode.custom,
                ...getIssueProperties(val),
            });
            if (typeof Promise !== "undefined" && result instanceof Promise) {
                return result.then((data) => {
                    if (!data) {
                        setError();
                        return false;
                    }
                    else {
                        return true;
                    }
                });
            }
            if (!result) {
                setError();
                return false;
            }
            else {
                return true;
            }
        });
    }
    refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
            if (!check(val)) {
                ctx.addIssue(typeof refinementData === "function"
                    ? refinementData(val, ctx)
                    : refinementData);
                return false;
            }
            else {
                return true;
            }
        });
    }
    _refinement(refinement) {
        return new ZodEffects({
            schema: this,
            typeName: ZodFirstPartyTypeKind.ZodEffects,
            effect: { type: "refinement", refinement },
        });
    }
    superRefine(refinement) {
        return this._refinement(refinement);
    }
    optional() {
        return ZodOptional.create(this, this._def);
    }
    nullable() {
        return ZodNullable.create(this, this._def);
    }
    nullish() {
        return this.nullable().optional();
    }
    array() {
        return ZodArray.create(this, this._def);
    }
    promise() {
        return ZodPromise.create(this, this._def);
    }
    or(option) {
        return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
        return new ZodEffects({
            ...processCreateParams(this._def),
            schema: this,
            typeName: ZodFirstPartyTypeKind.ZodEffects,
            effect: { type: "transform", transform },
        });
    }
    default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
            ...processCreateParams(this._def),
            innerType: this,
            defaultValue: defaultValueFunc,
            typeName: ZodFirstPartyTypeKind.ZodDefault,
        });
    }
    brand() {
        return new ZodBranded({
            typeName: ZodFirstPartyTypeKind.ZodBranded,
            type: this,
            ...processCreateParams(this._def),
        });
    }
    catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
            ...processCreateParams(this._def),
            innerType: this,
            catchValue: catchValueFunc,
            typeName: ZodFirstPartyTypeKind.ZodCatch,
        });
    }
    describe(description) {
        const This = this.constructor;
        return new This({
            ...this._def,
            description,
        });
    }
    pipe(target) {
        return ZodPipeline.create(this, target);
    }
    readonly() {
        return ZodReadonly.create(this);
    }
    isOptional() {
        return this.safeParse(undefined).success;
    }
    isNullable() {
        return this.safeParse(null).success;
    }
}
const cuidRegex = /^c[^\s-]{8,}$/i;
const cuid2Regex = /^[0-9a-z]+$/;
const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
// const uuidRegex =
//   /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;
const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
// from https://stackoverflow.com/a/46181/1550155
// old version: too slow, didn't support unicode
// const emailRegex = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;
//old email regex
// const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i;
// eslint-disable-next-line
// const emailRegex =
//   /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\])|(\[IPv6:(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))\])|([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])*(\.[A-Za-z]{2,})+))$/;
// const emailRegex =
//   /^[a-zA-Z0-9\.\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// const emailRegex =
//   /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
// const emailRegex =
//   /^[a-z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9\-]+)*$/i;
// from https://thekevinscott.com/emojis-in-javascript/#writing-a-regular-expression
const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
let emojiRegex$1;
// faster, simpler, safer
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6Regex = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
// https://stackoverflow.com/questions/7860392/determine-if-string-is-in-base64-using-javascript
const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
// simple
// const dateRegexSource = `\\d{4}-\\d{2}-\\d{2}`;
// no leap year validation
// const dateRegexSource = `\\d{4}-((0[13578]|10|12)-31|(0[13-9]|1[0-2])-30|(0[1-9]|1[0-2])-(0[1-9]|1\\d|2\\d))`;
// with leap year validation
const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
    // let regex = `\\d{2}:\\d{2}:\\d{2}`;
    let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
    if (args.precision) {
        regex = `${regex}\\.\\d{${args.precision}}`;
    }
    else if (args.precision == null) {
        regex = `${regex}(\\.\\d+)?`;
    }
    return regex;
}
function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
}
// Adapted from https://stackoverflow.com/a/3143231
function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
        opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
        return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
        return true;
    }
    return false;
}
class ZodString extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.string) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.string,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const status = new ParseStatus();
        let ctx = undefined;
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                if (input.data.length < check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        minimum: check.value,
                        type: "string",
                        inclusive: true,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                if (input.data.length > check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        maximum: check.value,
                        type: "string",
                        inclusive: true,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "length") {
                const tooBig = input.data.length > check.value;
                const tooSmall = input.data.length < check.value;
                if (tooBig || tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    if (tooBig) {
                        addIssueToContext(ctx, {
                            code: ZodIssueCode.too_big,
                            maximum: check.value,
                            type: "string",
                            inclusive: true,
                            exact: true,
                            message: check.message,
                        });
                    }
                    else if (tooSmall) {
                        addIssueToContext(ctx, {
                            code: ZodIssueCode.too_small,
                            minimum: check.value,
                            type: "string",
                            inclusive: true,
                            exact: true,
                            message: check.message,
                        });
                    }
                    status.dirty();
                }
            }
            else if (check.kind === "email") {
                if (!emailRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "email",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "emoji") {
                if (!emojiRegex$1) {
                    emojiRegex$1 = new RegExp(_emojiRegex, "u");
                }
                if (!emojiRegex$1.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "emoji",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "uuid") {
                if (!uuidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "uuid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "nanoid") {
                if (!nanoidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "nanoid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cuid") {
                if (!cuidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cuid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cuid2") {
                if (!cuid2Regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cuid2",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "ulid") {
                if (!ulidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "ulid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "url") {
                try {
                    new URL(input.data);
                }
                catch (_a) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "url",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "regex") {
                check.regex.lastIndex = 0;
                const testResult = check.regex.test(input.data);
                if (!testResult) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "regex",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "trim") {
                input.data = input.data.trim();
            }
            else if (check.kind === "includes") {
                if (!input.data.includes(check.value, check.position)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { includes: check.value, position: check.position },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "toLowerCase") {
                input.data = input.data.toLowerCase();
            }
            else if (check.kind === "toUpperCase") {
                input.data = input.data.toUpperCase();
            }
            else if (check.kind === "startsWith") {
                if (!input.data.startsWith(check.value)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { startsWith: check.value },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "endsWith") {
                if (!input.data.endsWith(check.value)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { endsWith: check.value },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "datetime") {
                const regex = datetimeRegex(check);
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "datetime",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "date") {
                const regex = dateRegex;
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "date",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "time") {
                const regex = timeRegex(check);
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "time",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "duration") {
                if (!durationRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "duration",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "ip") {
                if (!isValidIP(input.data, check.version)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "ip",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "base64") {
                if (!base64Regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "base64",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
            validation,
            code: ZodIssueCode.invalid_string,
            ...errorUtil.errToObj(message),
        });
    }
    _addCheck(check) {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    email(message) {
        return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
        return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
        var _a, _b;
        if (typeof options === "string") {
            return this._addCheck({
                kind: "datetime",
                precision: null,
                offset: false,
                local: false,
                message: options,
            });
        }
        return this._addCheck({
            kind: "datetime",
            precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
            offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
            local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
            ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message),
        });
    }
    date(message) {
        return this._addCheck({ kind: "date", message });
    }
    time(options) {
        if (typeof options === "string") {
            return this._addCheck({
                kind: "time",
                precision: null,
                message: options,
            });
        }
        return this._addCheck({
            kind: "time",
            precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
            ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message),
        });
    }
    duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
        return this._addCheck({
            kind: "regex",
            regex: regex,
            ...errorUtil.errToObj(message),
        });
    }
    includes(value, options) {
        return this._addCheck({
            kind: "includes",
            value: value,
            position: options === null || options === void 0 ? void 0 : options.position,
            ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message),
        });
    }
    startsWith(value, message) {
        return this._addCheck({
            kind: "startsWith",
            value: value,
            ...errorUtil.errToObj(message),
        });
    }
    endsWith(value, message) {
        return this._addCheck({
            kind: "endsWith",
            value: value,
            ...errorUtil.errToObj(message),
        });
    }
    min(minLength, message) {
        return this._addCheck({
            kind: "min",
            value: minLength,
            ...errorUtil.errToObj(message),
        });
    }
    max(maxLength, message) {
        return this._addCheck({
            kind: "max",
            value: maxLength,
            ...errorUtil.errToObj(message),
        });
    }
    length(len, message) {
        return this._addCheck({
            kind: "length",
            value: len,
            ...errorUtil.errToObj(message),
        });
    }
    /**
     * @deprecated Use z.string().min(1) instead.
     * @see {@link ZodString.min}
     */
    nonempty(message) {
        return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "trim" }],
        });
    }
    toLowerCase() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "toLowerCase" }],
        });
    }
    toUpperCase() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "toUpperCase" }],
        });
    }
    get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
}
ZodString.create = (params) => {
    var _a;
    return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
        ...processCreateParams(params),
    });
};
// https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
    return (valInt % stepInt) / Math.pow(10, decCount);
}
class ZodNumber extends ZodType {
    constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
    }
    _parse(input) {
        if (this._def.coerce) {
            input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.number) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.number,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        let ctx = undefined;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
            if (check.kind === "int") {
                if (!util.isInteger(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_type,
                        expected: "integer",
                        received: "float",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "min") {
                const tooSmall = check.inclusive
                    ? input.data < check.value
                    : input.data <= check.value;
                if (tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        minimum: check.value,
                        type: "number",
                        inclusive: check.inclusive,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                const tooBig = check.inclusive
                    ? input.data > check.value
                    : input.data >= check.value;
                if (tooBig) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        maximum: check.value,
                        type: "number",
                        inclusive: check.inclusive,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "multipleOf") {
                if (floatSafeRemainder(input.data, check.value) !== 0) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_multiple_of,
                        multipleOf: check.value,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "finite") {
                if (!Number.isFinite(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_finite,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
        return new ZodNumber({
            ...this._def,
            checks: [
                ...this._def.checks,
                {
                    kind,
                    value,
                    inclusive,
                    message: errorUtil.toString(message),
                },
            ],
        });
    }
    _addCheck(check) {
        return new ZodNumber({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    int(message) {
        return this._addCheck({
            kind: "int",
            message: errorUtil.toString(message),
        });
    }
    positive(message) {
        return this._addCheck({
            kind: "min",
            value: 0,
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    negative(message) {
        return this._addCheck({
            kind: "max",
            value: 0,
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    nonpositive(message) {
        return this._addCheck({
            kind: "max",
            value: 0,
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    nonnegative(message) {
        return this._addCheck({
            kind: "min",
            value: 0,
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    multipleOf(value, message) {
        return this._addCheck({
            kind: "multipleOf",
            value: value,
            message: errorUtil.toString(message),
        });
    }
    finite(message) {
        return this._addCheck({
            kind: "finite",
            message: errorUtil.toString(message),
        });
    }
    safe(message) {
        return this._addCheck({
            kind: "min",
            inclusive: true,
            value: Number.MIN_SAFE_INTEGER,
            message: errorUtil.toString(message),
        })._addCheck({
            kind: "max",
            inclusive: true,
            value: Number.MAX_SAFE_INTEGER,
            message: errorUtil.toString(message),
        });
    }
    get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
    get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" ||
            (ch.kind === "multipleOf" && util.isInteger(ch.value)));
    }
    get isFinite() {
        let max = null, min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "finite" ||
                ch.kind === "int" ||
                ch.kind === "multipleOf") {
                return true;
            }
            else if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
            else if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return Number.isFinite(min) && Number.isFinite(max);
    }
}
ZodNumber.create = (params) => {
    return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
        ...processCreateParams(params),
    });
};
class ZodBigInt extends ZodType {
    constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
    }
    _parse(input) {
        if (this._def.coerce) {
            input.data = BigInt(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.bigint) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.bigint,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        let ctx = undefined;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                const tooSmall = check.inclusive
                    ? input.data < check.value
                    : input.data <= check.value;
                if (tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        type: "bigint",
                        minimum: check.value,
                        inclusive: check.inclusive,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                const tooBig = check.inclusive
                    ? input.data > check.value
                    : input.data >= check.value;
                if (tooBig) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        type: "bigint",
                        maximum: check.value,
                        inclusive: check.inclusive,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "multipleOf") {
                if (input.data % check.value !== BigInt(0)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_multiple_of,
                        multipleOf: check.value,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
        return new ZodBigInt({
            ...this._def,
            checks: [
                ...this._def.checks,
                {
                    kind,
                    value,
                    inclusive,
                    message: errorUtil.toString(message),
                },
            ],
        });
    }
    _addCheck(check) {
        return new ZodBigInt({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    positive(message) {
        return this._addCheck({
            kind: "min",
            value: BigInt(0),
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    negative(message) {
        return this._addCheck({
            kind: "max",
            value: BigInt(0),
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    nonpositive(message) {
        return this._addCheck({
            kind: "max",
            value: BigInt(0),
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    nonnegative(message) {
        return this._addCheck({
            kind: "min",
            value: BigInt(0),
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    multipleOf(value, message) {
        return this._addCheck({
            kind: "multipleOf",
            value,
            message: errorUtil.toString(message),
        });
    }
    get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
}
ZodBigInt.create = (params) => {
    var _a;
    return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
        ...processCreateParams(params),
    });
};
class ZodBoolean extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.boolean) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.boolean,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodBoolean.create = (params) => {
    return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
        ...processCreateParams(params),
    });
};
class ZodDate extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.date) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.date,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (isNaN(input.data.getTime())) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_date,
            });
            return INVALID;
        }
        const status = new ParseStatus();
        let ctx = undefined;
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                if (input.data.getTime() < check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        message: check.message,
                        inclusive: true,
                        exact: false,
                        minimum: check.value,
                        type: "date",
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                if (input.data.getTime() > check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        message: check.message,
                        inclusive: true,
                        exact: false,
                        maximum: check.value,
                        type: "date",
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return {
            status: status.value,
            value: new Date(input.data.getTime()),
        };
    }
    _addCheck(check) {
        return new ZodDate({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    min(minDate, message) {
        return this._addCheck({
            kind: "min",
            value: minDate.getTime(),
            message: errorUtil.toString(message),
        });
    }
    max(maxDate, message) {
        return this._addCheck({
            kind: "max",
            value: maxDate.getTime(),
            message: errorUtil.toString(message),
        });
    }
    get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min != null ? new Date(min) : null;
    }
    get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max != null ? new Date(max) : null;
    }
}
ZodDate.create = (params) => {
    return new ZodDate({
        checks: [],
        coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params),
    });
};
class ZodSymbol extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.symbol) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.symbol,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodSymbol.create = (params) => {
    return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params),
    });
};
class ZodUndefined extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.undefined,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodUndefined.create = (params) => {
    return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params),
    });
};
class ZodNull extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.null) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.null,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodNull.create = (params) => {
    return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params),
    });
};
class ZodAny extends ZodType {
    constructor() {
        super(...arguments);
        // to prevent instances of other classes from extending ZodAny. this causes issues with catchall in ZodObject.
        this._any = true;
    }
    _parse(input) {
        return OK(input.data);
    }
}
ZodAny.create = (params) => {
    return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params),
    });
};
class ZodUnknown extends ZodType {
    constructor() {
        super(...arguments);
        // required
        this._unknown = true;
    }
    _parse(input) {
        return OK(input.data);
    }
}
ZodUnknown.create = (params) => {
    return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params),
    });
};
class ZodNever extends ZodType {
    _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.never,
            received: ctx.parsedType,
        });
        return INVALID;
    }
}
ZodNever.create = (params) => {
    return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params),
    });
};
class ZodVoid extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.void,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodVoid.create = (params) => {
    return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params),
    });
};
class ZodArray extends ZodType {
    _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== ZodParsedType.array) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.array,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (def.exactLength !== null) {
            const tooBig = ctx.data.length > def.exactLength.value;
            const tooSmall = ctx.data.length < def.exactLength.value;
            if (tooBig || tooSmall) {
                addIssueToContext(ctx, {
                    code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
                    minimum: (tooSmall ? def.exactLength.value : undefined),
                    maximum: (tooBig ? def.exactLength.value : undefined),
                    type: "array",
                    inclusive: true,
                    exact: true,
                    message: def.exactLength.message,
                });
                status.dirty();
            }
        }
        if (def.minLength !== null) {
            if (ctx.data.length < def.minLength.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_small,
                    minimum: def.minLength.value,
                    type: "array",
                    inclusive: true,
                    exact: false,
                    message: def.minLength.message,
                });
                status.dirty();
            }
        }
        if (def.maxLength !== null) {
            if (ctx.data.length > def.maxLength.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_big,
                    maximum: def.maxLength.value,
                    type: "array",
                    inclusive: true,
                    exact: false,
                    message: def.maxLength.message,
                });
                status.dirty();
            }
        }
        if (ctx.common.async) {
            return Promise.all([...ctx.data].map((item, i) => {
                return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
            })).then((result) => {
                return ParseStatus.mergeArray(status, result);
            });
        }
        const result = [...ctx.data].map((item, i) => {
            return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return ParseStatus.mergeArray(status, result);
    }
    get element() {
        return this._def.type;
    }
    min(minLength, message) {
        return new ZodArray({
            ...this._def,
            minLength: { value: minLength, message: errorUtil.toString(message) },
        });
    }
    max(maxLength, message) {
        return new ZodArray({
            ...this._def,
            maxLength: { value: maxLength, message: errorUtil.toString(message) },
        });
    }
    length(len, message) {
        return new ZodArray({
            ...this._def,
            exactLength: { value: len, message: errorUtil.toString(message) },
        });
    }
    nonempty(message) {
        return this.min(1, message);
    }
}
ZodArray.create = (schema, params) => {
    return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params),
    });
};
function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
        const newShape = {};
        for (const key in schema.shape) {
            const fieldSchema = schema.shape[key];
            newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
        }
        return new ZodObject({
            ...schema._def,
            shape: () => newShape,
        });
    }
    else if (schema instanceof ZodArray) {
        return new ZodArray({
            ...schema._def,
            type: deepPartialify(schema.element),
        });
    }
    else if (schema instanceof ZodOptional) {
        return ZodOptional.create(deepPartialify(schema.unwrap()));
    }
    else if (schema instanceof ZodNullable) {
        return ZodNullable.create(deepPartialify(schema.unwrap()));
    }
    else if (schema instanceof ZodTuple) {
        return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    }
    else {
        return schema;
    }
}
class ZodObject extends ZodType {
    constructor() {
        super(...arguments);
        this._cached = null;
        /**
         * @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
         * If you want to pass through unknown properties, use `.passthrough()` instead.
         */
        this.nonstrict = this.passthrough;
        // extend<
        //   Augmentation extends ZodRawShape,
        //   NewOutput extends util.flatten<{
        //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
        //       ? Augmentation[k]["_output"]
        //       : k extends keyof Output
        //       ? Output[k]
        //       : never;
        //   }>,
        //   NewInput extends util.flatten<{
        //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
        //       ? Augmentation[k]["_input"]
        //       : k extends keyof Input
        //       ? Input[k]
        //       : never;
        //   }>
        // >(
        //   augmentation: Augmentation
        // ): ZodObject<
        //   extendShape<T, Augmentation>,
        //   UnknownKeys,
        //   Catchall,
        //   NewOutput,
        //   NewInput
        // > {
        //   return new ZodObject({
        //     ...this._def,
        //     shape: () => ({
        //       ...this._def.shape(),
        //       ...augmentation,
        //     }),
        //   }) as any;
        // }
        /**
         * @deprecated Use `.extend` instead
         *  */
        this.augment = this.extend;
    }
    _getCached() {
        if (this._cached !== null)
            return this._cached;
        const shape = this._def.shape();
        const keys = util.objectKeys(shape);
        return (this._cached = { shape, keys });
    }
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.object) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever &&
            this._def.unknownKeys === "strip")) {
            for (const key in ctx.data) {
                if (!shapeKeys.includes(key)) {
                    extraKeys.push(key);
                }
            }
        }
        const pairs = [];
        for (const key of shapeKeys) {
            const keyValidator = shape[key];
            const value = ctx.data[key];
            pairs.push({
                key: { status: "valid", value: key },
                value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
                alwaysSet: key in ctx.data,
            });
        }
        if (this._def.catchall instanceof ZodNever) {
            const unknownKeys = this._def.unknownKeys;
            if (unknownKeys === "passthrough") {
                for (const key of extraKeys) {
                    pairs.push({
                        key: { status: "valid", value: key },
                        value: { status: "valid", value: ctx.data[key] },
                    });
                }
            }
            else if (unknownKeys === "strict") {
                if (extraKeys.length > 0) {
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.unrecognized_keys,
                        keys: extraKeys,
                    });
                    status.dirty();
                }
            }
            else if (unknownKeys === "strip") ;
            else {
                throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
            }
        }
        else {
            // run catchall validation
            const catchall = this._def.catchall;
            for (const key of extraKeys) {
                const value = ctx.data[key];
                pairs.push({
                    key: { status: "valid", value: key },
                    value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key) //, ctx.child(key), value, getParsedType(value)
                    ),
                    alwaysSet: key in ctx.data,
                });
            }
        }
        if (ctx.common.async) {
            return Promise.resolve()
                .then(async () => {
                const syncPairs = [];
                for (const pair of pairs) {
                    const key = await pair.key;
                    const value = await pair.value;
                    syncPairs.push({
                        key,
                        value,
                        alwaysSet: pair.alwaysSet,
                    });
                }
                return syncPairs;
            })
                .then((syncPairs) => {
                return ParseStatus.mergeObjectSync(status, syncPairs);
            });
        }
        else {
            return ParseStatus.mergeObjectSync(status, pairs);
        }
    }
    get shape() {
        return this._def.shape();
    }
    strict(message) {
        errorUtil.errToObj;
        return new ZodObject({
            ...this._def,
            unknownKeys: "strict",
            ...(message !== undefined
                ? {
                    errorMap: (issue, ctx) => {
                        var _a, _b, _c, _d;
                        const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
                        if (issue.code === "unrecognized_keys")
                            return {
                                message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError,
                            };
                        return {
                            message: defaultError,
                        };
                    },
                }
                : {}),
        });
    }
    strip() {
        return new ZodObject({
            ...this._def,
            unknownKeys: "strip",
        });
    }
    passthrough() {
        return new ZodObject({
            ...this._def,
            unknownKeys: "passthrough",
        });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
        return new ZodObject({
            ...this._def,
            shape: () => ({
                ...this._def.shape(),
                ...augmentation,
            }),
        });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
        const merged = new ZodObject({
            unknownKeys: merging._def.unknownKeys,
            catchall: merging._def.catchall,
            shape: () => ({
                ...this._def.shape(),
                ...merging._def.shape(),
            }),
            typeName: ZodFirstPartyTypeKind.ZodObject,
        });
        return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
        return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
        return new ZodObject({
            ...this._def,
            catchall: index,
        });
    }
    pick(mask) {
        const shape = {};
        util.objectKeys(mask).forEach((key) => {
            if (mask[key] && this.shape[key]) {
                shape[key] = this.shape[key];
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => shape,
        });
    }
    omit(mask) {
        const shape = {};
        util.objectKeys(this.shape).forEach((key) => {
            if (!mask[key]) {
                shape[key] = this.shape[key];
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => shape,
        });
    }
    /**
     * @deprecated
     */
    deepPartial() {
        return deepPartialify(this);
    }
    partial(mask) {
        const newShape = {};
        util.objectKeys(this.shape).forEach((key) => {
            const fieldSchema = this.shape[key];
            if (mask && !mask[key]) {
                newShape[key] = fieldSchema;
            }
            else {
                newShape[key] = fieldSchema.optional();
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => newShape,
        });
    }
    required(mask) {
        const newShape = {};
        util.objectKeys(this.shape).forEach((key) => {
            if (mask && !mask[key]) {
                newShape[key] = this.shape[key];
            }
            else {
                const fieldSchema = this.shape[key];
                let newField = fieldSchema;
                while (newField instanceof ZodOptional) {
                    newField = newField._def.innerType;
                }
                newShape[key] = newField;
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => newShape,
        });
    }
    keyof() {
        return createZodEnum(util.objectKeys(this.shape));
    }
}
ZodObject.create = (shape, params) => {
    return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
class ZodUnion extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
            // return first issue-free validation if it exists
            for (const result of results) {
                if (result.result.status === "valid") {
                    return result.result;
                }
            }
            for (const result of results) {
                if (result.result.status === "dirty") {
                    // add issues from dirty option
                    ctx.common.issues.push(...result.ctx.common.issues);
                    return result.result;
                }
            }
            // return invalid
            const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union,
                unionErrors,
            });
            return INVALID;
        }
        if (ctx.common.async) {
            return Promise.all(options.map(async (option) => {
                const childCtx = {
                    ...ctx,
                    common: {
                        ...ctx.common,
                        issues: [],
                    },
                    parent: null,
                };
                return {
                    result: await option._parseAsync({
                        data: ctx.data,
                        path: ctx.path,
                        parent: childCtx,
                    }),
                    ctx: childCtx,
                };
            })).then(handleResults);
        }
        else {
            let dirty = undefined;
            const issues = [];
            for (const option of options) {
                const childCtx = {
                    ...ctx,
                    common: {
                        ...ctx.common,
                        issues: [],
                    },
                    parent: null,
                };
                const result = option._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: childCtx,
                });
                if (result.status === "valid") {
                    return result;
                }
                else if (result.status === "dirty" && !dirty) {
                    dirty = { result, ctx: childCtx };
                }
                if (childCtx.common.issues.length) {
                    issues.push(childCtx.common.issues);
                }
            }
            if (dirty) {
                ctx.common.issues.push(...dirty.ctx.common.issues);
                return dirty.result;
            }
            const unionErrors = issues.map((issues) => new ZodError(issues));
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union,
                unionErrors,
            });
            return INVALID;
        }
    }
    get options() {
        return this._def.options;
    }
}
ZodUnion.create = (types, params) => {
    return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params),
    });
};
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
//////////                                 //////////
//////////      ZodDiscriminatedUnion      //////////
//////////                                 //////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
const getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
    }
    else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
    }
    else if (type instanceof ZodLiteral) {
        return [type.value];
    }
    else if (type instanceof ZodEnum) {
        return type.options;
    }
    else if (type instanceof ZodNativeEnum) {
        // eslint-disable-next-line ban/ban
        return util.objectValues(type.enum);
    }
    else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
    }
    else if (type instanceof ZodUndefined) {
        return [undefined];
    }
    else if (type instanceof ZodNull) {
        return [null];
    }
    else if (type instanceof ZodOptional) {
        return [undefined, ...getDiscriminator(type.unwrap())];
    }
    else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
    }
    else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
    }
    else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
    }
    else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
    }
    else {
        return [];
    }
};
class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union_discriminator,
                options: Array.from(this.optionsMap.keys()),
                path: [discriminator],
            });
            return INVALID;
        }
        if (ctx.common.async) {
            return option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
        }
        else {
            return option._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
        }
    }
    get discriminator() {
        return this._def.discriminator;
    }
    get options() {
        return this._def.options;
    }
    get optionsMap() {
        return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
        // Get all the valid discriminator values
        const optionsMap = new Map();
        // try {
        for (const type of options) {
            const discriminatorValues = getDiscriminator(type.shape[discriminator]);
            if (!discriminatorValues.length) {
                throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
            }
            for (const value of discriminatorValues) {
                if (optionsMap.has(value)) {
                    throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
                }
                optionsMap.set(value, type);
            }
        }
        return new ZodDiscriminatedUnion({
            typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
            discriminator,
            options,
            optionsMap,
            ...processCreateParams(params),
        });
    }
}
function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
        return { valid: true, data: a };
    }
    else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
        const bKeys = util.objectKeys(b);
        const sharedKeys = util
            .objectKeys(a)
            .filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
            const sharedValue = mergeValues(a[key], b[key]);
            if (!sharedValue.valid) {
                return { valid: false };
            }
            newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
    }
    else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
        if (a.length !== b.length) {
            return { valid: false };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
            const itemA = a[index];
            const itemB = b[index];
            const sharedValue = mergeValues(itemA, itemB);
            if (!sharedValue.valid) {
                return { valid: false };
            }
            newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
    }
    else if (aType === ZodParsedType.date &&
        bType === ZodParsedType.date &&
        +a === +b) {
        return { valid: true, data: a };
    }
    else {
        return { valid: false };
    }
}
class ZodIntersection extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
            if (isAborted(parsedLeft) || isAborted(parsedRight)) {
                return INVALID;
            }
            const merged = mergeValues(parsedLeft.value, parsedRight.value);
            if (!merged.valid) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.invalid_intersection_types,
                });
                return INVALID;
            }
            if (isDirty(parsedLeft) || isDirty(parsedRight)) {
                status.dirty();
            }
            return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
            return Promise.all([
                this._def.left._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                }),
                this._def.right._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                }),
            ]).then(([left, right]) => handleParsed(left, right));
        }
        else {
            return handleParsed(this._def.left._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            }), this._def.right._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            }));
        }
    }
}
ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
        left: left,
        right: right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params),
    });
};
class ZodTuple extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.array) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.array,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: this._def.items.length,
                inclusive: true,
                exact: false,
                type: "array",
            });
            return INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: this._def.items.length,
                inclusive: true,
                exact: false,
                type: "array",
            });
            status.dirty();
        }
        const items = [...ctx.data]
            .map((item, itemIndex) => {
            const schema = this._def.items[itemIndex] || this._def.rest;
            if (!schema)
                return null;
            return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        })
            .filter((x) => !!x); // filter nulls
        if (ctx.common.async) {
            return Promise.all(items).then((results) => {
                return ParseStatus.mergeArray(status, results);
            });
        }
        else {
            return ParseStatus.mergeArray(status, items);
        }
    }
    get items() {
        return this._def.items;
    }
    rest(rest) {
        return new ZodTuple({
            ...this._def,
            rest,
        });
    }
}
ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params),
    });
};
class ZodRecord extends ZodType {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
            pairs.push({
                key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
                value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
                alwaysSet: key in ctx.data,
            });
        }
        if (ctx.common.async) {
            return ParseStatus.mergeObjectAsync(status, pairs);
        }
        else {
            return ParseStatus.mergeObjectSync(status, pairs);
        }
    }
    get element() {
        return this._def.valueType;
    }
    static create(first, second, third) {
        if (second instanceof ZodType) {
            return new ZodRecord({
                keyType: first,
                valueType: second,
                typeName: ZodFirstPartyTypeKind.ZodRecord,
                ...processCreateParams(third),
            });
        }
        return new ZodRecord({
            keyType: ZodString.create(),
            valueType: first,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(second),
        });
    }
}
class ZodMap extends ZodType {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.map) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.map,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
            return {
                key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
                value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"])),
            };
        });
        if (ctx.common.async) {
            const finalMap = new Map();
            return Promise.resolve().then(async () => {
                for (const pair of pairs) {
                    const key = await pair.key;
                    const value = await pair.value;
                    if (key.status === "aborted" || value.status === "aborted") {
                        return INVALID;
                    }
                    if (key.status === "dirty" || value.status === "dirty") {
                        status.dirty();
                    }
                    finalMap.set(key.value, value.value);
                }
                return { status: status.value, value: finalMap };
            });
        }
        else {
            const finalMap = new Map();
            for (const pair of pairs) {
                const key = pair.key;
                const value = pair.value;
                if (key.status === "aborted" || value.status === "aborted") {
                    return INVALID;
                }
                if (key.status === "dirty" || value.status === "dirty") {
                    status.dirty();
                }
                finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
        }
    }
}
ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params),
    });
};
class ZodSet extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.set) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.set,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
            if (ctx.data.size < def.minSize.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_small,
                    minimum: def.minSize.value,
                    type: "set",
                    inclusive: true,
                    exact: false,
                    message: def.minSize.message,
                });
                status.dirty();
            }
        }
        if (def.maxSize !== null) {
            if (ctx.data.size > def.maxSize.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_big,
                    maximum: def.maxSize.value,
                    type: "set",
                    inclusive: true,
                    exact: false,
                    message: def.maxSize.message,
                });
                status.dirty();
            }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements) {
            const parsedSet = new Set();
            for (const element of elements) {
                if (element.status === "aborted")
                    return INVALID;
                if (element.status === "dirty")
                    status.dirty();
                parsedSet.add(element.value);
            }
            return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
            return Promise.all(elements).then((elements) => finalizeSet(elements));
        }
        else {
            return finalizeSet(elements);
        }
    }
    min(minSize, message) {
        return new ZodSet({
            ...this._def,
            minSize: { value: minSize, message: errorUtil.toString(message) },
        });
    }
    max(maxSize, message) {
        return new ZodSet({
            ...this._def,
            maxSize: { value: maxSize, message: errorUtil.toString(message) },
        });
    }
    size(size, message) {
        return this.min(size, message).max(size, message);
    }
    nonempty(message) {
        return this.min(1, message);
    }
}
ZodSet.create = (valueType, params) => {
    return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params),
    });
};
class ZodFunction extends ZodType {
    constructor() {
        super(...arguments);
        this.validate = this.implement;
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.function) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.function,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        function makeArgsIssue(args, error) {
            return makeIssue({
                data: args,
                path: ctx.path,
                errorMaps: [
                    ctx.common.contextualErrorMap,
                    ctx.schemaErrorMap,
                    getErrorMap(),
                    errorMap,
                ].filter((x) => !!x),
                issueData: {
                    code: ZodIssueCode.invalid_arguments,
                    argumentsError: error,
                },
            });
        }
        function makeReturnsIssue(returns, error) {
            return makeIssue({
                data: returns,
                path: ctx.path,
                errorMaps: [
                    ctx.common.contextualErrorMap,
                    ctx.schemaErrorMap,
                    getErrorMap(),
                    errorMap,
                ].filter((x) => !!x),
                issueData: {
                    code: ZodIssueCode.invalid_return_type,
                    returnTypeError: error,
                },
            });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
            // Would love a way to avoid disabling this rule, but we need
            // an alias (using an arrow function was what caused 2651).
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const me = this;
            return OK(async function (...args) {
                const error = new ZodError([]);
                const parsedArgs = await me._def.args
                    .parseAsync(args, params)
                    .catch((e) => {
                    error.addIssue(makeArgsIssue(args, e));
                    throw error;
                });
                const result = await Reflect.apply(fn, this, parsedArgs);
                const parsedReturns = await me._def.returns._def.type
                    .parseAsync(result, params)
                    .catch((e) => {
                    error.addIssue(makeReturnsIssue(result, e));
                    throw error;
                });
                return parsedReturns;
            });
        }
        else {
            // Would love a way to avoid disabling this rule, but we need
            // an alias (using an arrow function was what caused 2651).
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const me = this;
            return OK(function (...args) {
                const parsedArgs = me._def.args.safeParse(args, params);
                if (!parsedArgs.success) {
                    throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
                }
                const result = Reflect.apply(fn, this, parsedArgs.data);
                const parsedReturns = me._def.returns.safeParse(result, params);
                if (!parsedReturns.success) {
                    throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
                }
                return parsedReturns.data;
            });
        }
    }
    parameters() {
        return this._def.args;
    }
    returnType() {
        return this._def.returns;
    }
    args(...items) {
        return new ZodFunction({
            ...this._def,
            args: ZodTuple.create(items).rest(ZodUnknown.create()),
        });
    }
    returns(returnType) {
        return new ZodFunction({
            ...this._def,
            returns: returnType,
        });
    }
    implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
    }
    strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
    }
    static create(args, returns, params) {
        return new ZodFunction({
            args: (args
                ? args
                : ZodTuple.create([]).rest(ZodUnknown.create())),
            returns: returns || ZodUnknown.create(),
            typeName: ZodFirstPartyTypeKind.ZodFunction,
            ...processCreateParams(params),
        });
    }
}
class ZodLazy extends ZodType {
    get schema() {
        return this._def.getter();
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
}
ZodLazy.create = (getter, params) => {
    return new ZodLazy({
        getter: getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params),
    });
};
class ZodLiteral extends ZodType {
    _parse(input) {
        if (input.data !== this._def.value) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_literal,
                expected: this._def.value,
            });
            return INVALID;
        }
        return { status: "valid", value: input.data };
    }
    get value() {
        return this._def.value;
    }
}
ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
        value: value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params),
    });
};
function createZodEnum(values, params) {
    return new ZodEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodEnum,
        ...processCreateParams(params),
    });
}
class ZodEnum extends ZodType {
    constructor() {
        super(...arguments);
        _ZodEnum_cache.set(this, void 0);
    }
    _parse(input) {
        if (typeof input.data !== "string") {
            const ctx = this._getOrReturnCtx(input);
            const expectedValues = this._def.values;
            addIssueToContext(ctx, {
                expected: util.joinValues(expectedValues),
                received: ctx.parsedType,
                code: ZodIssueCode.invalid_type,
            });
            return INVALID;
        }
        if (!__classPrivateFieldGet(this, _ZodEnum_cache)) {
            __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values));
        }
        if (!__classPrivateFieldGet(this, _ZodEnum_cache).has(input.data)) {
            const ctx = this._getOrReturnCtx(input);
            const expectedValues = this._def.values;
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_enum_value,
                options: expectedValues,
            });
            return INVALID;
        }
        return OK(input.data);
    }
    get options() {
        return this._def.values;
    }
    get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    extract(values, newDef = this._def) {
        return ZodEnum.create(values, {
            ...this._def,
            ...newDef,
        });
    }
    exclude(values, newDef = this._def) {
        return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
            ...this._def,
            ...newDef,
        });
    }
}
_ZodEnum_cache = new WeakMap();
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
    constructor() {
        super(...arguments);
        _ZodNativeEnum_cache.set(this, void 0);
    }
    _parse(input) {
        const nativeEnumValues = util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== ZodParsedType.string &&
            ctx.parsedType !== ZodParsedType.number) {
            const expectedValues = util.objectValues(nativeEnumValues);
            addIssueToContext(ctx, {
                expected: util.joinValues(expectedValues),
                received: ctx.parsedType,
                code: ZodIssueCode.invalid_type,
            });
            return INVALID;
        }
        if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache)) {
            __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)));
        }
        if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache).has(input.data)) {
            const expectedValues = util.objectValues(nativeEnumValues);
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_enum_value,
                options: expectedValues,
            });
            return INVALID;
        }
        return OK(input.data);
    }
    get enum() {
        return this._def.values;
    }
}
_ZodNativeEnum_cache = new WeakMap();
ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
        values: values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params),
    });
};
class ZodPromise extends ZodType {
    unwrap() {
        return this._def.type;
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.promise &&
            ctx.common.async === false) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.promise,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const promisified = ctx.parsedType === ZodParsedType.promise
            ? ctx.data
            : Promise.resolve(ctx.data);
        return OK(promisified.then((data) => {
            return this._def.type.parseAsync(data, {
                path: ctx.path,
                errorMap: ctx.common.contextualErrorMap,
            });
        }));
    }
}
ZodPromise.create = (schema, params) => {
    return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params),
    });
};
class ZodEffects extends ZodType {
    innerType() {
        return this._def.schema;
    }
    sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
            ? this._def.schema.sourceType()
            : this._def.schema;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
            addIssue: (arg) => {
                addIssueToContext(ctx, arg);
                if (arg.fatal) {
                    status.abort();
                }
                else {
                    status.dirty();
                }
            },
            get path() {
                return ctx.path;
            },
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
            const processed = effect.transform(ctx.data, checkCtx);
            if (ctx.common.async) {
                return Promise.resolve(processed).then(async (processed) => {
                    if (status.value === "aborted")
                        return INVALID;
                    const result = await this._def.schema._parseAsync({
                        data: processed,
                        path: ctx.path,
                        parent: ctx,
                    });
                    if (result.status === "aborted")
                        return INVALID;
                    if (result.status === "dirty")
                        return DIRTY(result.value);
                    if (status.value === "dirty")
                        return DIRTY(result.value);
                    return result;
                });
            }
            else {
                if (status.value === "aborted")
                    return INVALID;
                const result = this._def.schema._parseSync({
                    data: processed,
                    path: ctx.path,
                    parent: ctx,
                });
                if (result.status === "aborted")
                    return INVALID;
                if (result.status === "dirty")
                    return DIRTY(result.value);
                if (status.value === "dirty")
                    return DIRTY(result.value);
                return result;
            }
        }
        if (effect.type === "refinement") {
            const executeRefinement = (acc) => {
                const result = effect.refinement(acc, checkCtx);
                if (ctx.common.async) {
                    return Promise.resolve(result);
                }
                if (result instanceof Promise) {
                    throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
                }
                return acc;
            };
            if (ctx.common.async === false) {
                const inner = this._def.schema._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (inner.status === "aborted")
                    return INVALID;
                if (inner.status === "dirty")
                    status.dirty();
                // return value is ignored
                executeRefinement(inner.value);
                return { status: status.value, value: inner.value };
            }
            else {
                return this._def.schema
                    ._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx })
                    .then((inner) => {
                    if (inner.status === "aborted")
                        return INVALID;
                    if (inner.status === "dirty")
                        status.dirty();
                    return executeRefinement(inner.value).then(() => {
                        return { status: status.value, value: inner.value };
                    });
                });
            }
        }
        if (effect.type === "transform") {
            if (ctx.common.async === false) {
                const base = this._def.schema._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (!isValid(base))
                    return base;
                const result = effect.transform(base.value, checkCtx);
                if (result instanceof Promise) {
                    throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
                }
                return { status: status.value, value: result };
            }
            else {
                return this._def.schema
                    ._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx })
                    .then((base) => {
                    if (!isValid(base))
                        return base;
                    return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
                });
            }
        }
        util.assertNever(effect);
    }
}
ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params),
    });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params),
    });
};
class ZodOptional extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.undefined) {
            return OK(undefined);
        }
        return this._def.innerType._parse(input);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodOptional.create = (type, params) => {
    return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params),
    });
};
class ZodNullable extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.null) {
            return OK(null);
        }
        return this._def.innerType._parse(input);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodNullable.create = (type, params) => {
    return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params),
    });
};
class ZodDefault extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === ZodParsedType.undefined) {
            data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
            data,
            path: ctx.path,
            parent: ctx,
        });
    }
    removeDefault() {
        return this._def.innerType;
    }
}
ZodDefault.create = (type, params) => {
    return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function"
            ? params.default
            : () => params.default,
        ...processCreateParams(params),
    });
};
class ZodCatch extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        // newCtx is used to not collect issues from inner types in ctx
        const newCtx = {
            ...ctx,
            common: {
                ...ctx.common,
                issues: [],
            },
        };
        const result = this._def.innerType._parse({
            data: newCtx.data,
            path: newCtx.path,
            parent: {
                ...newCtx,
            },
        });
        if (isAsync(result)) {
            return result.then((result) => {
                return {
                    status: "valid",
                    value: result.status === "valid"
                        ? result.value
                        : this._def.catchValue({
                            get error() {
                                return new ZodError(newCtx.common.issues);
                            },
                            input: newCtx.data,
                        }),
                };
            });
        }
        else {
            return {
                status: "valid",
                value: result.status === "valid"
                    ? result.value
                    : this._def.catchValue({
                        get error() {
                            return new ZodError(newCtx.common.issues);
                        },
                        input: newCtx.data,
                    }),
            };
        }
    }
    removeCatch() {
        return this._def.innerType;
    }
}
ZodCatch.create = (type, params) => {
    return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params),
    });
};
class ZodNaN extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.nan) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.nan,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return { status: "valid", value: input.data };
    }
}
ZodNaN.create = (params) => {
    return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params),
    });
};
const BRAND = Symbol("zod_brand");
class ZodBranded extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
            data,
            path: ctx.path,
            parent: ctx,
        });
    }
    unwrap() {
        return this._def.type;
    }
}
class ZodPipeline extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
            const handleAsync = async () => {
                const inResult = await this._def.in._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (inResult.status === "aborted")
                    return INVALID;
                if (inResult.status === "dirty") {
                    status.dirty();
                    return DIRTY(inResult.value);
                }
                else {
                    return this._def.out._parseAsync({
                        data: inResult.value,
                        path: ctx.path,
                        parent: ctx,
                    });
                }
            };
            return handleAsync();
        }
        else {
            const inResult = this._def.in._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
            if (inResult.status === "aborted")
                return INVALID;
            if (inResult.status === "dirty") {
                status.dirty();
                return {
                    status: "dirty",
                    value: inResult.value,
                };
            }
            else {
                return this._def.out._parseSync({
                    data: inResult.value,
                    path: ctx.path,
                    parent: ctx,
                });
            }
        }
    }
    static create(a, b) {
        return new ZodPipeline({
            in: a,
            out: b,
            typeName: ZodFirstPartyTypeKind.ZodPipeline,
        });
    }
}
class ZodReadonly extends ZodType {
    _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
            if (isValid(data)) {
                data.value = Object.freeze(data.value);
            }
            return data;
        };
        return isAsync(result)
            ? result.then((data) => freeze(data))
            : freeze(result);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params),
    });
};
function custom(check, params = {}, 
/**
 * @deprecated
 *
 * Pass `fatal` into the params object instead:
 *
 * ```ts
 * z.string().custom((val) => val.length > 5, { fatal: false })
 * ```
 *
 */
fatal) {
    if (check)
        return ZodAny.create().superRefine((data, ctx) => {
            var _a, _b;
            if (!check(data)) {
                const p = typeof params === "function"
                    ? params(data)
                    : typeof params === "string"
                        ? { message: params }
                        : params;
                const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
                const p2 = typeof p === "string" ? { message: p } : p;
                ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
            }
        });
    return ZodAny.create();
}
const late = {
    object: ZodObject.lazycreate,
};
var ZodFirstPartyTypeKind;
(function (ZodFirstPartyTypeKind) {
    ZodFirstPartyTypeKind["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const instanceOfType = (
// const instanceOfType = <T extends new (...args: any[]) => any>(
cls, params = {
    message: `Input not instance of ${cls.name}`,
}) => custom((data) => data instanceof cls, params);
const stringType = ZodString.create;
const numberType = ZodNumber.create;
const nanType = ZodNaN.create;
const bigIntType = ZodBigInt.create;
const booleanType = ZodBoolean.create;
const dateType = ZodDate.create;
const symbolType = ZodSymbol.create;
const undefinedType = ZodUndefined.create;
const nullType = ZodNull.create;
const anyType = ZodAny.create;
const unknownType = ZodUnknown.create;
const neverType = ZodNever.create;
const voidType = ZodVoid.create;
const arrayType = ZodArray.create;
const objectType = ZodObject.create;
const strictObjectType = ZodObject.strictCreate;
const unionType = ZodUnion.create;
const discriminatedUnionType = ZodDiscriminatedUnion.create;
const intersectionType = ZodIntersection.create;
const tupleType = ZodTuple.create;
const recordType = ZodRecord.create;
const mapType = ZodMap.create;
const setType = ZodSet.create;
const functionType = ZodFunction.create;
const lazyType = ZodLazy.create;
const literalType = ZodLiteral.create;
const enumType = ZodEnum.create;
const nativeEnumType = ZodNativeEnum.create;
const promiseType = ZodPromise.create;
const effectsType = ZodEffects.create;
const optionalType = ZodOptional.create;
const nullableType = ZodNullable.create;
const preprocessType = ZodEffects.createWithPreprocess;
const pipelineType = ZodPipeline.create;
const ostring = () => stringType().optional();
const onumber = () => numberType().optional();
const oboolean = () => booleanType().optional();
const coerce = {
    string: ((arg) => ZodString.create({ ...arg, coerce: true })),
    number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
    boolean: ((arg) => ZodBoolean.create({
        ...arg,
        coerce: true,
    })),
    bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
    date: ((arg) => ZodDate.create({ ...arg, coerce: true })),
};
const NEVER = INVALID;

var z = /*#__PURE__*/Object.freeze({
    __proto__: null,
    defaultErrorMap: errorMap,
    setErrorMap: setErrorMap,
    getErrorMap: getErrorMap,
    makeIssue: makeIssue,
    EMPTY_PATH: EMPTY_PATH,
    addIssueToContext: addIssueToContext,
    ParseStatus: ParseStatus,
    INVALID: INVALID,
    DIRTY: DIRTY,
    OK: OK,
    isAborted: isAborted,
    isDirty: isDirty,
    isValid: isValid,
    isAsync: isAsync,
    get util () { return util; },
    get objectUtil () { return objectUtil; },
    ZodParsedType: ZodParsedType,
    getParsedType: getParsedType,
    ZodType: ZodType,
    datetimeRegex: datetimeRegex,
    ZodString: ZodString,
    ZodNumber: ZodNumber,
    ZodBigInt: ZodBigInt,
    ZodBoolean: ZodBoolean,
    ZodDate: ZodDate,
    ZodSymbol: ZodSymbol,
    ZodUndefined: ZodUndefined,
    ZodNull: ZodNull,
    ZodAny: ZodAny,
    ZodUnknown: ZodUnknown,
    ZodNever: ZodNever,
    ZodVoid: ZodVoid,
    ZodArray: ZodArray,
    ZodObject: ZodObject,
    ZodUnion: ZodUnion,
    ZodDiscriminatedUnion: ZodDiscriminatedUnion,
    ZodIntersection: ZodIntersection,
    ZodTuple: ZodTuple,
    ZodRecord: ZodRecord,
    ZodMap: ZodMap,
    ZodSet: ZodSet,
    ZodFunction: ZodFunction,
    ZodLazy: ZodLazy,
    ZodLiteral: ZodLiteral,
    ZodEnum: ZodEnum,
    ZodNativeEnum: ZodNativeEnum,
    ZodPromise: ZodPromise,
    ZodEffects: ZodEffects,
    ZodTransformer: ZodEffects,
    ZodOptional: ZodOptional,
    ZodNullable: ZodNullable,
    ZodDefault: ZodDefault,
    ZodCatch: ZodCatch,
    ZodNaN: ZodNaN,
    BRAND: BRAND,
    ZodBranded: ZodBranded,
    ZodPipeline: ZodPipeline,
    ZodReadonly: ZodReadonly,
    custom: custom,
    Schema: ZodType,
    ZodSchema: ZodType,
    late: late,
    get ZodFirstPartyTypeKind () { return ZodFirstPartyTypeKind; },
    coerce: coerce,
    any: anyType,
    array: arrayType,
    bigint: bigIntType,
    boolean: booleanType,
    date: dateType,
    discriminatedUnion: discriminatedUnionType,
    effect: effectsType,
    'enum': enumType,
    'function': functionType,
    'instanceof': instanceOfType,
    intersection: intersectionType,
    lazy: lazyType,
    literal: literalType,
    map: mapType,
    nan: nanType,
    nativeEnum: nativeEnumType,
    never: neverType,
    'null': nullType,
    nullable: nullableType,
    number: numberType,
    object: objectType,
    oboolean: oboolean,
    onumber: onumber,
    optional: optionalType,
    ostring: ostring,
    pipeline: pipelineType,
    preprocess: preprocessType,
    promise: promiseType,
    record: recordType,
    set: setType,
    strictObject: strictObjectType,
    string: stringType,
    symbol: symbolType,
    transformer: effectsType,
    tuple: tupleType,
    'undefined': undefinedType,
    union: unionType,
    unknown: unknownType,
    'void': voidType,
    NEVER: NEVER,
    ZodIssueCode: ZodIssueCode,
    quotelessJson: quotelessJson,
    ZodError: ZodError
});

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var pRetry$1 = {exports: {}};

var retry$1 = {};

var retry_operation;
var hasRequiredRetry_operation;

function requireRetry_operation () {
	if (hasRequiredRetry_operation) return retry_operation;
	hasRequiredRetry_operation = 1;
	function RetryOperation(timeouts, options) {
	  // Compatibility for the old (timeouts, retryForever) signature
	  if (typeof options === 'boolean') {
	    options = { forever: options };
	  }

	  this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
	  this._timeouts = timeouts;
	  this._options = options || {};
	  this._maxRetryTime = options && options.maxRetryTime || Infinity;
	  this._fn = null;
	  this._errors = [];
	  this._attempts = 1;
	  this._operationTimeout = null;
	  this._operationTimeoutCb = null;
	  this._timeout = null;
	  this._operationStart = null;
	  this._timer = null;

	  if (this._options.forever) {
	    this._cachedTimeouts = this._timeouts.slice(0);
	  }
	}
	retry_operation = RetryOperation;

	RetryOperation.prototype.reset = function() {
	  this._attempts = 1;
	  this._timeouts = this._originalTimeouts.slice(0);
	};

	RetryOperation.prototype.stop = function() {
	  if (this._timeout) {
	    clearTimeout(this._timeout);
	  }
	  if (this._timer) {
	    clearTimeout(this._timer);
	  }

	  this._timeouts       = [];
	  this._cachedTimeouts = null;
	};

	RetryOperation.prototype.retry = function(err) {
	  if (this._timeout) {
	    clearTimeout(this._timeout);
	  }

	  if (!err) {
	    return false;
	  }
	  var currentTime = new Date().getTime();
	  if (err && currentTime - this._operationStart >= this._maxRetryTime) {
	    this._errors.push(err);
	    this._errors.unshift(new Error('RetryOperation timeout occurred'));
	    return false;
	  }

	  this._errors.push(err);

	  var timeout = this._timeouts.shift();
	  if (timeout === undefined) {
	    if (this._cachedTimeouts) {
	      // retry forever, only keep last error
	      this._errors.splice(0, this._errors.length - 1);
	      timeout = this._cachedTimeouts.slice(-1);
	    } else {
	      return false;
	    }
	  }

	  var self = this;
	  this._timer = setTimeout(function() {
	    self._attempts++;

	    if (self._operationTimeoutCb) {
	      self._timeout = setTimeout(function() {
	        self._operationTimeoutCb(self._attempts);
	      }, self._operationTimeout);

	      if (self._options.unref) {
	          self._timeout.unref();
	      }
	    }

	    self._fn(self._attempts);
	  }, timeout);

	  if (this._options.unref) {
	      this._timer.unref();
	  }

	  return true;
	};

	RetryOperation.prototype.attempt = function(fn, timeoutOps) {
	  this._fn = fn;

	  if (timeoutOps) {
	    if (timeoutOps.timeout) {
	      this._operationTimeout = timeoutOps.timeout;
	    }
	    if (timeoutOps.cb) {
	      this._operationTimeoutCb = timeoutOps.cb;
	    }
	  }

	  var self = this;
	  if (this._operationTimeoutCb) {
	    this._timeout = setTimeout(function() {
	      self._operationTimeoutCb();
	    }, self._operationTimeout);
	  }

	  this._operationStart = new Date().getTime();

	  this._fn(this._attempts);
	};

	RetryOperation.prototype.try = function(fn) {
	  console.log('Using RetryOperation.try() is deprecated');
	  this.attempt(fn);
	};

	RetryOperation.prototype.start = function(fn) {
	  console.log('Using RetryOperation.start() is deprecated');
	  this.attempt(fn);
	};

	RetryOperation.prototype.start = RetryOperation.prototype.try;

	RetryOperation.prototype.errors = function() {
	  return this._errors;
	};

	RetryOperation.prototype.attempts = function() {
	  return this._attempts;
	};

	RetryOperation.prototype.mainError = function() {
	  if (this._errors.length === 0) {
	    return null;
	  }

	  var counts = {};
	  var mainError = null;
	  var mainErrorCount = 0;

	  for (var i = 0; i < this._errors.length; i++) {
	    var error = this._errors[i];
	    var message = error.message;
	    var count = (counts[message] || 0) + 1;

	    counts[message] = count;

	    if (count >= mainErrorCount) {
	      mainError = error;
	      mainErrorCount = count;
	    }
	  }

	  return mainError;
	};
	return retry_operation;
}

var hasRequiredRetry$1;

function requireRetry$1 () {
	if (hasRequiredRetry$1) return retry$1;
	hasRequiredRetry$1 = 1;
	(function (exports) {
		var RetryOperation = requireRetry_operation();

		exports.operation = function(options) {
		  var timeouts = exports.timeouts(options);
		  return new RetryOperation(timeouts, {
		      forever: options && (options.forever || options.retries === Infinity),
		      unref: options && options.unref,
		      maxRetryTime: options && options.maxRetryTime
		  });
		};

		exports.timeouts = function(options) {
		  if (options instanceof Array) {
		    return [].concat(options);
		  }

		  var opts = {
		    retries: 10,
		    factor: 2,
		    minTimeout: 1 * 1000,
		    maxTimeout: Infinity,
		    randomize: false
		  };
		  for (var key in options) {
		    opts[key] = options[key];
		  }

		  if (opts.minTimeout > opts.maxTimeout) {
		    throw new Error('minTimeout is greater than maxTimeout');
		  }

		  var timeouts = [];
		  for (var i = 0; i < opts.retries; i++) {
		    timeouts.push(this.createTimeout(i, opts));
		  }

		  if (options && options.forever && !timeouts.length) {
		    timeouts.push(this.createTimeout(i, opts));
		  }

		  // sort the array numerically ascending
		  timeouts.sort(function(a,b) {
		    return a - b;
		  });

		  return timeouts;
		};

		exports.createTimeout = function(attempt, opts) {
		  var random = (opts.randomize)
		    ? (Math.random() + 1)
		    : 1;

		  var timeout = Math.round(random * Math.max(opts.minTimeout, 1) * Math.pow(opts.factor, attempt));
		  timeout = Math.min(timeout, opts.maxTimeout);

		  return timeout;
		};

		exports.wrap = function(obj, options, methods) {
		  if (options instanceof Array) {
		    methods = options;
		    options = null;
		  }

		  if (!methods) {
		    methods = [];
		    for (var key in obj) {
		      if (typeof obj[key] === 'function') {
		        methods.push(key);
		      }
		    }
		  }

		  for (var i = 0; i < methods.length; i++) {
		    var method   = methods[i];
		    var original = obj[method];

		    obj[method] = function retryWrapper(original) {
		      var op       = exports.operation(options);
		      var args     = Array.prototype.slice.call(arguments, 1);
		      var callback = args.pop();

		      args.push(function(err) {
		        if (op.retry(err)) {
		          return;
		        }
		        if (err) {
		          arguments[0] = op.mainError();
		        }
		        callback.apply(this, arguments);
		      });

		      op.attempt(function() {
		        original.apply(obj, args);
		      });
		    }.bind(obj, original);
		    obj[method].options = options;
		  }
		}; 
	} (retry$1));
	return retry$1;
}

var retry;
var hasRequiredRetry;

function requireRetry () {
	if (hasRequiredRetry) return retry;
	hasRequiredRetry = 1;
	retry = requireRetry$1();
	return retry;
}

var hasRequiredPRetry;

function requirePRetry () {
	if (hasRequiredPRetry) return pRetry$1.exports;
	hasRequiredPRetry = 1;
	const retry = requireRetry();

	const networkErrorMsgs = [
		'Failed to fetch', // Chrome
		'NetworkError when attempting to fetch resource.', // Firefox
		'The Internet connection appears to be offline.', // Safari
		'Network request failed' // `cross-fetch`
	];

	class AbortError extends Error {
		constructor(message) {
			super();

			if (message instanceof Error) {
				this.originalError = message;
				({message} = message);
			} else {
				this.originalError = new Error(message);
				this.originalError.stack = this.stack;
			}

			this.name = 'AbortError';
			this.message = message;
		}
	}

	const decorateErrorWithCounts = (error, attemptNumber, options) => {
		// Minus 1 from attemptNumber because the first attempt does not count as a retry
		const retriesLeft = options.retries - (attemptNumber - 1);

		error.attemptNumber = attemptNumber;
		error.retriesLeft = retriesLeft;
		return error;
	};

	const isNetworkError = errorMessage => networkErrorMsgs.includes(errorMessage);

	const pRetry = (input, options) => new Promise((resolve, reject) => {
		options = {
			onFailedAttempt: () => {},
			retries: 10,
			...options
		};

		const operation = retry.operation(options);

		operation.attempt(async attemptNumber => {
			try {
				resolve(await input(attemptNumber));
			} catch (error) {
				if (!(error instanceof Error)) {
					reject(new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`));
					return;
				}

				if (error instanceof AbortError) {
					operation.stop();
					reject(error.originalError);
				} else if (error instanceof TypeError && !isNetworkError(error.message)) {
					operation.stop();
					reject(error);
				} else {
					decorateErrorWithCounts(error, attemptNumber, options);

					try {
						await options.onFailedAttempt(error);
					} catch (error) {
						reject(error);
						return;
					}

					if (!operation.retry(error)) {
						reject(operation.mainError());
					}
				}
			}
		});
	});

	pRetry$1.exports = pRetry;
	// TODO: remove this in the next major version
	pRetry$1.exports.default = pRetry;

	pRetry$1.exports.AbortError = AbortError;
	return pRetry$1.exports;
}

var pRetryExports = requirePRetry();
var pRetry = /*@__PURE__*/getDefaultExportFromCjs(pRetryExports);

var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

function validate$1(uuid) {
  return typeof uuid === 'string' && REGEX.test(uuid);
}

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  //
  // Note to future-self: No, you can't remove the `toLowerCase()` call.
  // REF: https://github.com/uuidjs/uuid/pull/677#issuecomment-1757351351
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).

var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }
  return getRandomValues(rnds8);
}

var randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native = {
  randomUUID
};

function v4(options, buf, offset) {
  if (native.randomUUID && !buf && !options) {
    return native.randomUUID();
  }
  options = options || {};
  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80;
  return unsafeStringify(rnds);
}

var dist = {};

var eventemitter3 = {exports: {}};

var hasRequiredEventemitter3;

function requireEventemitter3 () {
	if (hasRequiredEventemitter3) return eventemitter3.exports;
	hasRequiredEventemitter3 = 1;
	(function (module) {

		var has = Object.prototype.hasOwnProperty
		  , prefix = '~';

		/**
		 * Constructor to create a storage for our `EE` objects.
		 * An `Events` instance is a plain object whose properties are event names.
		 *
		 * @constructor
		 * @private
		 */
		function Events() {}

		//
		// We try to not inherit from `Object.prototype`. In some engines creating an
		// instance in this way is faster than calling `Object.create(null)` directly.
		// If `Object.create(null)` is not supported we prefix the event names with a
		// character to make sure that the built-in object properties are not
		// overridden or used as an attack vector.
		//
		if (Object.create) {
		  Events.prototype = Object.create(null);

		  //
		  // This hack is needed because the `__proto__` property is still inherited in
		  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
		  //
		  if (!new Events().__proto__) prefix = false;
		}

		/**
		 * Representation of a single event listener.
		 *
		 * @param {Function} fn The listener function.
		 * @param {*} context The context to invoke the listener with.
		 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
		 * @constructor
		 * @private
		 */
		function EE(fn, context, once) {
		  this.fn = fn;
		  this.context = context;
		  this.once = once || false;
		}

		/**
		 * Add a listener for a given event.
		 *
		 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn The listener function.
		 * @param {*} context The context to invoke the listener with.
		 * @param {Boolean} once Specify if the listener is a one-time listener.
		 * @returns {EventEmitter}
		 * @private
		 */
		function addListener(emitter, event, fn, context, once) {
		  if (typeof fn !== 'function') {
		    throw new TypeError('The listener must be a function');
		  }

		  var listener = new EE(fn, context || emitter, once)
		    , evt = prefix ? prefix + event : event;

		  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
		  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
		  else emitter._events[evt] = [emitter._events[evt], listener];

		  return emitter;
		}

		/**
		 * Clear event by name.
		 *
		 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
		 * @param {(String|Symbol)} evt The Event name.
		 * @private
		 */
		function clearEvent(emitter, evt) {
		  if (--emitter._eventsCount === 0) emitter._events = new Events();
		  else delete emitter._events[evt];
		}

		/**
		 * Minimal `EventEmitter` interface that is molded against the Node.js
		 * `EventEmitter` interface.
		 *
		 * @constructor
		 * @public
		 */
		function EventEmitter() {
		  this._events = new Events();
		  this._eventsCount = 0;
		}

		/**
		 * Return an array listing the events for which the emitter has registered
		 * listeners.
		 *
		 * @returns {Array}
		 * @public
		 */
		EventEmitter.prototype.eventNames = function eventNames() {
		  var names = []
		    , events
		    , name;

		  if (this._eventsCount === 0) return names;

		  for (name in (events = this._events)) {
		    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
		  }

		  if (Object.getOwnPropertySymbols) {
		    return names.concat(Object.getOwnPropertySymbols(events));
		  }

		  return names;
		};

		/**
		 * Return the listeners registered for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @returns {Array} The registered listeners.
		 * @public
		 */
		EventEmitter.prototype.listeners = function listeners(event) {
		  var evt = prefix ? prefix + event : event
		    , handlers = this._events[evt];

		  if (!handlers) return [];
		  if (handlers.fn) return [handlers.fn];

		  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
		    ee[i] = handlers[i].fn;
		  }

		  return ee;
		};

		/**
		 * Return the number of listeners listening to a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @returns {Number} The number of listeners.
		 * @public
		 */
		EventEmitter.prototype.listenerCount = function listenerCount(event) {
		  var evt = prefix ? prefix + event : event
		    , listeners = this._events[evt];

		  if (!listeners) return 0;
		  if (listeners.fn) return 1;
		  return listeners.length;
		};

		/**
		 * Calls each of the listeners registered for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @returns {Boolean} `true` if the event had listeners, else `false`.
		 * @public
		 */
		EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
		  var evt = prefix ? prefix + event : event;

		  if (!this._events[evt]) return false;

		  var listeners = this._events[evt]
		    , len = arguments.length
		    , args
		    , i;

		  if (listeners.fn) {
		    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

		    switch (len) {
		      case 1: return listeners.fn.call(listeners.context), true;
		      case 2: return listeners.fn.call(listeners.context, a1), true;
		      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
		      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
		      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
		      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
		    }

		    for (i = 1, args = new Array(len -1); i < len; i++) {
		      args[i - 1] = arguments[i];
		    }

		    listeners.fn.apply(listeners.context, args);
		  } else {
		    var length = listeners.length
		      , j;

		    for (i = 0; i < length; i++) {
		      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

		      switch (len) {
		        case 1: listeners[i].fn.call(listeners[i].context); break;
		        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
		        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
		        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
		        default:
		          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
		            args[j - 1] = arguments[j];
		          }

		          listeners[i].fn.apply(listeners[i].context, args);
		      }
		    }
		  }

		  return true;
		};

		/**
		 * Add a listener for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn The listener function.
		 * @param {*} [context=this] The context to invoke the listener with.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.on = function on(event, fn, context) {
		  return addListener(this, event, fn, context, false);
		};

		/**
		 * Add a one-time listener for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn The listener function.
		 * @param {*} [context=this] The context to invoke the listener with.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.once = function once(event, fn, context) {
		  return addListener(this, event, fn, context, true);
		};

		/**
		 * Remove the listeners of a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn Only remove the listeners that match this function.
		 * @param {*} context Only remove the listeners that have this context.
		 * @param {Boolean} once Only remove one-time listeners.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
		  var evt = prefix ? prefix + event : event;

		  if (!this._events[evt]) return this;
		  if (!fn) {
		    clearEvent(this, evt);
		    return this;
		  }

		  var listeners = this._events[evt];

		  if (listeners.fn) {
		    if (
		      listeners.fn === fn &&
		      (!once || listeners.once) &&
		      (!context || listeners.context === context)
		    ) {
		      clearEvent(this, evt);
		    }
		  } else {
		    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
		      if (
		        listeners[i].fn !== fn ||
		        (once && !listeners[i].once) ||
		        (context && listeners[i].context !== context)
		      ) {
		        events.push(listeners[i]);
		      }
		    }

		    //
		    // Reset the array, or remove it completely if we have no more listeners.
		    //
		    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
		    else clearEvent(this, evt);
		  }

		  return this;
		};

		/**
		 * Remove all listeners, or those of the specified event.
		 *
		 * @param {(String|Symbol)} [event] The event name.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
		  var evt;

		  if (event) {
		    evt = prefix ? prefix + event : event;
		    if (this._events[evt]) clearEvent(this, evt);
		  } else {
		    this._events = new Events();
		    this._eventsCount = 0;
		  }

		  return this;
		};

		//
		// Alias methods names because people roll like that.
		//
		EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
		EventEmitter.prototype.addListener = EventEmitter.prototype.on;

		//
		// Expose the prefix.
		//
		EventEmitter.prefixed = prefix;

		//
		// Allow `EventEmitter` to be imported as module namespace.
		//
		EventEmitter.EventEmitter = EventEmitter;

		//
		// Expose the module.
		//
		{
		  module.exports = EventEmitter;
		} 
	} (eventemitter3));
	return eventemitter3.exports;
}

var pTimeout = {exports: {}};

var pFinally;
var hasRequiredPFinally;

function requirePFinally () {
	if (hasRequiredPFinally) return pFinally;
	hasRequiredPFinally = 1;
	pFinally = (promise, onFinally) => {
		onFinally = onFinally || (() => {});

		return promise.then(
			val => new Promise(resolve => {
				resolve(onFinally());
			}).then(() => val),
			err => new Promise(resolve => {
				resolve(onFinally());
			}).then(() => {
				throw err;
			})
		);
	};
	return pFinally;
}

var hasRequiredPTimeout;

function requirePTimeout () {
	if (hasRequiredPTimeout) return pTimeout.exports;
	hasRequiredPTimeout = 1;

	const pFinally = requirePFinally();

	class TimeoutError extends Error {
		constructor(message) {
			super(message);
			this.name = 'TimeoutError';
		}
	}

	const pTimeout$1 = (promise, milliseconds, fallback) => new Promise((resolve, reject) => {
		if (typeof milliseconds !== 'number' || milliseconds < 0) {
			throw new TypeError('Expected `milliseconds` to be a positive number');
		}

		if (milliseconds === Infinity) {
			resolve(promise);
			return;
		}

		const timer = setTimeout(() => {
			if (typeof fallback === 'function') {
				try {
					resolve(fallback());
				} catch (error) {
					reject(error);
				}

				return;
			}

			const message = typeof fallback === 'string' ? fallback : `Promise timed out after ${milliseconds} milliseconds`;
			const timeoutError = fallback instanceof Error ? fallback : new TimeoutError(message);

			if (typeof promise.cancel === 'function') {
				promise.cancel();
			}

			reject(timeoutError);
		}, milliseconds);

		// TODO: Use native `finally` keyword when targeting Node.js 10
		pFinally(
			// eslint-disable-next-line promise/prefer-await-to-then
			promise.then(resolve, reject),
			() => {
				clearTimeout(timer);
			}
		);
	});

	pTimeout.exports = pTimeout$1;
	// TODO: Remove this for the next major release
	pTimeout.exports.default = pTimeout$1;

	pTimeout.exports.TimeoutError = TimeoutError;
	return pTimeout.exports;
}

var priorityQueue = {};

var lowerBound = {};

var hasRequiredLowerBound;

function requireLowerBound () {
	if (hasRequiredLowerBound) return lowerBound;
	hasRequiredLowerBound = 1;
	Object.defineProperty(lowerBound, "__esModule", { value: true });
	// Port of lower_bound from https://en.cppreference.com/w/cpp/algorithm/lower_bound
	// Used to compute insertion index to keep queue sorted after insertion
	function lowerBound$1(array, value, comparator) {
	    let first = 0;
	    let count = array.length;
	    while (count > 0) {
	        const step = (count / 2) | 0;
	        let it = first + step;
	        if (comparator(array[it], value) <= 0) {
	            first = ++it;
	            count -= step + 1;
	        }
	        else {
	            count = step;
	        }
	    }
	    return first;
	}
	lowerBound.default = lowerBound$1;
	return lowerBound;
}

var hasRequiredPriorityQueue;

function requirePriorityQueue () {
	if (hasRequiredPriorityQueue) return priorityQueue;
	hasRequiredPriorityQueue = 1;
	Object.defineProperty(priorityQueue, "__esModule", { value: true });
	const lower_bound_1 = requireLowerBound();
	class PriorityQueue {
	    constructor() {
	        this._queue = [];
	    }
	    enqueue(run, options) {
	        options = Object.assign({ priority: 0 }, options);
	        const element = {
	            priority: options.priority,
	            run
	        };
	        if (this.size && this._queue[this.size - 1].priority >= options.priority) {
	            this._queue.push(element);
	            return;
	        }
	        const index = lower_bound_1.default(this._queue, element, (a, b) => b.priority - a.priority);
	        this._queue.splice(index, 0, element);
	    }
	    dequeue() {
	        const item = this._queue.shift();
	        return item === null || item === void 0 ? void 0 : item.run;
	    }
	    filter(options) {
	        return this._queue.filter((element) => element.priority === options.priority).map((element) => element.run);
	    }
	    get size() {
	        return this._queue.length;
	    }
	}
	priorityQueue.default = PriorityQueue;
	return priorityQueue;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist;
	hasRequiredDist = 1;
	Object.defineProperty(dist, "__esModule", { value: true });
	const EventEmitter = requireEventemitter3();
	const p_timeout_1 = requirePTimeout();
	const priority_queue_1 = requirePriorityQueue();
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	const empty = () => { };
	const timeoutError = new p_timeout_1.TimeoutError();
	/**
	Promise queue with concurrency control.
	*/
	class PQueue extends EventEmitter {
	    constructor(options) {
	        var _a, _b, _c, _d;
	        super();
	        this._intervalCount = 0;
	        this._intervalEnd = 0;
	        this._pendingCount = 0;
	        this._resolveEmpty = empty;
	        this._resolveIdle = empty;
	        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	        options = Object.assign({ carryoverConcurrencyCount: false, intervalCap: Infinity, interval: 0, concurrency: Infinity, autoStart: true, queueClass: priority_queue_1.default }, options);
	        if (!(typeof options.intervalCap === 'number' && options.intervalCap >= 1)) {
	            throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${(_b = (_a = options.intervalCap) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : ''}\` (${typeof options.intervalCap})`);
	        }
	        if (options.interval === undefined || !(Number.isFinite(options.interval) && options.interval >= 0)) {
	            throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${(_d = (_c = options.interval) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ''}\` (${typeof options.interval})`);
	        }
	        this._carryoverConcurrencyCount = options.carryoverConcurrencyCount;
	        this._isIntervalIgnored = options.intervalCap === Infinity || options.interval === 0;
	        this._intervalCap = options.intervalCap;
	        this._interval = options.interval;
	        this._queue = new options.queueClass();
	        this._queueClass = options.queueClass;
	        this.concurrency = options.concurrency;
	        this._timeout = options.timeout;
	        this._throwOnTimeout = options.throwOnTimeout === true;
	        this._isPaused = options.autoStart === false;
	    }
	    get _doesIntervalAllowAnother() {
	        return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
	    }
	    get _doesConcurrentAllowAnother() {
	        return this._pendingCount < this._concurrency;
	    }
	    _next() {
	        this._pendingCount--;
	        this._tryToStartAnother();
	        this.emit('next');
	    }
	    _resolvePromises() {
	        this._resolveEmpty();
	        this._resolveEmpty = empty;
	        if (this._pendingCount === 0) {
	            this._resolveIdle();
	            this._resolveIdle = empty;
	            this.emit('idle');
	        }
	    }
	    _onResumeInterval() {
	        this._onInterval();
	        this._initializeIntervalIfNeeded();
	        this._timeoutId = undefined;
	    }
	    _isIntervalPaused() {
	        const now = Date.now();
	        if (this._intervalId === undefined) {
	            const delay = this._intervalEnd - now;
	            if (delay < 0) {
	                // Act as the interval was done
	                // We don't need to resume it here because it will be resumed on line 160
	                this._intervalCount = (this._carryoverConcurrencyCount) ? this._pendingCount : 0;
	            }
	            else {
	                // Act as the interval is pending
	                if (this._timeoutId === undefined) {
	                    this._timeoutId = setTimeout(() => {
	                        this._onResumeInterval();
	                    }, delay);
	                }
	                return true;
	            }
	        }
	        return false;
	    }
	    _tryToStartAnother() {
	        if (this._queue.size === 0) {
	            // We can clear the interval ("pause")
	            // Because we can redo it later ("resume")
	            if (this._intervalId) {
	                clearInterval(this._intervalId);
	            }
	            this._intervalId = undefined;
	            this._resolvePromises();
	            return false;
	        }
	        if (!this._isPaused) {
	            const canInitializeInterval = !this._isIntervalPaused();
	            if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
	                const job = this._queue.dequeue();
	                if (!job) {
	                    return false;
	                }
	                this.emit('active');
	                job();
	                if (canInitializeInterval) {
	                    this._initializeIntervalIfNeeded();
	                }
	                return true;
	            }
	        }
	        return false;
	    }
	    _initializeIntervalIfNeeded() {
	        if (this._isIntervalIgnored || this._intervalId !== undefined) {
	            return;
	        }
	        this._intervalId = setInterval(() => {
	            this._onInterval();
	        }, this._interval);
	        this._intervalEnd = Date.now() + this._interval;
	    }
	    _onInterval() {
	        if (this._intervalCount === 0 && this._pendingCount === 0 && this._intervalId) {
	            clearInterval(this._intervalId);
	            this._intervalId = undefined;
	        }
	        this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
	        this._processQueue();
	    }
	    /**
	    Executes all queued functions until it reaches the limit.
	    */
	    _processQueue() {
	        // eslint-disable-next-line no-empty
	        while (this._tryToStartAnother()) { }
	    }
	    get concurrency() {
	        return this._concurrency;
	    }
	    set concurrency(newConcurrency) {
	        if (!(typeof newConcurrency === 'number' && newConcurrency >= 1)) {
	            throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
	        }
	        this._concurrency = newConcurrency;
	        this._processQueue();
	    }
	    /**
	    Adds a sync or async task to the queue. Always returns a promise.
	    */
	    async add(fn, options = {}) {
	        return new Promise((resolve, reject) => {
	            const run = async () => {
	                this._pendingCount++;
	                this._intervalCount++;
	                try {
	                    const operation = (this._timeout === undefined && options.timeout === undefined) ? fn() : p_timeout_1.default(Promise.resolve(fn()), (options.timeout === undefined ? this._timeout : options.timeout), () => {
	                        if (options.throwOnTimeout === undefined ? this._throwOnTimeout : options.throwOnTimeout) {
	                            reject(timeoutError);
	                        }
	                        return undefined;
	                    });
	                    resolve(await operation);
	                }
	                catch (error) {
	                    reject(error);
	                }
	                this._next();
	            };
	            this._queue.enqueue(run, options);
	            this._tryToStartAnother();
	            this.emit('add');
	        });
	    }
	    /**
	    Same as `.add()`, but accepts an array of sync or async functions.

	    @returns A promise that resolves when all functions are resolved.
	    */
	    async addAll(functions, options) {
	        return Promise.all(functions.map(async (function_) => this.add(function_, options)));
	    }
	    /**
	    Start (or resume) executing enqueued tasks within concurrency limit. No need to call this if queue is not paused (via `options.autoStart = false` or by `.pause()` method.)
	    */
	    start() {
	        if (!this._isPaused) {
	            return this;
	        }
	        this._isPaused = false;
	        this._processQueue();
	        return this;
	    }
	    /**
	    Put queue execution on hold.
	    */
	    pause() {
	        this._isPaused = true;
	    }
	    /**
	    Clear the queue.
	    */
	    clear() {
	        this._queue = new this._queueClass();
	    }
	    /**
	    Can be called multiple times. Useful if you for example add additional items at a later time.

	    @returns A promise that settles when the queue becomes empty.
	    */
	    async onEmpty() {
	        // Instantly resolve if the queue is empty
	        if (this._queue.size === 0) {
	            return;
	        }
	        return new Promise(resolve => {
	            const existingResolve = this._resolveEmpty;
	            this._resolveEmpty = () => {
	                existingResolve();
	                resolve();
	            };
	        });
	    }
	    /**
	    The difference with `.onEmpty` is that `.onIdle` guarantees that all work from the queue has finished. `.onEmpty` merely signals that the queue is empty, but it could mean that some promises haven't completed yet.

	    @returns A promise that settles when the queue becomes empty, and all promises have completed; `queue.size === 0 && queue.pending === 0`.
	    */
	    async onIdle() {
	        // Instantly resolve if none pending and if nothing else is queued
	        if (this._pendingCount === 0 && this._queue.size === 0) {
	            return;
	        }
	        return new Promise(resolve => {
	            const existingResolve = this._resolveIdle;
	            this._resolveIdle = () => {
	                existingResolve();
	                resolve();
	            };
	        });
	    }
	    /**
	    Size of the queue.
	    */
	    get size() {
	        return this._queue.size;
	    }
	    /**
	    Size of the queue, filtered by the given options.

	    For example, this can be used to find the number of items remaining in the queue with a specific priority level.
	    */
	    sizeBy(options) {
	        // eslint-disable-next-line unicorn/no-fn-reference-in-iterator
	        return this._queue.filter(options).length;
	    }
	    /**
	    Number of pending promises.
	    */
	    get pending() {
	        return this._pendingCount;
	    }
	    /**
	    Whether the queue is currently paused.
	    */
	    get isPaused() {
	        return this._isPaused;
	    }
	    get timeout() {
	        return this._timeout;
	    }
	    /**
	    Set the timeout for future operations.
	    */
	    set timeout(milliseconds) {
	        this._timeout = milliseconds;
	    }
	}
	dist.default = PQueue;
	return dist;
}

var distExports = requireDist();
var PQueueMod = /*@__PURE__*/getDefaultExportFromCjs(distExports);

// Wrap the default fetch call due to issues with illegal invocations
// in some environments:
// https://stackoverflow.com/questions/69876859/why-does-bind-fix-failed-to-execute-fetch-on-window-illegal-invocation-err
// @ts-expect-error Broad typing to support a range of fetch implementations
const DEFAULT_FETCH_IMPLEMENTATION = (...args) => fetch(...args);
const LANGSMITH_FETCH_IMPLEMENTATION_KEY = Symbol.for("ls:fetch_implementation");
/**
 * @internal
 */
const _getFetchImplementation = () => {
    return (globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY] ??
        DEFAULT_FETCH_IMPLEMENTATION);
};

const STATUS_NO_RETRY$1 = [
    400, // Bad Request
    401, // Unauthorized
    403, // Forbidden
    404, // Not Found
    405, // Method Not Allowed
    406, // Not Acceptable
    407, // Proxy Authentication Required
    408, // Request Timeout
];
const STATUS_IGNORE = [
    409, // Conflict
];
/**
 * A class that can be used to make async calls with concurrency and retry logic.
 *
 * This is useful for making calls to any kind of "expensive" external resource,
 * be it because it's rate-limited, subject to network issues, etc.
 *
 * Concurrent calls are limited by the `maxConcurrency` parameter, which defaults
 * to `Infinity`. This means that by default, all calls will be made in parallel.
 *
 * Retries are limited by the `maxRetries` parameter, which defaults to 6. This
 * means that by default, each call will be retried up to 6 times, with an
 * exponential backoff between each attempt.
 */
let AsyncCaller$1 = class AsyncCaller {
    constructor(params) {
        Object.defineProperty(this, "maxConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxRetries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onFailedResponseHook", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxConcurrency = params.maxConcurrency ?? Infinity;
        this.maxRetries = params.maxRetries ?? 6;
        if ("default" in PQueueMod) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.queue = new PQueueMod.default({
                concurrency: this.maxConcurrency,
            });
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.queue = new PQueueMod({ concurrency: this.maxConcurrency });
        }
        this.onFailedResponseHook = params?.onFailedResponseHook;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call(callable, ...args) {
        const onFailedResponseHook = this.onFailedResponseHook;
        return this.queue.add(() => pRetry(() => callable(...args).catch((error) => {
            // eslint-disable-next-line no-instanceof/no-instanceof
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(error);
            }
        }), {
            async onFailedAttempt(error) {
                if (error.message.startsWith("Cancel") ||
                    error.message.startsWith("TimeoutError") ||
                    error.message.startsWith("AbortError")) {
                    throw error;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (error?.code === "ECONNABORTED") {
                    throw error;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const response = error?.response;
                const status = response?.status;
                if (status) {
                    if (STATUS_NO_RETRY$1.includes(+status)) {
                        throw error;
                    }
                    else if (STATUS_IGNORE.includes(+status)) {
                        return;
                    }
                    if (onFailedResponseHook) {
                        await onFailedResponseHook(response);
                    }
                }
            },
            // If needed we can change some of the defaults here,
            // but they're quite sensible.
            retries: this.maxRetries,
            randomize: true,
        }), { throwOnTimeout: true });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callWithOptions(options, callable, ...args) {
        // Note this doesn't cancel the underlying request,
        // when available prefer to use the signal option of the underlying call
        if (options.signal) {
            return Promise.race([
                this.call(callable, ...args),
                new Promise((_, reject) => {
                    options.signal?.addEventListener("abort", () => {
                        reject(new Error("AbortError"));
                    });
                }),
            ]);
        }
        return this.call(callable, ...args);
    }
    fetch(...args) {
        return this.call(() => _getFetchImplementation()(...args).then((res) => res.ok ? res : Promise.reject(res)));
    }
};

function isLangChainMessage(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
message) {
    return typeof message?._getType === "function";
}
function convertLangChainMessageToExample(message) {
    const converted = {
        type: message._getType(),
        data: { content: message.content },
    };
    // Check for presence of keys in additional_kwargs
    if (message?.additional_kwargs &&
        Object.keys(message.additional_kwargs).length > 0) {
        converted.data.additional_kwargs = { ...message.additional_kwargs };
    }
    return converted;
}

function assertUuid(str, which) {
    if (!validate$1(str)) {
        const msg = which !== undefined
            ? `Invalid UUID for ${which}: ${str}`
            : `Invalid UUID: ${str}`;
        throw new Error(msg);
    }
    return str;
}

const warnedMessages = {};
function warnOnce(message) {
    if (!warnedMessages[message]) {
        console.warn(message);
        warnedMessages[message] = true;
    }
}

var re = {exports: {}};

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;
	// Note: this is the semver.org version of the spec that it implements
	// Not necessarily the package version of this code.
	const SEMVER_SPEC_VERSION = '2.0.0';

	const MAX_LENGTH = 256;
	const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
	/* istanbul ignore next */ 9007199254740991;

	// Max safe segment length for coercion.
	const MAX_SAFE_COMPONENT_LENGTH = 16;

	// Max safe length for a build identifier. The max length minus 6 characters for
	// the shortest version with a build 0.0.0+BUILD.
	const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;

	const RELEASE_TYPES = [
	  'major',
	  'premajor',
	  'minor',
	  'preminor',
	  'patch',
	  'prepatch',
	  'prerelease',
	];

	constants = {
	  MAX_LENGTH,
	  MAX_SAFE_COMPONENT_LENGTH,
	  MAX_SAFE_BUILD_LENGTH,
	  MAX_SAFE_INTEGER,
	  RELEASE_TYPES,
	  SEMVER_SPEC_VERSION,
	  FLAG_INCLUDE_PRERELEASE: 0b001,
	  FLAG_LOOSE: 0b010,
	};
	return constants;
}

var debug_1;
var hasRequiredDebug;

function requireDebug () {
	if (hasRequiredDebug) return debug_1;
	hasRequiredDebug = 1;
	const debug = (
	  typeof process === 'object' &&
	  process.env &&
	  process.env.NODE_DEBUG &&
	  /\bsemver\b/i.test(process.env.NODE_DEBUG)
	) ? (...args) => console.error('SEMVER', ...args)
	  : () => {};

	debug_1 = debug;
	return debug_1;
}

var hasRequiredRe;

function requireRe () {
	if (hasRequiredRe) return re.exports;
	hasRequiredRe = 1;
	(function (module, exports) {
		const {
		  MAX_SAFE_COMPONENT_LENGTH,
		  MAX_SAFE_BUILD_LENGTH,
		  MAX_LENGTH,
		} = requireConstants();
		const debug = requireDebug();
		exports = module.exports = {};

		// The actual regexps go on exports.re
		const re = exports.re = [];
		const safeRe = exports.safeRe = [];
		const src = exports.src = [];
		const t = exports.t = {};
		let R = 0;

		const LETTERDASHNUMBER = '[a-zA-Z0-9-]';

		// Replace some greedy regex tokens to prevent regex dos issues. These regex are
		// used internally via the safeRe object since all inputs in this library get
		// normalized first to trim and collapse all extra whitespace. The original
		// regexes are exported for userland consumption and lower level usage. A
		// future breaking change could export the safer regex only with a note that
		// all input should have extra whitespace removed.
		const safeRegexReplacements = [
		  ['\\s', 1],
		  ['\\d', MAX_LENGTH],
		  [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
		];

		const makeSafeRegex = (value) => {
		  for (const [token, max] of safeRegexReplacements) {
		    value = value
		      .split(`${token}*`).join(`${token}{0,${max}}`)
		      .split(`${token}+`).join(`${token}{1,${max}}`);
		  }
		  return value
		};

		const createToken = (name, value, isGlobal) => {
		  const safe = makeSafeRegex(value);
		  const index = R++;
		  debug(name, index, value);
		  t[name] = index;
		  src[index] = value;
		  re[index] = new RegExp(value, isGlobal ? 'g' : undefined);
		  safeRe[index] = new RegExp(safe, isGlobal ? 'g' : undefined);
		};

		// The following Regular Expressions can be used for tokenizing,
		// validating, and parsing SemVer version strings.

		// ## Numeric Identifier
		// A single `0`, or a non-zero digit followed by zero or more digits.

		createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*');
		createToken('NUMERICIDENTIFIERLOOSE', '\\d+');

		// ## Non-numeric Identifier
		// Zero or more digits, followed by a letter or hyphen, and then zero or
		// more letters, digits, or hyphens.

		createToken('NONNUMERICIDENTIFIER', `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);

		// ## Main Version
		// Three dot-separated numeric identifiers.

		createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` +
		                   `(${src[t.NUMERICIDENTIFIER]})\\.` +
		                   `(${src[t.NUMERICIDENTIFIER]})`);

		createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
		                        `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
		                        `(${src[t.NUMERICIDENTIFIERLOOSE]})`);

		// ## Pre-release Version Identifier
		// A numeric identifier, or a non-numeric identifier.

		createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NUMERICIDENTIFIER]
		}|${src[t.NONNUMERICIDENTIFIER]})`);

		createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NUMERICIDENTIFIERLOOSE]
		}|${src[t.NONNUMERICIDENTIFIER]})`);

		// ## Pre-release Version
		// Hyphen, followed by one or more dot-separated pre-release version
		// identifiers.

		createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]
		}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);

		createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]
		}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);

		// ## Build Metadata Identifier
		// Any combination of digits, letters, or hyphens.

		createToken('BUILDIDENTIFIER', `${LETTERDASHNUMBER}+`);

		// ## Build Metadata
		// Plus sign, followed by one or more period-separated build metadata
		// identifiers.

		createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]
		}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);

		// ## Full Version String
		// A main version, followed optionally by a pre-release version and
		// build metadata.

		// Note that the only major, minor, patch, and pre-release sections of
		// the version string are capturing groups.  The build metadata is not a
		// capturing group, because it should not ever be used in version
		// comparison.

		createToken('FULLPLAIN', `v?${src[t.MAINVERSION]
		}${src[t.PRERELEASE]}?${
		  src[t.BUILD]}?`);

		createToken('FULL', `^${src[t.FULLPLAIN]}$`);

		// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
		// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
		// common in the npm registry.
		createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]
		}${src[t.PRERELEASELOOSE]}?${
		  src[t.BUILD]}?`);

		createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`);

		createToken('GTLT', '((?:<|>)?=?)');

		// Something like "2.*" or "1.2.x".
		// Note that "x.x" is a valid xRange identifer, meaning "any version"
		// Only the first item is strictly required.
		createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
		createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);

		createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` +
		                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
		                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
		                   `(?:${src[t.PRERELEASE]})?${
		                     src[t.BUILD]}?` +
		                   `)?)?`);

		createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` +
		                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
		                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
		                        `(?:${src[t.PRERELEASELOOSE]})?${
		                          src[t.BUILD]}?` +
		                        `)?)?`);

		createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
		createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);

		// Coercion.
		// Extract anything that could conceivably be a part of a valid semver
		createToken('COERCEPLAIN', `${'(^|[^\\d])' +
		              '(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})` +
		              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
		              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
		createToken('COERCE', `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
		createToken('COERCEFULL', src[t.COERCEPLAIN] +
		              `(?:${src[t.PRERELEASE]})?` +
		              `(?:${src[t.BUILD]})?` +
		              `(?:$|[^\\d])`);
		createToken('COERCERTL', src[t.COERCE], true);
		createToken('COERCERTLFULL', src[t.COERCEFULL], true);

		// Tilde ranges.
		// Meaning is "reasonably at or greater than"
		createToken('LONETILDE', '(?:~>?)');

		createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true);
		exports.tildeTrimReplace = '$1~';

		createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
		createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);

		// Caret ranges.
		// Meaning is "at least and backwards compatible with"
		createToken('LONECARET', '(?:\\^)');

		createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true);
		exports.caretTrimReplace = '$1^';

		createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
		createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);

		// A simple gt/lt/eq thing, or just "" to indicate "any version"
		createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
		createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);

		// An expression to strip any whitespace between the gtlt and the thing
		// it modifies, so that `> 1.2.3` ==> `>1.2.3`
		createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]
		}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
		exports.comparatorTrimReplace = '$1$2$3';

		// Something like `1.2.3 - 1.2.4`
		// Note that these all use the loose form, because they'll be
		// checked against either the strict or loose comparator form
		// later.
		createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` +
		                   `\\s+-\\s+` +
		                   `(${src[t.XRANGEPLAIN]})` +
		                   `\\s*$`);

		createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` +
		                        `\\s+-\\s+` +
		                        `(${src[t.XRANGEPLAINLOOSE]})` +
		                        `\\s*$`);

		// Star ranges basically just allow anything at all.
		createToken('STAR', '(<|>)?=?\\s*\\*');
		// >=0.0.0 is like a star
		createToken('GTE0', '^\\s*>=\\s*0\\.0\\.0\\s*$');
		createToken('GTE0PRE', '^\\s*>=\\s*0\\.0\\.0-0\\s*$'); 
	} (re, re.exports));
	return re.exports;
}

var parseOptions_1;
var hasRequiredParseOptions;

function requireParseOptions () {
	if (hasRequiredParseOptions) return parseOptions_1;
	hasRequiredParseOptions = 1;
	// parse out just the options we care about
	const looseOption = Object.freeze({ loose: true });
	const emptyOpts = Object.freeze({ });
	const parseOptions = options => {
	  if (!options) {
	    return emptyOpts
	  }

	  if (typeof options !== 'object') {
	    return looseOption
	  }

	  return options
	};
	parseOptions_1 = parseOptions;
	return parseOptions_1;
}

var identifiers;
var hasRequiredIdentifiers;

function requireIdentifiers () {
	if (hasRequiredIdentifiers) return identifiers;
	hasRequiredIdentifiers = 1;
	const numeric = /^[0-9]+$/;
	const compareIdentifiers = (a, b) => {
	  const anum = numeric.test(a);
	  const bnum = numeric.test(b);

	  if (anum && bnum) {
	    a = +a;
	    b = +b;
	  }

	  return a === b ? 0
	    : (anum && !bnum) ? -1
	    : (bnum && !anum) ? 1
	    : a < b ? -1
	    : 1
	};

	const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);

	identifiers = {
	  compareIdentifiers,
	  rcompareIdentifiers,
	};
	return identifiers;
}

var semver$1;
var hasRequiredSemver$1;

function requireSemver$1 () {
	if (hasRequiredSemver$1) return semver$1;
	hasRequiredSemver$1 = 1;
	const debug = requireDebug();
	const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants();
	const { safeRe: re, t } = requireRe();

	const parseOptions = requireParseOptions();
	const { compareIdentifiers } = requireIdentifiers();
	class SemVer {
	  constructor (version, options) {
	    options = parseOptions(options);

	    if (version instanceof SemVer) {
	      if (version.loose === !!options.loose &&
	          version.includePrerelease === !!options.includePrerelease) {
	        return version
	      } else {
	        version = version.version;
	      }
	    } else if (typeof version !== 'string') {
	      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`)
	    }

	    if (version.length > MAX_LENGTH) {
	      throw new TypeError(
	        `version is longer than ${MAX_LENGTH} characters`
	      )
	    }

	    debug('SemVer', version, options);
	    this.options = options;
	    this.loose = !!options.loose;
	    // this isn't actually relevant for versions, but keep it so that we
	    // don't run into trouble passing this.options around.
	    this.includePrerelease = !!options.includePrerelease;

	    const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);

	    if (!m) {
	      throw new TypeError(`Invalid Version: ${version}`)
	    }

	    this.raw = version;

	    // these are actually numbers
	    this.major = +m[1];
	    this.minor = +m[2];
	    this.patch = +m[3];

	    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
	      throw new TypeError('Invalid major version')
	    }

	    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
	      throw new TypeError('Invalid minor version')
	    }

	    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
	      throw new TypeError('Invalid patch version')
	    }

	    // numberify any prerelease numeric ids
	    if (!m[4]) {
	      this.prerelease = [];
	    } else {
	      this.prerelease = m[4].split('.').map((id) => {
	        if (/^[0-9]+$/.test(id)) {
	          const num = +id;
	          if (num >= 0 && num < MAX_SAFE_INTEGER) {
	            return num
	          }
	        }
	        return id
	      });
	    }

	    this.build = m[5] ? m[5].split('.') : [];
	    this.format();
	  }

	  format () {
	    this.version = `${this.major}.${this.minor}.${this.patch}`;
	    if (this.prerelease.length) {
	      this.version += `-${this.prerelease.join('.')}`;
	    }
	    return this.version
	  }

	  toString () {
	    return this.version
	  }

	  compare (other) {
	    debug('SemVer.compare', this.version, this.options, other);
	    if (!(other instanceof SemVer)) {
	      if (typeof other === 'string' && other === this.version) {
	        return 0
	      }
	      other = new SemVer(other, this.options);
	    }

	    if (other.version === this.version) {
	      return 0
	    }

	    return this.compareMain(other) || this.comparePre(other)
	  }

	  compareMain (other) {
	    if (!(other instanceof SemVer)) {
	      other = new SemVer(other, this.options);
	    }

	    return (
	      compareIdentifiers(this.major, other.major) ||
	      compareIdentifiers(this.minor, other.minor) ||
	      compareIdentifiers(this.patch, other.patch)
	    )
	  }

	  comparePre (other) {
	    if (!(other instanceof SemVer)) {
	      other = new SemVer(other, this.options);
	    }

	    // NOT having a prerelease is > having one
	    if (this.prerelease.length && !other.prerelease.length) {
	      return -1
	    } else if (!this.prerelease.length && other.prerelease.length) {
	      return 1
	    } else if (!this.prerelease.length && !other.prerelease.length) {
	      return 0
	    }

	    let i = 0;
	    do {
	      const a = this.prerelease[i];
	      const b = other.prerelease[i];
	      debug('prerelease compare', i, a, b);
	      if (a === undefined && b === undefined) {
	        return 0
	      } else if (b === undefined) {
	        return 1
	      } else if (a === undefined) {
	        return -1
	      } else if (a === b) {
	        continue
	      } else {
	        return compareIdentifiers(a, b)
	      }
	    } while (++i)
	  }

	  compareBuild (other) {
	    if (!(other instanceof SemVer)) {
	      other = new SemVer(other, this.options);
	    }

	    let i = 0;
	    do {
	      const a = this.build[i];
	      const b = other.build[i];
	      debug('build compare', i, a, b);
	      if (a === undefined && b === undefined) {
	        return 0
	      } else if (b === undefined) {
	        return 1
	      } else if (a === undefined) {
	        return -1
	      } else if (a === b) {
	        continue
	      } else {
	        return compareIdentifiers(a, b)
	      }
	    } while (++i)
	  }

	  // preminor will bump the version up to the next minor release, and immediately
	  // down to pre-release. premajor and prepatch work the same way.
	  inc (release, identifier, identifierBase) {
	    switch (release) {
	      case 'premajor':
	        this.prerelease.length = 0;
	        this.patch = 0;
	        this.minor = 0;
	        this.major++;
	        this.inc('pre', identifier, identifierBase);
	        break
	      case 'preminor':
	        this.prerelease.length = 0;
	        this.patch = 0;
	        this.minor++;
	        this.inc('pre', identifier, identifierBase);
	        break
	      case 'prepatch':
	        // If this is already a prerelease, it will bump to the next version
	        // drop any prereleases that might already exist, since they are not
	        // relevant at this point.
	        this.prerelease.length = 0;
	        this.inc('patch', identifier, identifierBase);
	        this.inc('pre', identifier, identifierBase);
	        break
	      // If the input is a non-prerelease version, this acts the same as
	      // prepatch.
	      case 'prerelease':
	        if (this.prerelease.length === 0) {
	          this.inc('patch', identifier, identifierBase);
	        }
	        this.inc('pre', identifier, identifierBase);
	        break

	      case 'major':
	        // If this is a pre-major version, bump up to the same major version.
	        // Otherwise increment major.
	        // 1.0.0-5 bumps to 1.0.0
	        // 1.1.0 bumps to 2.0.0
	        if (
	          this.minor !== 0 ||
	          this.patch !== 0 ||
	          this.prerelease.length === 0
	        ) {
	          this.major++;
	        }
	        this.minor = 0;
	        this.patch = 0;
	        this.prerelease = [];
	        break
	      case 'minor':
	        // If this is a pre-minor version, bump up to the same minor version.
	        // Otherwise increment minor.
	        // 1.2.0-5 bumps to 1.2.0
	        // 1.2.1 bumps to 1.3.0
	        if (this.patch !== 0 || this.prerelease.length === 0) {
	          this.minor++;
	        }
	        this.patch = 0;
	        this.prerelease = [];
	        break
	      case 'patch':
	        // If this is not a pre-release version, it will increment the patch.
	        // If it is a pre-release it will bump up to the same patch version.
	        // 1.2.0-5 patches to 1.2.0
	        // 1.2.0 patches to 1.2.1
	        if (this.prerelease.length === 0) {
	          this.patch++;
	        }
	        this.prerelease = [];
	        break
	      // This probably shouldn't be used publicly.
	      // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
	      case 'pre': {
	        const base = Number(identifierBase) ? 1 : 0;

	        if (!identifier && identifierBase === false) {
	          throw new Error('invalid increment argument: identifier is empty')
	        }

	        if (this.prerelease.length === 0) {
	          this.prerelease = [base];
	        } else {
	          let i = this.prerelease.length;
	          while (--i >= 0) {
	            if (typeof this.prerelease[i] === 'number') {
	              this.prerelease[i]++;
	              i = -2;
	            }
	          }
	          if (i === -1) {
	            // didn't increment anything
	            if (identifier === this.prerelease.join('.') && identifierBase === false) {
	              throw new Error('invalid increment argument: identifier already exists')
	            }
	            this.prerelease.push(base);
	          }
	        }
	        if (identifier) {
	          // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
	          // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
	          let prerelease = [identifier, base];
	          if (identifierBase === false) {
	            prerelease = [identifier];
	          }
	          if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
	            if (isNaN(this.prerelease[1])) {
	              this.prerelease = prerelease;
	            }
	          } else {
	            this.prerelease = prerelease;
	          }
	        }
	        break
	      }
	      default:
	        throw new Error(`invalid increment argument: ${release}`)
	    }
	    this.raw = this.format();
	    if (this.build.length) {
	      this.raw += `+${this.build.join('.')}`;
	    }
	    return this
	  }
	}

	semver$1 = SemVer;
	return semver$1;
}

var parse_1;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse_1;
	hasRequiredParse = 1;
	const SemVer = requireSemver$1();
	const parse = (version, options, throwErrors = false) => {
	  if (version instanceof SemVer) {
	    return version
	  }
	  try {
	    return new SemVer(version, options)
	  } catch (er) {
	    if (!throwErrors) {
	      return null
	    }
	    throw er
	  }
	};

	parse_1 = parse;
	return parse_1;
}

var valid_1;
var hasRequiredValid$1;

function requireValid$1 () {
	if (hasRequiredValid$1) return valid_1;
	hasRequiredValid$1 = 1;
	const parse = requireParse();
	const valid = (version, options) => {
	  const v = parse(version, options);
	  return v ? v.version : null
	};
	valid_1 = valid;
	return valid_1;
}

var clean_1;
var hasRequiredClean;

function requireClean () {
	if (hasRequiredClean) return clean_1;
	hasRequiredClean = 1;
	const parse = requireParse();
	const clean = (version, options) => {
	  const s = parse(version.trim().replace(/^[=v]+/, ''), options);
	  return s ? s.version : null
	};
	clean_1 = clean;
	return clean_1;
}

var inc_1;
var hasRequiredInc;

function requireInc () {
	if (hasRequiredInc) return inc_1;
	hasRequiredInc = 1;
	const SemVer = requireSemver$1();

	const inc = (version, release, options, identifier, identifierBase) => {
	  if (typeof (options) === 'string') {
	    identifierBase = identifier;
	    identifier = options;
	    options = undefined;
	  }

	  try {
	    return new SemVer(
	      version instanceof SemVer ? version.version : version,
	      options
	    ).inc(release, identifier, identifierBase).version
	  } catch (er) {
	    return null
	  }
	};
	inc_1 = inc;
	return inc_1;
}

var diff_1;
var hasRequiredDiff;

function requireDiff () {
	if (hasRequiredDiff) return diff_1;
	hasRequiredDiff = 1;
	const parse = requireParse();

	const diff = (version1, version2) => {
	  const v1 = parse(version1, null, true);
	  const v2 = parse(version2, null, true);
	  const comparison = v1.compare(v2);

	  if (comparison === 0) {
	    return null
	  }

	  const v1Higher = comparison > 0;
	  const highVersion = v1Higher ? v1 : v2;
	  const lowVersion = v1Higher ? v2 : v1;
	  const highHasPre = !!highVersion.prerelease.length;
	  const lowHasPre = !!lowVersion.prerelease.length;

	  if (lowHasPre && !highHasPre) {
	    // Going from prerelease -> no prerelease requires some special casing

	    // If the low version has only a major, then it will always be a major
	    // Some examples:
	    // 1.0.0-1 -> 1.0.0
	    // 1.0.0-1 -> 1.1.1
	    // 1.0.0-1 -> 2.0.0
	    if (!lowVersion.patch && !lowVersion.minor) {
	      return 'major'
	    }

	    // Otherwise it can be determined by checking the high version

	    if (highVersion.patch) {
	      // anything higher than a patch bump would result in the wrong version
	      return 'patch'
	    }

	    if (highVersion.minor) {
	      // anything higher than a minor bump would result in the wrong version
	      return 'minor'
	    }

	    // bumping major/minor/patch all have same result
	    return 'major'
	  }

	  // add the `pre` prefix if we are going to a prerelease version
	  const prefix = highHasPre ? 'pre' : '';

	  if (v1.major !== v2.major) {
	    return prefix + 'major'
	  }

	  if (v1.minor !== v2.minor) {
	    return prefix + 'minor'
	  }

	  if (v1.patch !== v2.patch) {
	    return prefix + 'patch'
	  }

	  // high and low are preleases
	  return 'prerelease'
	};

	diff_1 = diff;
	return diff_1;
}

var major_1;
var hasRequiredMajor;

function requireMajor () {
	if (hasRequiredMajor) return major_1;
	hasRequiredMajor = 1;
	const SemVer = requireSemver$1();
	const major = (a, loose) => new SemVer(a, loose).major;
	major_1 = major;
	return major_1;
}

var minor_1;
var hasRequiredMinor;

function requireMinor () {
	if (hasRequiredMinor) return minor_1;
	hasRequiredMinor = 1;
	const SemVer = requireSemver$1();
	const minor = (a, loose) => new SemVer(a, loose).minor;
	minor_1 = minor;
	return minor_1;
}

var patch_1;
var hasRequiredPatch;

function requirePatch () {
	if (hasRequiredPatch) return patch_1;
	hasRequiredPatch = 1;
	const SemVer = requireSemver$1();
	const patch = (a, loose) => new SemVer(a, loose).patch;
	patch_1 = patch;
	return patch_1;
}

var prerelease_1;
var hasRequiredPrerelease;

function requirePrerelease () {
	if (hasRequiredPrerelease) return prerelease_1;
	hasRequiredPrerelease = 1;
	const parse = requireParse();
	const prerelease = (version, options) => {
	  const parsed = parse(version, options);
	  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
	};
	prerelease_1 = prerelease;
	return prerelease_1;
}

var compare_1;
var hasRequiredCompare;

function requireCompare () {
	if (hasRequiredCompare) return compare_1;
	hasRequiredCompare = 1;
	const SemVer = requireSemver$1();
	const compare = (a, b, loose) =>
	  new SemVer(a, loose).compare(new SemVer(b, loose));

	compare_1 = compare;
	return compare_1;
}

var rcompare_1;
var hasRequiredRcompare;

function requireRcompare () {
	if (hasRequiredRcompare) return rcompare_1;
	hasRequiredRcompare = 1;
	const compare = requireCompare();
	const rcompare = (a, b, loose) => compare(b, a, loose);
	rcompare_1 = rcompare;
	return rcompare_1;
}

var compareLoose_1;
var hasRequiredCompareLoose;

function requireCompareLoose () {
	if (hasRequiredCompareLoose) return compareLoose_1;
	hasRequiredCompareLoose = 1;
	const compare = requireCompare();
	const compareLoose = (a, b) => compare(a, b, true);
	compareLoose_1 = compareLoose;
	return compareLoose_1;
}

var compareBuild_1;
var hasRequiredCompareBuild;

function requireCompareBuild () {
	if (hasRequiredCompareBuild) return compareBuild_1;
	hasRequiredCompareBuild = 1;
	const SemVer = requireSemver$1();
	const compareBuild = (a, b, loose) => {
	  const versionA = new SemVer(a, loose);
	  const versionB = new SemVer(b, loose);
	  return versionA.compare(versionB) || versionA.compareBuild(versionB)
	};
	compareBuild_1 = compareBuild;
	return compareBuild_1;
}

var sort_1;
var hasRequiredSort;

function requireSort () {
	if (hasRequiredSort) return sort_1;
	hasRequiredSort = 1;
	const compareBuild = requireCompareBuild();
	const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
	sort_1 = sort;
	return sort_1;
}

var rsort_1;
var hasRequiredRsort;

function requireRsort () {
	if (hasRequiredRsort) return rsort_1;
	hasRequiredRsort = 1;
	const compareBuild = requireCompareBuild();
	const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
	rsort_1 = rsort;
	return rsort_1;
}

var gt_1;
var hasRequiredGt;

function requireGt () {
	if (hasRequiredGt) return gt_1;
	hasRequiredGt = 1;
	const compare = requireCompare();
	const gt = (a, b, loose) => compare(a, b, loose) > 0;
	gt_1 = gt;
	return gt_1;
}

var lt_1;
var hasRequiredLt;

function requireLt () {
	if (hasRequiredLt) return lt_1;
	hasRequiredLt = 1;
	const compare = requireCompare();
	const lt = (a, b, loose) => compare(a, b, loose) < 0;
	lt_1 = lt;
	return lt_1;
}

var eq_1;
var hasRequiredEq;

function requireEq () {
	if (hasRequiredEq) return eq_1;
	hasRequiredEq = 1;
	const compare = requireCompare();
	const eq = (a, b, loose) => compare(a, b, loose) === 0;
	eq_1 = eq;
	return eq_1;
}

var neq_1;
var hasRequiredNeq;

function requireNeq () {
	if (hasRequiredNeq) return neq_1;
	hasRequiredNeq = 1;
	const compare = requireCompare();
	const neq = (a, b, loose) => compare(a, b, loose) !== 0;
	neq_1 = neq;
	return neq_1;
}

var gte_1;
var hasRequiredGte;

function requireGte () {
	if (hasRequiredGte) return gte_1;
	hasRequiredGte = 1;
	const compare = requireCompare();
	const gte = (a, b, loose) => compare(a, b, loose) >= 0;
	gte_1 = gte;
	return gte_1;
}

var lte_1;
var hasRequiredLte;

function requireLte () {
	if (hasRequiredLte) return lte_1;
	hasRequiredLte = 1;
	const compare = requireCompare();
	const lte = (a, b, loose) => compare(a, b, loose) <= 0;
	lte_1 = lte;
	return lte_1;
}

var cmp_1;
var hasRequiredCmp;

function requireCmp () {
	if (hasRequiredCmp) return cmp_1;
	hasRequiredCmp = 1;
	const eq = requireEq();
	const neq = requireNeq();
	const gt = requireGt();
	const gte = requireGte();
	const lt = requireLt();
	const lte = requireLte();

	const cmp = (a, op, b, loose) => {
	  switch (op) {
	    case '===':
	      if (typeof a === 'object') {
	        a = a.version;
	      }
	      if (typeof b === 'object') {
	        b = b.version;
	      }
	      return a === b

	    case '!==':
	      if (typeof a === 'object') {
	        a = a.version;
	      }
	      if (typeof b === 'object') {
	        b = b.version;
	      }
	      return a !== b

	    case '':
	    case '=':
	    case '==':
	      return eq(a, b, loose)

	    case '!=':
	      return neq(a, b, loose)

	    case '>':
	      return gt(a, b, loose)

	    case '>=':
	      return gte(a, b, loose)

	    case '<':
	      return lt(a, b, loose)

	    case '<=':
	      return lte(a, b, loose)

	    default:
	      throw new TypeError(`Invalid operator: ${op}`)
	  }
	};
	cmp_1 = cmp;
	return cmp_1;
}

var coerce_1;
var hasRequiredCoerce;

function requireCoerce () {
	if (hasRequiredCoerce) return coerce_1;
	hasRequiredCoerce = 1;
	const SemVer = requireSemver$1();
	const parse = requireParse();
	const { safeRe: re, t } = requireRe();

	const coerce = (version, options) => {
	  if (version instanceof SemVer) {
	    return version
	  }

	  if (typeof version === 'number') {
	    version = String(version);
	  }

	  if (typeof version !== 'string') {
	    return null
	  }

	  options = options || {};

	  let match = null;
	  if (!options.rtl) {
	    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
	  } else {
	    // Find the right-most coercible string that does not share
	    // a terminus with a more left-ward coercible string.
	    // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
	    // With includePrerelease option set, '1.2.3.4-rc' wants to coerce '2.3.4-rc', not '2.3.4'
	    //
	    // Walk through the string checking with a /g regexp
	    // Manually set the index so as to pick up overlapping matches.
	    // Stop when we get a match that ends at the string end, since no
	    // coercible string can be more right-ward without the same terminus.
	    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
	    let next;
	    while ((next = coerceRtlRegex.exec(version)) &&
	        (!match || match.index + match[0].length !== version.length)
	    ) {
	      if (!match ||
	            next.index + next[0].length !== match.index + match[0].length) {
	        match = next;
	      }
	      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
	    }
	    // leave it in a clean state
	    coerceRtlRegex.lastIndex = -1;
	  }

	  if (match === null) {
	    return null
	  }

	  const major = match[2];
	  const minor = match[3] || '0';
	  const patch = match[4] || '0';
	  const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : '';
	  const build = options.includePrerelease && match[6] ? `+${match[6]}` : '';

	  return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options)
	};
	coerce_1 = coerce;
	return coerce_1;
}

var lrucache;
var hasRequiredLrucache;

function requireLrucache () {
	if (hasRequiredLrucache) return lrucache;
	hasRequiredLrucache = 1;
	class LRUCache {
	  constructor () {
	    this.max = 1000;
	    this.map = new Map();
	  }

	  get (key) {
	    const value = this.map.get(key);
	    if (value === undefined) {
	      return undefined
	    } else {
	      // Remove the key from the map and add it to the end
	      this.map.delete(key);
	      this.map.set(key, value);
	      return value
	    }
	  }

	  delete (key) {
	    return this.map.delete(key)
	  }

	  set (key, value) {
	    const deleted = this.delete(key);

	    if (!deleted && value !== undefined) {
	      // If cache is full, delete the least recently used item
	      if (this.map.size >= this.max) {
	        const firstKey = this.map.keys().next().value;
	        this.delete(firstKey);
	      }

	      this.map.set(key, value);
	    }

	    return this
	  }
	}

	lrucache = LRUCache;
	return lrucache;
}

var range;
var hasRequiredRange;

function requireRange () {
	if (hasRequiredRange) return range;
	hasRequiredRange = 1;
	const SPACE_CHARACTERS = /\s+/g;

	// hoisted class for cyclic dependency
	class Range {
	  constructor (range, options) {
	    options = parseOptions(options);

	    if (range instanceof Range) {
	      if (
	        range.loose === !!options.loose &&
	        range.includePrerelease === !!options.includePrerelease
	      ) {
	        return range
	      } else {
	        return new Range(range.raw, options)
	      }
	    }

	    if (range instanceof Comparator) {
	      // just put it in the set and return
	      this.raw = range.value;
	      this.set = [[range]];
	      this.formatted = undefined;
	      return this
	    }

	    this.options = options;
	    this.loose = !!options.loose;
	    this.includePrerelease = !!options.includePrerelease;

	    // First reduce all whitespace as much as possible so we do not have to rely
	    // on potentially slow regexes like \s*. This is then stored and used for
	    // future error messages as well.
	    this.raw = range.trim().replace(SPACE_CHARACTERS, ' ');

	    // First, split on ||
	    this.set = this.raw
	      .split('||')
	      // map the range to a 2d array of comparators
	      .map(r => this.parseRange(r.trim()))
	      // throw out any comparator lists that are empty
	      // this generally means that it was not a valid range, which is allowed
	      // in loose mode, but will still throw if the WHOLE range is invalid.
	      .filter(c => c.length);

	    if (!this.set.length) {
	      throw new TypeError(`Invalid SemVer Range: ${this.raw}`)
	    }

	    // if we have any that are not the null set, throw out null sets.
	    if (this.set.length > 1) {
	      // keep the first one, in case they're all null sets
	      const first = this.set[0];
	      this.set = this.set.filter(c => !isNullSet(c[0]));
	      if (this.set.length === 0) {
	        this.set = [first];
	      } else if (this.set.length > 1) {
	        // if we have any that are *, then the range is just *
	        for (const c of this.set) {
	          if (c.length === 1 && isAny(c[0])) {
	            this.set = [c];
	            break
	          }
	        }
	      }
	    }

	    this.formatted = undefined;
	  }

	  get range () {
	    if (this.formatted === undefined) {
	      this.formatted = '';
	      for (let i = 0; i < this.set.length; i++) {
	        if (i > 0) {
	          this.formatted += '||';
	        }
	        const comps = this.set[i];
	        for (let k = 0; k < comps.length; k++) {
	          if (k > 0) {
	            this.formatted += ' ';
	          }
	          this.formatted += comps[k].toString().trim();
	        }
	      }
	    }
	    return this.formatted
	  }

	  format () {
	    return this.range
	  }

	  toString () {
	    return this.range
	  }

	  parseRange (range) {
	    // memoize range parsing for performance.
	    // this is a very hot path, and fully deterministic.
	    const memoOpts =
	      (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
	      (this.options.loose && FLAG_LOOSE);
	    const memoKey = memoOpts + ':' + range;
	    const cached = cache.get(memoKey);
	    if (cached) {
	      return cached
	    }

	    const loose = this.options.loose;
	    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
	    const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
	    range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
	    debug('hyphen replace', range);

	    // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
	    range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
	    debug('comparator trim', range);

	    // `~ 1.2.3` => `~1.2.3`
	    range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
	    debug('tilde trim', range);

	    // `^ 1.2.3` => `^1.2.3`
	    range = range.replace(re[t.CARETTRIM], caretTrimReplace);
	    debug('caret trim', range);

	    // At this point, the range is completely trimmed and
	    // ready to be split into comparators.

	    let rangeList = range
	      .split(' ')
	      .map(comp => parseComparator(comp, this.options))
	      .join(' ')
	      .split(/\s+/)
	      // >=0.0.0 is equivalent to *
	      .map(comp => replaceGTE0(comp, this.options));

	    if (loose) {
	      // in loose mode, throw out any that are not valid comparators
	      rangeList = rangeList.filter(comp => {
	        debug('loose invalid filter', comp, this.options);
	        return !!comp.match(re[t.COMPARATORLOOSE])
	      });
	    }
	    debug('range list', rangeList);

	    // if any comparators are the null set, then replace with JUST null set
	    // if more than one comparator, remove any * comparators
	    // also, don't include the same comparator more than once
	    const rangeMap = new Map();
	    const comparators = rangeList.map(comp => new Comparator(comp, this.options));
	    for (const comp of comparators) {
	      if (isNullSet(comp)) {
	        return [comp]
	      }
	      rangeMap.set(comp.value, comp);
	    }
	    if (rangeMap.size > 1 && rangeMap.has('')) {
	      rangeMap.delete('');
	    }

	    const result = [...rangeMap.values()];
	    cache.set(memoKey, result);
	    return result
	  }

	  intersects (range, options) {
	    if (!(range instanceof Range)) {
	      throw new TypeError('a Range is required')
	    }

	    return this.set.some((thisComparators) => {
	      return (
	        isSatisfiable(thisComparators, options) &&
	        range.set.some((rangeComparators) => {
	          return (
	            isSatisfiable(rangeComparators, options) &&
	            thisComparators.every((thisComparator) => {
	              return rangeComparators.every((rangeComparator) => {
	                return thisComparator.intersects(rangeComparator, options)
	              })
	            })
	          )
	        })
	      )
	    })
	  }

	  // if ANY of the sets match ALL of its comparators, then pass
	  test (version) {
	    if (!version) {
	      return false
	    }

	    if (typeof version === 'string') {
	      try {
	        version = new SemVer(version, this.options);
	      } catch (er) {
	        return false
	      }
	    }

	    for (let i = 0; i < this.set.length; i++) {
	      if (testSet(this.set[i], version, this.options)) {
	        return true
	      }
	    }
	    return false
	  }
	}

	range = Range;

	const LRU = requireLrucache();
	const cache = new LRU();

	const parseOptions = requireParseOptions();
	const Comparator = requireComparator();
	const debug = requireDebug();
	const SemVer = requireSemver$1();
	const {
	  safeRe: re,
	  t,
	  comparatorTrimReplace,
	  tildeTrimReplace,
	  caretTrimReplace,
	} = requireRe();
	const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = requireConstants();

	const isNullSet = c => c.value === '<0.0.0-0';
	const isAny = c => c.value === '';

	// take a set of comparators and determine whether there
	// exists a version which can satisfy it
	const isSatisfiable = (comparators, options) => {
	  let result = true;
	  const remainingComparators = comparators.slice();
	  let testComparator = remainingComparators.pop();

	  while (result && remainingComparators.length) {
	    result = remainingComparators.every((otherComparator) => {
	      return testComparator.intersects(otherComparator, options)
	    });

	    testComparator = remainingComparators.pop();
	  }

	  return result
	};

	// comprised of xranges, tildes, stars, and gtlt's at this point.
	// already replaced the hyphen ranges
	// turn into a set of JUST comparators.
	const parseComparator = (comp, options) => {
	  debug('comp', comp, options);
	  comp = replaceCarets(comp, options);
	  debug('caret', comp);
	  comp = replaceTildes(comp, options);
	  debug('tildes', comp);
	  comp = replaceXRanges(comp, options);
	  debug('xrange', comp);
	  comp = replaceStars(comp, options);
	  debug('stars', comp);
	  return comp
	};

	const isX = id => !id || id.toLowerCase() === 'x' || id === '*';

	// ~, ~> --> * (any, kinda silly)
	// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
	// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
	// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
	// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
	// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
	// ~0.0.1 --> >=0.0.1 <0.1.0-0
	const replaceTildes = (comp, options) => {
	  return comp
	    .trim()
	    .split(/\s+/)
	    .map((c) => replaceTilde(c, options))
	    .join(' ')
	};

	const replaceTilde = (comp, options) => {
	  const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
	  return comp.replace(r, (_, M, m, p, pr) => {
	    debug('tilde', comp, _, M, m, p, pr);
	    let ret;

	    if (isX(M)) {
	      ret = '';
	    } else if (isX(m)) {
	      ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
	    } else if (isX(p)) {
	      // ~1.2 == >=1.2.0 <1.3.0-0
	      ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
	    } else if (pr) {
	      debug('replaceTilde pr', pr);
	      ret = `>=${M}.${m}.${p}-${pr
	      } <${M}.${+m + 1}.0-0`;
	    } else {
	      // ~1.2.3 == >=1.2.3 <1.3.0-0
	      ret = `>=${M}.${m}.${p
	      } <${M}.${+m + 1}.0-0`;
	    }

	    debug('tilde return', ret);
	    return ret
	  })
	};

	// ^ --> * (any, kinda silly)
	// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
	// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
	// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
	// ^1.2.3 --> >=1.2.3 <2.0.0-0
	// ^1.2.0 --> >=1.2.0 <2.0.0-0
	// ^0.0.1 --> >=0.0.1 <0.0.2-0
	// ^0.1.0 --> >=0.1.0 <0.2.0-0
	const replaceCarets = (comp, options) => {
	  return comp
	    .trim()
	    .split(/\s+/)
	    .map((c) => replaceCaret(c, options))
	    .join(' ')
	};

	const replaceCaret = (comp, options) => {
	  debug('caret', comp, options);
	  const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
	  const z = options.includePrerelease ? '-0' : '';
	  return comp.replace(r, (_, M, m, p, pr) => {
	    debug('caret', comp, _, M, m, p, pr);
	    let ret;

	    if (isX(M)) {
	      ret = '';
	    } else if (isX(m)) {
	      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
	    } else if (isX(p)) {
	      if (M === '0') {
	        ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
	      } else {
	        ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
	      }
	    } else if (pr) {
	      debug('replaceCaret pr', pr);
	      if (M === '0') {
	        if (m === '0') {
	          ret = `>=${M}.${m}.${p}-${pr
	          } <${M}.${m}.${+p + 1}-0`;
	        } else {
	          ret = `>=${M}.${m}.${p}-${pr
	          } <${M}.${+m + 1}.0-0`;
	        }
	      } else {
	        ret = `>=${M}.${m}.${p}-${pr
	        } <${+M + 1}.0.0-0`;
	      }
	    } else {
	      debug('no pr');
	      if (M === '0') {
	        if (m === '0') {
	          ret = `>=${M}.${m}.${p
	          }${z} <${M}.${m}.${+p + 1}-0`;
	        } else {
	          ret = `>=${M}.${m}.${p
	          }${z} <${M}.${+m + 1}.0-0`;
	        }
	      } else {
	        ret = `>=${M}.${m}.${p
	        } <${+M + 1}.0.0-0`;
	      }
	    }

	    debug('caret return', ret);
	    return ret
	  })
	};

	const replaceXRanges = (comp, options) => {
	  debug('replaceXRanges', comp, options);
	  return comp
	    .split(/\s+/)
	    .map((c) => replaceXRange(c, options))
	    .join(' ')
	};

	const replaceXRange = (comp, options) => {
	  comp = comp.trim();
	  const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
	  return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
	    debug('xRange', comp, ret, gtlt, M, m, p, pr);
	    const xM = isX(M);
	    const xm = xM || isX(m);
	    const xp = xm || isX(p);
	    const anyX = xp;

	    if (gtlt === '=' && anyX) {
	      gtlt = '';
	    }

	    // if we're including prereleases in the match, then we need
	    // to fix this to -0, the lowest possible prerelease value
	    pr = options.includePrerelease ? '-0' : '';

	    if (xM) {
	      if (gtlt === '>' || gtlt === '<') {
	        // nothing is allowed
	        ret = '<0.0.0-0';
	      } else {
	        // nothing is forbidden
	        ret = '*';
	      }
	    } else if (gtlt && anyX) {
	      // we know patch is an x, because we have any x at all.
	      // replace X with 0
	      if (xm) {
	        m = 0;
	      }
	      p = 0;

	      if (gtlt === '>') {
	        // >1 => >=2.0.0
	        // >1.2 => >=1.3.0
	        gtlt = '>=';
	        if (xm) {
	          M = +M + 1;
	          m = 0;
	          p = 0;
	        } else {
	          m = +m + 1;
	          p = 0;
	        }
	      } else if (gtlt === '<=') {
	        // <=0.7.x is actually <0.8.0, since any 0.7.x should
	        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
	        gtlt = '<';
	        if (xm) {
	          M = +M + 1;
	        } else {
	          m = +m + 1;
	        }
	      }

	      if (gtlt === '<') {
	        pr = '-0';
	      }

	      ret = `${gtlt + M}.${m}.${p}${pr}`;
	    } else if (xm) {
	      ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
	    } else if (xp) {
	      ret = `>=${M}.${m}.0${pr
	      } <${M}.${+m + 1}.0-0`;
	    }

	    debug('xRange return', ret);

	    return ret
	  })
	};

	// Because * is AND-ed with everything else in the comparator,
	// and '' means "any version", just remove the *s entirely.
	const replaceStars = (comp, options) => {
	  debug('replaceStars', comp, options);
	  // Looseness is ignored here.  star is always as loose as it gets!
	  return comp
	    .trim()
	    .replace(re[t.STAR], '')
	};

	const replaceGTE0 = (comp, options) => {
	  debug('replaceGTE0', comp, options);
	  return comp
	    .trim()
	    .replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '')
	};

	// This function is passed to string.replace(re[t.HYPHENRANGE])
	// M, m, patch, prerelease, build
	// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
	// 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
	// 1.2 - 3.4 => >=1.2.0 <3.5.0-0
	// TODO build?
	const hyphenReplace = incPr => ($0,
	  from, fM, fm, fp, fpr, fb,
	  to, tM, tm, tp, tpr) => {
	  if (isX(fM)) {
	    from = '';
	  } else if (isX(fm)) {
	    from = `>=${fM}.0.0${incPr ? '-0' : ''}`;
	  } else if (isX(fp)) {
	    from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`;
	  } else if (fpr) {
	    from = `>=${from}`;
	  } else {
	    from = `>=${from}${incPr ? '-0' : ''}`;
	  }

	  if (isX(tM)) {
	    to = '';
	  } else if (isX(tm)) {
	    to = `<${+tM + 1}.0.0-0`;
	  } else if (isX(tp)) {
	    to = `<${tM}.${+tm + 1}.0-0`;
	  } else if (tpr) {
	    to = `<=${tM}.${tm}.${tp}-${tpr}`;
	  } else if (incPr) {
	    to = `<${tM}.${tm}.${+tp + 1}-0`;
	  } else {
	    to = `<=${to}`;
	  }

	  return `${from} ${to}`.trim()
	};

	const testSet = (set, version, options) => {
	  for (let i = 0; i < set.length; i++) {
	    if (!set[i].test(version)) {
	      return false
	    }
	  }

	  if (version.prerelease.length && !options.includePrerelease) {
	    // Find the set of versions that are allowed to have prereleases
	    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
	    // That should allow `1.2.3-pr.2` to pass.
	    // However, `1.2.4-alpha.notready` should NOT be allowed,
	    // even though it's within the range set by the comparators.
	    for (let i = 0; i < set.length; i++) {
	      debug(set[i].semver);
	      if (set[i].semver === Comparator.ANY) {
	        continue
	      }

	      if (set[i].semver.prerelease.length > 0) {
	        const allowed = set[i].semver;
	        if (allowed.major === version.major &&
	            allowed.minor === version.minor &&
	            allowed.patch === version.patch) {
	          return true
	        }
	      }
	    }

	    // Version has a -pre, but it's not one of the ones we like.
	    return false
	  }

	  return true
	};
	return range;
}

var comparator;
var hasRequiredComparator;

function requireComparator () {
	if (hasRequiredComparator) return comparator;
	hasRequiredComparator = 1;
	const ANY = Symbol('SemVer ANY');
	// hoisted class for cyclic dependency
	class Comparator {
	  static get ANY () {
	    return ANY
	  }

	  constructor (comp, options) {
	    options = parseOptions(options);

	    if (comp instanceof Comparator) {
	      if (comp.loose === !!options.loose) {
	        return comp
	      } else {
	        comp = comp.value;
	      }
	    }

	    comp = comp.trim().split(/\s+/).join(' ');
	    debug('comparator', comp, options);
	    this.options = options;
	    this.loose = !!options.loose;
	    this.parse(comp);

	    if (this.semver === ANY) {
	      this.value = '';
	    } else {
	      this.value = this.operator + this.semver.version;
	    }

	    debug('comp', this);
	  }

	  parse (comp) {
	    const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
	    const m = comp.match(r);

	    if (!m) {
	      throw new TypeError(`Invalid comparator: ${comp}`)
	    }

	    this.operator = m[1] !== undefined ? m[1] : '';
	    if (this.operator === '=') {
	      this.operator = '';
	    }

	    // if it literally is just '>' or '' then allow anything.
	    if (!m[2]) {
	      this.semver = ANY;
	    } else {
	      this.semver = new SemVer(m[2], this.options.loose);
	    }
	  }

	  toString () {
	    return this.value
	  }

	  test (version) {
	    debug('Comparator.test', version, this.options.loose);

	    if (this.semver === ANY || version === ANY) {
	      return true
	    }

	    if (typeof version === 'string') {
	      try {
	        version = new SemVer(version, this.options);
	      } catch (er) {
	        return false
	      }
	    }

	    return cmp(version, this.operator, this.semver, this.options)
	  }

	  intersects (comp, options) {
	    if (!(comp instanceof Comparator)) {
	      throw new TypeError('a Comparator is required')
	    }

	    if (this.operator === '') {
	      if (this.value === '') {
	        return true
	      }
	      return new Range(comp.value, options).test(this.value)
	    } else if (comp.operator === '') {
	      if (comp.value === '') {
	        return true
	      }
	      return new Range(this.value, options).test(comp.semver)
	    }

	    options = parseOptions(options);

	    // Special cases where nothing can possibly be lower
	    if (options.includePrerelease &&
	      (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
	      return false
	    }
	    if (!options.includePrerelease &&
	      (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
	      return false
	    }

	    // Same direction increasing (> or >=)
	    if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
	      return true
	    }
	    // Same direction decreasing (< or <=)
	    if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
	      return true
	    }
	    // same SemVer and both sides are inclusive (<= or >=)
	    if (
	      (this.semver.version === comp.semver.version) &&
	      this.operator.includes('=') && comp.operator.includes('=')) {
	      return true
	    }
	    // opposite directions less than
	    if (cmp(this.semver, '<', comp.semver, options) &&
	      this.operator.startsWith('>') && comp.operator.startsWith('<')) {
	      return true
	    }
	    // opposite directions greater than
	    if (cmp(this.semver, '>', comp.semver, options) &&
	      this.operator.startsWith('<') && comp.operator.startsWith('>')) {
	      return true
	    }
	    return false
	  }
	}

	comparator = Comparator;

	const parseOptions = requireParseOptions();
	const { safeRe: re, t } = requireRe();
	const cmp = requireCmp();
	const debug = requireDebug();
	const SemVer = requireSemver$1();
	const Range = requireRange();
	return comparator;
}

var satisfies_1;
var hasRequiredSatisfies;

function requireSatisfies () {
	if (hasRequiredSatisfies) return satisfies_1;
	hasRequiredSatisfies = 1;
	const Range = requireRange();
	const satisfies = (version, range, options) => {
	  try {
	    range = new Range(range, options);
	  } catch (er) {
	    return false
	  }
	  return range.test(version)
	};
	satisfies_1 = satisfies;
	return satisfies_1;
}

var toComparators_1;
var hasRequiredToComparators;

function requireToComparators () {
	if (hasRequiredToComparators) return toComparators_1;
	hasRequiredToComparators = 1;
	const Range = requireRange();

	// Mostly just for testing and legacy API reasons
	const toComparators = (range, options) =>
	  new Range(range, options).set
	    .map(comp => comp.map(c => c.value).join(' ').trim().split(' '));

	toComparators_1 = toComparators;
	return toComparators_1;
}

var maxSatisfying_1;
var hasRequiredMaxSatisfying;

function requireMaxSatisfying () {
	if (hasRequiredMaxSatisfying) return maxSatisfying_1;
	hasRequiredMaxSatisfying = 1;
	const SemVer = requireSemver$1();
	const Range = requireRange();

	const maxSatisfying = (versions, range, options) => {
	  let max = null;
	  let maxSV = null;
	  let rangeObj = null;
	  try {
	    rangeObj = new Range(range, options);
	  } catch (er) {
	    return null
	  }
	  versions.forEach((v) => {
	    if (rangeObj.test(v)) {
	      // satisfies(v, range, options)
	      if (!max || maxSV.compare(v) === -1) {
	        // compare(max, v, true)
	        max = v;
	        maxSV = new SemVer(max, options);
	      }
	    }
	  });
	  return max
	};
	maxSatisfying_1 = maxSatisfying;
	return maxSatisfying_1;
}

var minSatisfying_1;
var hasRequiredMinSatisfying;

function requireMinSatisfying () {
	if (hasRequiredMinSatisfying) return minSatisfying_1;
	hasRequiredMinSatisfying = 1;
	const SemVer = requireSemver$1();
	const Range = requireRange();
	const minSatisfying = (versions, range, options) => {
	  let min = null;
	  let minSV = null;
	  let rangeObj = null;
	  try {
	    rangeObj = new Range(range, options);
	  } catch (er) {
	    return null
	  }
	  versions.forEach((v) => {
	    if (rangeObj.test(v)) {
	      // satisfies(v, range, options)
	      if (!min || minSV.compare(v) === 1) {
	        // compare(min, v, true)
	        min = v;
	        minSV = new SemVer(min, options);
	      }
	    }
	  });
	  return min
	};
	minSatisfying_1 = minSatisfying;
	return minSatisfying_1;
}

var minVersion_1;
var hasRequiredMinVersion;

function requireMinVersion () {
	if (hasRequiredMinVersion) return minVersion_1;
	hasRequiredMinVersion = 1;
	const SemVer = requireSemver$1();
	const Range = requireRange();
	const gt = requireGt();

	const minVersion = (range, loose) => {
	  range = new Range(range, loose);

	  let minver = new SemVer('0.0.0');
	  if (range.test(minver)) {
	    return minver
	  }

	  minver = new SemVer('0.0.0-0');
	  if (range.test(minver)) {
	    return minver
	  }

	  minver = null;
	  for (let i = 0; i < range.set.length; ++i) {
	    const comparators = range.set[i];

	    let setMin = null;
	    comparators.forEach((comparator) => {
	      // Clone to avoid manipulating the comparator's semver object.
	      const compver = new SemVer(comparator.semver.version);
	      switch (comparator.operator) {
	        case '>':
	          if (compver.prerelease.length === 0) {
	            compver.patch++;
	          } else {
	            compver.prerelease.push(0);
	          }
	          compver.raw = compver.format();
	          /* fallthrough */
	        case '':
	        case '>=':
	          if (!setMin || gt(compver, setMin)) {
	            setMin = compver;
	          }
	          break
	        case '<':
	        case '<=':
	          /* Ignore maximum versions */
	          break
	        /* istanbul ignore next */
	        default:
	          throw new Error(`Unexpected operation: ${comparator.operator}`)
	      }
	    });
	    if (setMin && (!minver || gt(minver, setMin))) {
	      minver = setMin;
	    }
	  }

	  if (minver && range.test(minver)) {
	    return minver
	  }

	  return null
	};
	minVersion_1 = minVersion;
	return minVersion_1;
}

var valid;
var hasRequiredValid;

function requireValid () {
	if (hasRequiredValid) return valid;
	hasRequiredValid = 1;
	const Range = requireRange();
	const validRange = (range, options) => {
	  try {
	    // Return '*' instead of '' so that truthiness works.
	    // This will throw if it's invalid anyway
	    return new Range(range, options).range || '*'
	  } catch (er) {
	    return null
	  }
	};
	valid = validRange;
	return valid;
}

var outside_1;
var hasRequiredOutside;

function requireOutside () {
	if (hasRequiredOutside) return outside_1;
	hasRequiredOutside = 1;
	const SemVer = requireSemver$1();
	const Comparator = requireComparator();
	const { ANY } = Comparator;
	const Range = requireRange();
	const satisfies = requireSatisfies();
	const gt = requireGt();
	const lt = requireLt();
	const lte = requireLte();
	const gte = requireGte();

	const outside = (version, range, hilo, options) => {
	  version = new SemVer(version, options);
	  range = new Range(range, options);

	  let gtfn, ltefn, ltfn, comp, ecomp;
	  switch (hilo) {
	    case '>':
	      gtfn = gt;
	      ltefn = lte;
	      ltfn = lt;
	      comp = '>';
	      ecomp = '>=';
	      break
	    case '<':
	      gtfn = lt;
	      ltefn = gte;
	      ltfn = gt;
	      comp = '<';
	      ecomp = '<=';
	      break
	    default:
	      throw new TypeError('Must provide a hilo val of "<" or ">"')
	  }

	  // If it satisfies the range it is not outside
	  if (satisfies(version, range, options)) {
	    return false
	  }

	  // From now on, variable terms are as if we're in "gtr" mode.
	  // but note that everything is flipped for the "ltr" function.

	  for (let i = 0; i < range.set.length; ++i) {
	    const comparators = range.set[i];

	    let high = null;
	    let low = null;

	    comparators.forEach((comparator) => {
	      if (comparator.semver === ANY) {
	        comparator = new Comparator('>=0.0.0');
	      }
	      high = high || comparator;
	      low = low || comparator;
	      if (gtfn(comparator.semver, high.semver, options)) {
	        high = comparator;
	      } else if (ltfn(comparator.semver, low.semver, options)) {
	        low = comparator;
	      }
	    });

	    // If the edge version comparator has a operator then our version
	    // isn't outside it
	    if (high.operator === comp || high.operator === ecomp) {
	      return false
	    }

	    // If the lowest version comparator has an operator and our version
	    // is less than it then it isn't higher than the range
	    if ((!low.operator || low.operator === comp) &&
	        ltefn(version, low.semver)) {
	      return false
	    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
	      return false
	    }
	  }
	  return true
	};

	outside_1 = outside;
	return outside_1;
}

var gtr_1;
var hasRequiredGtr;

function requireGtr () {
	if (hasRequiredGtr) return gtr_1;
	hasRequiredGtr = 1;
	// Determine if version is greater than all the versions possible in the range.
	const outside = requireOutside();
	const gtr = (version, range, options) => outside(version, range, '>', options);
	gtr_1 = gtr;
	return gtr_1;
}

var ltr_1;
var hasRequiredLtr;

function requireLtr () {
	if (hasRequiredLtr) return ltr_1;
	hasRequiredLtr = 1;
	const outside = requireOutside();
	// Determine if version is less than all the versions possible in the range
	const ltr = (version, range, options) => outside(version, range, '<', options);
	ltr_1 = ltr;
	return ltr_1;
}

var intersects_1;
var hasRequiredIntersects;

function requireIntersects () {
	if (hasRequiredIntersects) return intersects_1;
	hasRequiredIntersects = 1;
	const Range = requireRange();
	const intersects = (r1, r2, options) => {
	  r1 = new Range(r1, options);
	  r2 = new Range(r2, options);
	  return r1.intersects(r2, options)
	};
	intersects_1 = intersects;
	return intersects_1;
}

var simplify;
var hasRequiredSimplify;

function requireSimplify () {
	if (hasRequiredSimplify) return simplify;
	hasRequiredSimplify = 1;
	// given a set of versions and a range, create a "simplified" range
	// that includes the same versions that the original range does
	// If the original range is shorter than the simplified one, return that.
	const satisfies = requireSatisfies();
	const compare = requireCompare();
	simplify = (versions, range, options) => {
	  const set = [];
	  let first = null;
	  let prev = null;
	  const v = versions.sort((a, b) => compare(a, b, options));
	  for (const version of v) {
	    const included = satisfies(version, range, options);
	    if (included) {
	      prev = version;
	      if (!first) {
	        first = version;
	      }
	    } else {
	      if (prev) {
	        set.push([first, prev]);
	      }
	      prev = null;
	      first = null;
	    }
	  }
	  if (first) {
	    set.push([first, null]);
	  }

	  const ranges = [];
	  for (const [min, max] of set) {
	    if (min === max) {
	      ranges.push(min);
	    } else if (!max && min === v[0]) {
	      ranges.push('*');
	    } else if (!max) {
	      ranges.push(`>=${min}`);
	    } else if (min === v[0]) {
	      ranges.push(`<=${max}`);
	    } else {
	      ranges.push(`${min} - ${max}`);
	    }
	  }
	  const simplified = ranges.join(' || ');
	  const original = typeof range.raw === 'string' ? range.raw : String(range);
	  return simplified.length < original.length ? simplified : range
	};
	return simplify;
}

var subset_1;
var hasRequiredSubset;

function requireSubset () {
	if (hasRequiredSubset) return subset_1;
	hasRequiredSubset = 1;
	const Range = requireRange();
	const Comparator = requireComparator();
	const { ANY } = Comparator;
	const satisfies = requireSatisfies();
	const compare = requireCompare();

	// Complex range `r1 || r2 || ...` is a subset of `R1 || R2 || ...` iff:
	// - Every simple range `r1, r2, ...` is a null set, OR
	// - Every simple range `r1, r2, ...` which is not a null set is a subset of
	//   some `R1, R2, ...`
	//
	// Simple range `c1 c2 ...` is a subset of simple range `C1 C2 ...` iff:
	// - If c is only the ANY comparator
	//   - If C is only the ANY comparator, return true
	//   - Else if in prerelease mode, return false
	//   - else replace c with `[>=0.0.0]`
	// - If C is only the ANY comparator
	//   - if in prerelease mode, return true
	//   - else replace C with `[>=0.0.0]`
	// - Let EQ be the set of = comparators in c
	// - If EQ is more than one, return true (null set)
	// - Let GT be the highest > or >= comparator in c
	// - Let LT be the lowest < or <= comparator in c
	// - If GT and LT, and GT.semver > LT.semver, return true (null set)
	// - If any C is a = range, and GT or LT are set, return false
	// - If EQ
	//   - If GT, and EQ does not satisfy GT, return true (null set)
	//   - If LT, and EQ does not satisfy LT, return true (null set)
	//   - If EQ satisfies every C, return true
	//   - Else return false
	// - If GT
	//   - If GT.semver is lower than any > or >= comp in C, return false
	//   - If GT is >=, and GT.semver does not satisfy every C, return false
	//   - If GT.semver has a prerelease, and not in prerelease mode
	//     - If no C has a prerelease and the GT.semver tuple, return false
	// - If LT
	//   - If LT.semver is greater than any < or <= comp in C, return false
	//   - If LT is <=, and LT.semver does not satisfy every C, return false
	//   - If GT.semver has a prerelease, and not in prerelease mode
	//     - If no C has a prerelease and the LT.semver tuple, return false
	// - Else return true

	const subset = (sub, dom, options = {}) => {
	  if (sub === dom) {
	    return true
	  }

	  sub = new Range(sub, options);
	  dom = new Range(dom, options);
	  let sawNonNull = false;

	  OUTER: for (const simpleSub of sub.set) {
	    for (const simpleDom of dom.set) {
	      const isSub = simpleSubset(simpleSub, simpleDom, options);
	      sawNonNull = sawNonNull || isSub !== null;
	      if (isSub) {
	        continue OUTER
	      }
	    }
	    // the null set is a subset of everything, but null simple ranges in
	    // a complex range should be ignored.  so if we saw a non-null range,
	    // then we know this isn't a subset, but if EVERY simple range was null,
	    // then it is a subset.
	    if (sawNonNull) {
	      return false
	    }
	  }
	  return true
	};

	const minimumVersionWithPreRelease = [new Comparator('>=0.0.0-0')];
	const minimumVersion = [new Comparator('>=0.0.0')];

	const simpleSubset = (sub, dom, options) => {
	  if (sub === dom) {
	    return true
	  }

	  if (sub.length === 1 && sub[0].semver === ANY) {
	    if (dom.length === 1 && dom[0].semver === ANY) {
	      return true
	    } else if (options.includePrerelease) {
	      sub = minimumVersionWithPreRelease;
	    } else {
	      sub = minimumVersion;
	    }
	  }

	  if (dom.length === 1 && dom[0].semver === ANY) {
	    if (options.includePrerelease) {
	      return true
	    } else {
	      dom = minimumVersion;
	    }
	  }

	  const eqSet = new Set();
	  let gt, lt;
	  for (const c of sub) {
	    if (c.operator === '>' || c.operator === '>=') {
	      gt = higherGT(gt, c, options);
	    } else if (c.operator === '<' || c.operator === '<=') {
	      lt = lowerLT(lt, c, options);
	    } else {
	      eqSet.add(c.semver);
	    }
	  }

	  if (eqSet.size > 1) {
	    return null
	  }

	  let gtltComp;
	  if (gt && lt) {
	    gtltComp = compare(gt.semver, lt.semver, options);
	    if (gtltComp > 0) {
	      return null
	    } else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<=')) {
	      return null
	    }
	  }

	  // will iterate one or zero times
	  for (const eq of eqSet) {
	    if (gt && !satisfies(eq, String(gt), options)) {
	      return null
	    }

	    if (lt && !satisfies(eq, String(lt), options)) {
	      return null
	    }

	    for (const c of dom) {
	      if (!satisfies(eq, String(c), options)) {
	        return false
	      }
	    }

	    return true
	  }

	  let higher, lower;
	  let hasDomLT, hasDomGT;
	  // if the subset has a prerelease, we need a comparator in the superset
	  // with the same tuple and a prerelease, or it's not a subset
	  let needDomLTPre = lt &&
	    !options.includePrerelease &&
	    lt.semver.prerelease.length ? lt.semver : false;
	  let needDomGTPre = gt &&
	    !options.includePrerelease &&
	    gt.semver.prerelease.length ? gt.semver : false;
	  // exception: <1.2.3-0 is the same as <1.2.3
	  if (needDomLTPre && needDomLTPre.prerelease.length === 1 &&
	      lt.operator === '<' && needDomLTPre.prerelease[0] === 0) {
	    needDomLTPre = false;
	  }

	  for (const c of dom) {
	    hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>=';
	    hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<=';
	    if (gt) {
	      if (needDomGTPre) {
	        if (c.semver.prerelease && c.semver.prerelease.length &&
	            c.semver.major === needDomGTPre.major &&
	            c.semver.minor === needDomGTPre.minor &&
	            c.semver.patch === needDomGTPre.patch) {
	          needDomGTPre = false;
	        }
	      }
	      if (c.operator === '>' || c.operator === '>=') {
	        higher = higherGT(gt, c, options);
	        if (higher === c && higher !== gt) {
	          return false
	        }
	      } else if (gt.operator === '>=' && !satisfies(gt.semver, String(c), options)) {
	        return false
	      }
	    }
	    if (lt) {
	      if (needDomLTPre) {
	        if (c.semver.prerelease && c.semver.prerelease.length &&
	            c.semver.major === needDomLTPre.major &&
	            c.semver.minor === needDomLTPre.minor &&
	            c.semver.patch === needDomLTPre.patch) {
	          needDomLTPre = false;
	        }
	      }
	      if (c.operator === '<' || c.operator === '<=') {
	        lower = lowerLT(lt, c, options);
	        if (lower === c && lower !== lt) {
	          return false
	        }
	      } else if (lt.operator === '<=' && !satisfies(lt.semver, String(c), options)) {
	        return false
	      }
	    }
	    if (!c.operator && (lt || gt) && gtltComp !== 0) {
	      return false
	    }
	  }

	  // if there was a < or >, and nothing in the dom, then must be false
	  // UNLESS it was limited by another range in the other direction.
	  // Eg, >1.0.0 <1.0.1 is still a subset of <2.0.0
	  if (gt && hasDomLT && !lt && gtltComp !== 0) {
	    return false
	  }

	  if (lt && hasDomGT && !gt && gtltComp !== 0) {
	    return false
	  }

	  // we needed a prerelease range in a specific tuple, but didn't get one
	  // then this isn't a subset.  eg >=1.2.3-pre is not a subset of >=1.0.0,
	  // because it includes prereleases in the 1.2.3 tuple
	  if (needDomGTPre || needDomLTPre) {
	    return false
	  }

	  return true
	};

	// >=1.2.3 is lower than >1.2.3
	const higherGT = (a, b, options) => {
	  if (!a) {
	    return b
	  }
	  const comp = compare(a.semver, b.semver, options);
	  return comp > 0 ? a
	    : comp < 0 ? b
	    : b.operator === '>' && a.operator === '>=' ? b
	    : a
	};

	// <=1.2.3 is higher than <1.2.3
	const lowerLT = (a, b, options) => {
	  if (!a) {
	    return b
	  }
	  const comp = compare(a.semver, b.semver, options);
	  return comp < 0 ? a
	    : comp > 0 ? b
	    : b.operator === '<' && a.operator === '<=' ? b
	    : a
	};

	subset_1 = subset;
	return subset_1;
}

var semver;
var hasRequiredSemver;

function requireSemver () {
	if (hasRequiredSemver) return semver;
	hasRequiredSemver = 1;
	// just pre-load all the stuff that index.js lazily exports
	const internalRe = requireRe();
	const constants = requireConstants();
	const SemVer = requireSemver$1();
	const identifiers = requireIdentifiers();
	const parse = requireParse();
	const valid = requireValid$1();
	const clean = requireClean();
	const inc = requireInc();
	const diff = requireDiff();
	const major = requireMajor();
	const minor = requireMinor();
	const patch = requirePatch();
	const prerelease = requirePrerelease();
	const compare = requireCompare();
	const rcompare = requireRcompare();
	const compareLoose = requireCompareLoose();
	const compareBuild = requireCompareBuild();
	const sort = requireSort();
	const rsort = requireRsort();
	const gt = requireGt();
	const lt = requireLt();
	const eq = requireEq();
	const neq = requireNeq();
	const gte = requireGte();
	const lte = requireLte();
	const cmp = requireCmp();
	const coerce = requireCoerce();
	const Comparator = requireComparator();
	const Range = requireRange();
	const satisfies = requireSatisfies();
	const toComparators = requireToComparators();
	const maxSatisfying = requireMaxSatisfying();
	const minSatisfying = requireMinSatisfying();
	const minVersion = requireMinVersion();
	const validRange = requireValid();
	const outside = requireOutside();
	const gtr = requireGtr();
	const ltr = requireLtr();
	const intersects = requireIntersects();
	const simplifyRange = requireSimplify();
	const subset = requireSubset();
	semver = {
	  parse,
	  valid,
	  clean,
	  inc,
	  diff,
	  major,
	  minor,
	  patch,
	  prerelease,
	  compare,
	  rcompare,
	  compareLoose,
	  compareBuild,
	  sort,
	  rsort,
	  gt,
	  lt,
	  eq,
	  neq,
	  gte,
	  lte,
	  cmp,
	  coerce,
	  Comparator,
	  Range,
	  satisfies,
	  toComparators,
	  maxSatisfying,
	  minSatisfying,
	  minVersion,
	  validRange,
	  outside,
	  gtr,
	  ltr,
	  intersects,
	  simplifyRange,
	  subset,
	  SemVer,
	  re: internalRe.re,
	  src: internalRe.src,
	  tokens: internalRe.t,
	  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
	  RELEASE_TYPES: constants.RELEASE_TYPES,
	  compareIdentifiers: identifiers.compareIdentifiers,
	  rcompareIdentifiers: identifiers.rcompareIdentifiers,
	};
	return semver;
}

var semverExports = requireSemver();

function isVersionGreaterOrEqual(current_version, target_version) {
    const current = semverExports.parse(current_version);
    const target = semverExports.parse(target_version);
    if (!current || !target) {
        throw new Error("Invalid version format.");
    }
    return current.compare(target) >= 0;
}
function parsePromptIdentifier(identifier) {
    if (!identifier ||
        identifier.split("/").length > 2 ||
        identifier.startsWith("/") ||
        identifier.endsWith("/") ||
        identifier.split(":").length > 2) {
        throw new Error(`Invalid identifier format: ${identifier}`);
    }
    const [ownerNamePart, commitPart] = identifier.split(":");
    const commit = commitPart || "latest";
    if (ownerNamePart.includes("/")) {
        const [owner, name] = ownerNamePart.split("/", 2);
        if (!owner || !name) {
            throw new Error(`Invalid identifier format: ${identifier}`);
        }
        return [owner, name, commit];
    }
    else {
        if (!ownerNamePart) {
            throw new Error(`Invalid identifier format: ${identifier}`);
        }
        return ["-", ownerNamePart, commit];
    }
}

/**
 * LangSmithConflictError
 *
 * Represents an error that occurs when there's a conflict during an operation,
 * typically corresponding to HTTP 409 status code responses.
 *
 * This error is thrown when an attempt to create or modify a resource conflicts
 * with the current state of the resource on the server. Common scenarios include:
 * - Attempting to create a resource that already exists
 * - Trying to update a resource that has been modified by another process
 * - Violating a uniqueness constraint in the data
 *
 * @extends Error
 *
 * @example
 * try {
 *   await createProject("existingProject");
 * } catch (error) {
 *   if (error instanceof ConflictError) {
 *     console.log("A conflict occurred:", error.message);
 *     // Handle the conflict, e.g., by suggesting a different project name
 *   } else {
 *     // Handle other types of errors
 *   }
 * }
 *
 * @property {string} name - Always set to 'ConflictError' for easy identification
 * @property {string} message - Detailed error message including server response
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
 */
class LangSmithConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = "LangSmithConflictError";
    }
}
/**
 * Throws an appropriate error based on the response status and body.
 *
 * @param response - The fetch Response object
 * @param context - Additional context to include in the error message (e.g., operation being performed)
 * @throws {LangSmithConflictError} When the response status is 409
 * @throws {Error} For all other non-ok responses
 */
async function raiseForStatus(response, context, consume) {
    // consume the response body to release the connection
    // https://undici.nodejs.org/#/?id=garbage-collection
    let errorBody;
    if (response.ok) {
        if (consume) {
            errorBody = await response.text();
        }
        return;
    }
    errorBody = await response.text();
    const fullMessage = `Failed to ${context}. Received status [${response.status}]: ${response.statusText}. Server response: ${errorBody}`;
    if (response.status === 409) {
        throw new LangSmithConflictError(fullMessage);
    }
    throw new Error(fullMessage);
}

/* eslint-disable */
// @ts-nocheck
var LIMIT_REPLACE_NODE = "[...]";
var CIRCULAR_REPLACE_NODE = { result: "[Circular]" };
var arr = [];
var replacerStack = [];
function defaultOptions$1() {
    return {
        depthLimit: Number.MAX_SAFE_INTEGER,
        edgesLimit: Number.MAX_SAFE_INTEGER,
    };
}
// Regular stringify
function stringify(obj, replacer, spacer, options) {
    try {
        return JSON.stringify(obj, replacer, spacer);
    }
    catch (e) {
        // Fall back to more complex stringify if circular reference
        if (!e.message?.includes("Converting circular structure to JSON")) {
            console.warn("[WARNING]: LangSmith received unserializable value.");
            return "[Unserializable]";
        }
        console.warn("[WARNING]: LangSmith received circular JSON. This will decrease tracer performance.");
        if (typeof options === "undefined") {
            options = defaultOptions$1();
        }
        decirc(obj, "", 0, [], undefined, 0, options);
        var res;
        try {
            if (replacerStack.length === 0) {
                res = JSON.stringify(obj, replacer, spacer);
            }
            else {
                res = JSON.stringify(obj, replaceGetterValues(replacer), spacer);
            }
        }
        catch (_) {
            return JSON.stringify("[unable to serialize, circular reference is too complex to analyze]");
        }
        finally {
            while (arr.length !== 0) {
                var part = arr.pop();
                if (part.length === 4) {
                    Object.defineProperty(part[0], part[1], part[3]);
                }
                else {
                    part[0][part[1]] = part[2];
                }
            }
        }
        return res;
    }
}
function setReplace(replace, val, k, parent) {
    var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k);
    if (propertyDescriptor.get !== undefined) {
        if (propertyDescriptor.configurable) {
            Object.defineProperty(parent, k, { value: replace });
            arr.push([parent, k, val, propertyDescriptor]);
        }
        else {
            replacerStack.push([val, k, replace]);
        }
    }
    else {
        parent[k] = replace;
        arr.push([parent, k, val]);
    }
}
function decirc(val, k, edgeIndex, stack, parent, depth, options) {
    depth += 1;
    var i;
    if (typeof val === "object" && val !== null) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i] === val) {
                setReplace(CIRCULAR_REPLACE_NODE, val, k, parent);
                return;
            }
        }
        if (typeof options.depthLimit !== "undefined" &&
            depth > options.depthLimit) {
            setReplace(LIMIT_REPLACE_NODE, val, k, parent);
            return;
        }
        if (typeof options.edgesLimit !== "undefined" &&
            edgeIndex + 1 > options.edgesLimit) {
            setReplace(LIMIT_REPLACE_NODE, val, k, parent);
            return;
        }
        stack.push(val);
        // Optimize for Arrays. Big arrays could kill the performance otherwise!
        if (Array.isArray(val)) {
            for (i = 0; i < val.length; i++) {
                decirc(val[i], i, i, stack, val, depth, options);
            }
        }
        else {
            var keys = Object.keys(val);
            for (i = 0; i < keys.length; i++) {
                var key = keys[i];
                decirc(val[key], key, i, stack, val, depth, options);
            }
        }
        stack.pop();
    }
}
// wraps replacer function to handle values we couldn't replace
// and mark them as replaced value
function replaceGetterValues(replacer) {
    replacer =
        typeof replacer !== "undefined"
            ? replacer
            : function (k, v) {
                return v;
            };
    return function (key, val) {
        if (replacerStack.length > 0) {
            for (var i = 0; i < replacerStack.length; i++) {
                var part = replacerStack[i];
                if (part[1] === key && part[0] === val) {
                    val = part[2];
                    replacerStack.splice(i, 1);
                    break;
                }
            }
        }
        return replacer.call(this, key, val);
    };
}

function mergeRuntimeEnvIntoRunCreate(run) {
    const runtimeEnv = getRuntimeEnvironment$1();
    const envVars = getLangChainEnvVarsMetadata();
    const extra = run.extra ?? {};
    const metadata = extra.metadata;
    run.extra = {
        ...extra,
        runtime: {
            ...runtimeEnv,
            ...extra?.runtime,
        },
        metadata: {
            ...envVars,
            ...(envVars.revision_id || run.revision_id
                ? { revision_id: run.revision_id ?? envVars.revision_id }
                : {}),
            ...metadata,
        },
    };
    return run;
}
const getTracingSamplingRate = () => {
    const samplingRateStr = getLangSmithEnvironmentVariable("TRACING_SAMPLING_RATE");
    if (samplingRateStr === undefined) {
        return undefined;
    }
    const samplingRate = parseFloat(samplingRateStr);
    if (samplingRate < 0 || samplingRate > 1) {
        throw new Error(`LANGSMITH_TRACING_SAMPLING_RATE must be between 0 and 1 if set. Got: ${samplingRate}`);
    }
    return samplingRate;
};
// utility functions
const isLocalhost = (url) => {
    const strippedUrl = url.replace("http://", "").replace("https://", "");
    const hostname = strippedUrl.split("/")[0].split(":")[0];
    return (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1");
};
async function toArray(iterable) {
    const result = [];
    for await (const item of iterable) {
        result.push(item);
    }
    return result;
}
function trimQuotes(str) {
    if (str === undefined) {
        return undefined;
    }
    return str
        .trim()
        .replace(/^"(.*)"$/, "$1")
        .replace(/^'(.*)'$/, "$1");
}
const handle429 = async (response) => {
    if (response?.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") ?? "30", 10) * 1000;
        if (retryAfter > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
            // Return directly after calling this check
            return true;
        }
    }
    // Fall back to existing status checks
    return false;
};
class AutoBatchQueue {
    constructor() {
        Object.defineProperty(this, "items", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "sizeBytes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    peek() {
        return this.items[0];
    }
    push(item) {
        let itemPromiseResolve;
        const itemPromise = new Promise((resolve) => {
            // Setting itemPromiseResolve is synchronous with promise creation:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise
            itemPromiseResolve = resolve;
        });
        const size = stringify(item.item).length;
        this.items.push({
            action: item.action,
            payload: item.item,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemPromiseResolve: itemPromiseResolve,
            itemPromise,
            size,
        });
        this.sizeBytes += size;
        return itemPromise;
    }
    pop(upToSizeBytes) {
        if (upToSizeBytes < 1) {
            throw new Error("Number of bytes to pop off may not be less than 1.");
        }
        const popped = [];
        let poppedSizeBytes = 0;
        // Pop items until we reach or exceed the size limit
        while (poppedSizeBytes + (this.peek()?.size ?? 0) < upToSizeBytes &&
            this.items.length > 0) {
            const item = this.items.shift();
            if (item) {
                popped.push(item);
                poppedSizeBytes += item.size;
                this.sizeBytes -= item.size;
            }
        }
        // If there is an item on the queue we were unable to pop,
        // just return it as a single batch.
        if (popped.length === 0 && this.items.length > 0) {
            const item = this.items.shift();
            popped.push(item);
            poppedSizeBytes += item.size;
            this.sizeBytes -= item.size;
        }
        return [
            popped.map((it) => ({ action: it.action, item: it.payload })),
            () => popped.forEach((it) => it.itemPromiseResolve()),
        ];
    }
}
// 20 MB
const DEFAULT_BATCH_SIZE_LIMIT_BYTES = 20_971_520;
const SERVER_INFO_REQUEST_TIMEOUT = 1000;
class Client {
    constructor(config = {}) {
        Object.defineProperty(this, "apiKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "apiUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "webUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "caller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "batchIngestCaller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "timeout_ms", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_tenantId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "hideInputs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hideOutputs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tracingSampleRate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "filteredPostUuids", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "autoBatchTracing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "autoBatchQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new AutoBatchQueue()
        });
        Object.defineProperty(this, "autoBatchTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoBatchAggregationDelayMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 250
        });
        Object.defineProperty(this, "batchSizeBytesLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "settings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "blockOnRootRunFinalization", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: getEnvironmentVariable$1("LANGSMITH_TRACING_BACKGROUND") === "false"
        });
        Object.defineProperty(this, "traceBatchConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 5
        });
        Object.defineProperty(this, "_serverInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.defineProperty(this, "_getServerInfoPromise", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const defaultConfig = Client.getDefaultClientConfig();
        this.tracingSampleRate = getTracingSamplingRate();
        this.apiUrl = trimQuotes(config.apiUrl ?? defaultConfig.apiUrl) ?? "";
        if (this.apiUrl.endsWith("/")) {
            this.apiUrl = this.apiUrl.slice(0, -1);
        }
        this.apiKey = trimQuotes(config.apiKey ?? defaultConfig.apiKey);
        this.webUrl = trimQuotes(config.webUrl ?? defaultConfig.webUrl);
        if (this.webUrl?.endsWith("/")) {
            this.webUrl = this.webUrl.slice(0, -1);
        }
        this.timeout_ms = config.timeout_ms ?? 90_000;
        this.caller = new AsyncCaller$1(config.callerOptions ?? {});
        this.traceBatchConcurrency =
            config.traceBatchConcurrency ?? this.traceBatchConcurrency;
        if (this.traceBatchConcurrency < 1) {
            throw new Error("Trace batch concurrency must be positive.");
        }
        this.batchIngestCaller = new AsyncCaller$1({
            maxRetries: 2,
            maxConcurrency: this.traceBatchConcurrency,
            ...(config.callerOptions ?? {}),
            onFailedResponseHook: handle429,
        });
        this.hideInputs =
            config.hideInputs ?? config.anonymizer ?? defaultConfig.hideInputs;
        this.hideOutputs =
            config.hideOutputs ?? config.anonymizer ?? defaultConfig.hideOutputs;
        this.autoBatchTracing = config.autoBatchTracing ?? this.autoBatchTracing;
        this.blockOnRootRunFinalization =
            config.blockOnRootRunFinalization ?? this.blockOnRootRunFinalization;
        this.batchSizeBytesLimit = config.batchSizeBytesLimit;
        this.fetchOptions = config.fetchOptions || {};
    }
    static getDefaultClientConfig() {
        const apiKey = getLangSmithEnvironmentVariable("API_KEY");
        const apiUrl = getLangSmithEnvironmentVariable("ENDPOINT") ??
            "https://api.smith.langchain.com";
        const hideInputs = getLangSmithEnvironmentVariable("HIDE_INPUTS") === "true";
        const hideOutputs = getLangSmithEnvironmentVariable("HIDE_OUTPUTS") === "true";
        return {
            apiUrl: apiUrl,
            apiKey: apiKey,
            webUrl: undefined,
            hideInputs: hideInputs,
            hideOutputs: hideOutputs,
        };
    }
    getHostUrl() {
        if (this.webUrl) {
            return this.webUrl;
        }
        else if (isLocalhost(this.apiUrl)) {
            this.webUrl = "http://localhost:3000";
            return this.webUrl;
        }
        else if (this.apiUrl.includes("/api") &&
            !this.apiUrl.split(".", 1)[0].endsWith("api")) {
            this.webUrl = this.apiUrl.replace("/api", "");
            return this.webUrl;
        }
        else if (this.apiUrl.split(".", 1)[0].includes("dev")) {
            this.webUrl = "https://dev.smith.langchain.com";
            return this.webUrl;
        }
        else if (this.apiUrl.split(".", 1)[0].includes("eu")) {
            this.webUrl = "https://eu.smith.langchain.com";
            return this.webUrl;
        }
        else {
            this.webUrl = "https://smith.langchain.com";
            return this.webUrl;
        }
    }
    get headers() {
        const headers = {
            "User-Agent": `langsmith-js/${__version__}`,
        };
        if (this.apiKey) {
            headers["x-api-key"] = `${this.apiKey}`;
        }
        return headers;
    }
    processInputs(inputs) {
        if (this.hideInputs === false) {
            return inputs;
        }
        if (this.hideInputs === true) {
            return {};
        }
        if (typeof this.hideInputs === "function") {
            return this.hideInputs(inputs);
        }
        return inputs;
    }
    processOutputs(outputs) {
        if (this.hideOutputs === false) {
            return outputs;
        }
        if (this.hideOutputs === true) {
            return {};
        }
        if (typeof this.hideOutputs === "function") {
            return this.hideOutputs(outputs);
        }
        return outputs;
    }
    prepareRunCreateOrUpdateInputs(run) {
        const runParams = { ...run };
        if (runParams.inputs !== undefined) {
            runParams.inputs = this.processInputs(runParams.inputs);
        }
        if (runParams.outputs !== undefined) {
            runParams.outputs = this.processOutputs(runParams.outputs);
        }
        return runParams;
    }
    async _getResponse(path, queryParams) {
        const paramsString = queryParams?.toString() ?? "";
        const url = `${this.apiUrl}${path}?${paramsString}`;
        const response = await this.caller.call(_getFetchImplementation(), url, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, `Failed to fetch ${path}`);
        return response;
    }
    async _get(path, queryParams) {
        const response = await this._getResponse(path, queryParams);
        return response.json();
    }
    async *_getPaginated(path, queryParams = new URLSearchParams(), transform) {
        let offset = Number(queryParams.get("offset")) || 0;
        const limit = Number(queryParams.get("limit")) || 100;
        while (true) {
            queryParams.set("offset", String(offset));
            queryParams.set("limit", String(limit));
            const url = `${this.apiUrl}${path}?${queryParams}`;
            const response = await this.caller.call(_getFetchImplementation(), url, {
                method: "GET",
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
            await raiseForStatus(response, `Failed to fetch ${path}`);
            const items = transform
                ? transform(await response.json())
                : await response.json();
            if (items.length === 0) {
                break;
            }
            yield items;
            if (items.length < limit) {
                break;
            }
            offset += items.length;
        }
    }
    async *_getCursorPaginatedList(path, body = null, requestMethod = "POST", dataKey = "runs") {
        const bodyParams = body ? { ...body } : {};
        while (true) {
            const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}${path}`, {
                method: requestMethod,
                headers: { ...this.headers, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
                body: JSON.stringify(bodyParams),
            });
            const responseBody = await response.json();
            if (!responseBody) {
                break;
            }
            if (!responseBody[dataKey]) {
                break;
            }
            yield responseBody[dataKey];
            const cursors = responseBody.cursors;
            if (!cursors) {
                break;
            }
            if (!cursors.next) {
                break;
            }
            bodyParams.cursor = cursors.next;
        }
    }
    _filterForSampling(runs, patch = false) {
        if (this.tracingSampleRate === undefined) {
            return runs;
        }
        if (patch) {
            const sampled = [];
            for (const run of runs) {
                if (!this.filteredPostUuids.has(run.id)) {
                    sampled.push(run);
                }
                else {
                    this.filteredPostUuids.delete(run.id);
                }
            }
            return sampled;
        }
        else {
            const sampled = [];
            for (const run of runs) {
                if ((run.id !== run.trace_id &&
                    !this.filteredPostUuids.has(run.trace_id)) ||
                    Math.random() < this.tracingSampleRate) {
                    sampled.push(run);
                }
                else {
                    this.filteredPostUuids.add(run.id);
                }
            }
            return sampled;
        }
    }
    async _getBatchSizeLimitBytes() {
        const serverInfo = await this._ensureServerInfo();
        return (this.batchSizeBytesLimit ??
            serverInfo.batch_ingest_config?.size_limit_bytes ??
            DEFAULT_BATCH_SIZE_LIMIT_BYTES);
    }
    drainAutoBatchQueue(batchSizeLimit) {
        while (this.autoBatchQueue.items.length > 0) {
            const [batch, done] = this.autoBatchQueue.pop(batchSizeLimit);
            if (!batch.length) {
                done();
                break;
            }
            void this._processBatch(batch, done).catch(console.error);
        }
    }
    async _processBatch(batch, done) {
        if (!batch.length) {
            done();
            return;
        }
        try {
            const ingestParams = {
                runCreates: batch
                    .filter((item) => item.action === "create")
                    .map((item) => item.item),
                runUpdates: batch
                    .filter((item) => item.action === "update")
                    .map((item) => item.item),
            };
            const serverInfo = await this._ensureServerInfo();
            if (serverInfo?.batch_ingest_config?.use_multipart_endpoint) {
                await this.multipartIngestRuns(ingestParams);
            }
            else {
                await this.batchIngestRuns(ingestParams);
            }
        }
        finally {
            done();
        }
    }
    async processRunOperation(item) {
        clearTimeout(this.autoBatchTimeout);
        this.autoBatchTimeout = undefined;
        if (item.action === "create") {
            item.item = mergeRuntimeEnvIntoRunCreate(item.item);
        }
        const itemPromise = this.autoBatchQueue.push(item);
        const sizeLimitBytes = await this._getBatchSizeLimitBytes();
        if (this.autoBatchQueue.sizeBytes > sizeLimitBytes) {
            this.drainAutoBatchQueue(sizeLimitBytes);
        }
        if (this.autoBatchQueue.items.length > 0) {
            this.autoBatchTimeout = setTimeout(() => {
                this.autoBatchTimeout = undefined;
                this.drainAutoBatchQueue(sizeLimitBytes);
            }, this.autoBatchAggregationDelayMs);
        }
        return itemPromise;
    }
    async _getServerInfo() {
        const response = await _getFetchImplementation()(`${this.apiUrl}/info`, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(SERVER_INFO_REQUEST_TIMEOUT),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "get server info");
        return response.json();
    }
    async _ensureServerInfo() {
        if (this._getServerInfoPromise === undefined) {
            this._getServerInfoPromise = (async () => {
                if (this._serverInfo === undefined) {
                    try {
                        this._serverInfo = await this._getServerInfo();
                    }
                    catch (e) {
                        console.warn(`[WARNING]: LangSmith failed to fetch info on supported operations. Falling back to single calls and default limits.`);
                    }
                }
                return this._serverInfo ?? {};
            })();
        }
        return this._getServerInfoPromise.then((serverInfo) => {
            if (this._serverInfo === undefined) {
                this._getServerInfoPromise = undefined;
            }
            return serverInfo;
        });
    }
    async _getSettings() {
        if (!this.settings) {
            this.settings = this._get("/settings");
        }
        return await this.settings;
    }
    async createRun(run) {
        if (!this._filterForSampling([run]).length) {
            return;
        }
        const headers = { ...this.headers, "Content-Type": "application/json" };
        const session_name = run.project_name;
        delete run.project_name;
        const runCreate = this.prepareRunCreateOrUpdateInputs({
            session_name,
            ...run,
            start_time: run.start_time ?? Date.now(),
        });
        if (this.autoBatchTracing &&
            runCreate.trace_id !== undefined &&
            runCreate.dotted_order !== undefined) {
            void this.processRunOperation({
                action: "create",
                item: runCreate,
            }).catch(console.error);
            return;
        }
        const mergedRunCreateParam = mergeRuntimeEnvIntoRunCreate(runCreate);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/runs`, {
            method: "POST",
            headers,
            body: stringify(mergedRunCreateParam),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create run", true);
    }
    /**
     * Batch ingest/upsert multiple runs in the Langsmith system.
     * @param runs
     */
    async batchIngestRuns({ runCreates, runUpdates, }) {
        if (runCreates === undefined && runUpdates === undefined) {
            return;
        }
        let preparedCreateParams = runCreates?.map((create) => this.prepareRunCreateOrUpdateInputs(create)) ?? [];
        let preparedUpdateParams = runUpdates?.map((update) => this.prepareRunCreateOrUpdateInputs(update)) ?? [];
        if (preparedCreateParams.length > 0 && preparedUpdateParams.length > 0) {
            const createById = preparedCreateParams.reduce((params, run) => {
                if (!run.id) {
                    return params;
                }
                params[run.id] = run;
                return params;
            }, {});
            const standaloneUpdates = [];
            for (const updateParam of preparedUpdateParams) {
                if (updateParam.id !== undefined && createById[updateParam.id]) {
                    createById[updateParam.id] = {
                        ...createById[updateParam.id],
                        ...updateParam,
                    };
                }
                else {
                    standaloneUpdates.push(updateParam);
                }
            }
            preparedCreateParams = Object.values(createById);
            preparedUpdateParams = standaloneUpdates;
        }
        const rawBatch = {
            post: this._filterForSampling(preparedCreateParams),
            patch: this._filterForSampling(preparedUpdateParams, true),
        };
        if (!rawBatch.post.length && !rawBatch.patch.length) {
            return;
        }
        const serverInfo = await this._ensureServerInfo();
        if (serverInfo.version === undefined) {
            this.autoBatchTracing = false;
            for (const preparedCreateParam of rawBatch.post) {
                await this.createRun(preparedCreateParam);
            }
            for (const preparedUpdateParam of rawBatch.patch) {
                if (preparedUpdateParam.id !== undefined) {
                    await this.updateRun(preparedUpdateParam.id, preparedUpdateParam);
                }
            }
            return;
        }
        const batchChunks = {
            post: [],
            patch: [],
        };
        for (const k of ["post", "patch"]) {
            const key = k;
            const batchItems = rawBatch[key].reverse();
            let batchItem = batchItems.pop();
            while (batchItem !== undefined) {
                batchChunks[key].push(batchItem);
                batchItem = batchItems.pop();
            }
        }
        if (batchChunks.post.length > 0 || batchChunks.patch.length > 0) {
            await this._postBatchIngestRuns(stringify(batchChunks));
        }
    }
    async _postBatchIngestRuns(body) {
        const headers = {
            ...this.headers,
            "Content-Type": "application/json",
            Accept: "application/json",
        };
        const response = await this.batchIngestCaller.call(_getFetchImplementation(), `${this.apiUrl}/runs/batch`, {
            method: "POST",
            headers,
            body: body,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "batch create run", true);
    }
    /**
     * Batch ingest/upsert multiple runs in the Langsmith system.
     * @param runs
     */
    async multipartIngestRuns({ runCreates, runUpdates, }) {
        if (runCreates === undefined && runUpdates === undefined) {
            return;
        }
        // transform and convert to dicts
        const allAttachments = {};
        let preparedCreateParams = [];
        for (const create of runCreates ?? []) {
            const preparedCreate = this.prepareRunCreateOrUpdateInputs(create);
            if (preparedCreate.id !== undefined &&
                preparedCreate.attachments !== undefined) {
                allAttachments[preparedCreate.id] = preparedCreate.attachments;
            }
            delete preparedCreate.attachments;
            preparedCreateParams.push(preparedCreate);
        }
        let preparedUpdateParams = [];
        for (const update of runUpdates ?? []) {
            preparedUpdateParams.push(this.prepareRunCreateOrUpdateInputs(update));
        }
        // require trace_id and dotted_order
        const invalidRunCreate = preparedCreateParams.find((runCreate) => {
            return (runCreate.trace_id === undefined || runCreate.dotted_order === undefined);
        });
        if (invalidRunCreate !== undefined) {
            throw new Error(`Multipart ingest requires "trace_id" and "dotted_order" to be set when creating a run`);
        }
        const invalidRunUpdate = preparedUpdateParams.find((runUpdate) => {
            return (runUpdate.trace_id === undefined || runUpdate.dotted_order === undefined);
        });
        if (invalidRunUpdate !== undefined) {
            throw new Error(`Multipart ingest requires "trace_id" and "dotted_order" to be set when updating a run`);
        }
        // combine post and patch dicts where possible
        if (preparedCreateParams.length > 0 && preparedUpdateParams.length > 0) {
            const createById = preparedCreateParams.reduce((params, run) => {
                if (!run.id) {
                    return params;
                }
                params[run.id] = run;
                return params;
            }, {});
            const standaloneUpdates = [];
            for (const updateParam of preparedUpdateParams) {
                if (updateParam.id !== undefined && createById[updateParam.id]) {
                    createById[updateParam.id] = {
                        ...createById[updateParam.id],
                        ...updateParam,
                    };
                }
                else {
                    standaloneUpdates.push(updateParam);
                }
            }
            preparedCreateParams = Object.values(createById);
            preparedUpdateParams = standaloneUpdates;
        }
        if (preparedCreateParams.length === 0 &&
            preparedUpdateParams.length === 0) {
            return;
        }
        // send the runs in multipart requests
        const accumulatedContext = [];
        const accumulatedParts = [];
        for (const [method, payloads] of [
            ["post", preparedCreateParams],
            ["patch", preparedUpdateParams],
        ]) {
            for (const originalPayload of payloads) {
                // collect fields to be sent as separate parts
                const { inputs, outputs, events, attachments, ...payload } = originalPayload;
                const fields = { inputs, outputs, events };
                // encode the main run payload
                const stringifiedPayload = stringify(payload);
                accumulatedParts.push({
                    name: `${method}.${payload.id}`,
                    payload: new Blob([stringifiedPayload], {
                        type: `application/json; length=${stringifiedPayload.length}`, // encoding=gzip
                    }),
                });
                // encode the fields we collected
                for (const [key, value] of Object.entries(fields)) {
                    if (value === undefined) {
                        continue;
                    }
                    const stringifiedValue = stringify(value);
                    accumulatedParts.push({
                        name: `${method}.${payload.id}.${key}`,
                        payload: new Blob([stringifiedValue], {
                            type: `application/json; length=${stringifiedValue.length}`,
                        }),
                    });
                }
                // encode the attachments
                if (payload.id !== undefined) {
                    const attachments = allAttachments[payload.id];
                    if (attachments) {
                        delete allAttachments[payload.id];
                        for (const [name, [contentType, content]] of Object.entries(attachments)) {
                            // Validate that the attachment name doesn't contain a '.'
                            if (name.includes(".")) {
                                console.warn(`Skipping attachment '${name}' for run ${payload.id}: Invalid attachment name. ` +
                                    `Attachment names must not contain periods ('.'). Please rename the attachment and try again.`);
                                continue;
                            }
                            accumulatedParts.push({
                                name: `attachment.${payload.id}.${name}`,
                                payload: new Blob([content], {
                                    type: `${contentType}; length=${content.byteLength}`,
                                }),
                            });
                        }
                    }
                }
                // compute context
                accumulatedContext.push(`trace=${payload.trace_id},id=${payload.id}`);
            }
        }
        await this._sendMultipartRequest(accumulatedParts, accumulatedContext.join("; "));
    }
    async _sendMultipartRequest(parts, context) {
        try {
            const formData = new FormData();
            for (const part of parts) {
                formData.append(part.name, part.payload);
            }
            // Log the form data
            await this.batchIngestCaller.call(_getFetchImplementation(), `${this.apiUrl}/runs/multipart`, {
                method: "POST",
                headers: {
                    ...this.headers,
                },
                body: formData,
                signal: AbortSignal.timeout(this.timeout_ms),
                ...this.fetchOptions,
            });
        }
        catch (e) {
            let errorMessage = "Failed to multipart ingest runs";
            // eslint-disable-next-line no-instanceof/no-instanceof
            if (e instanceof Error) {
                errorMessage += `: ${e.stack || e.message}`;
            }
            else {
                errorMessage += `: ${String(e)}`;
            }
            console.warn(`${errorMessage.trim()}\n\nContext: ${context}`);
        }
    }
    async updateRun(runId, run) {
        assertUuid(runId);
        if (run.inputs) {
            run.inputs = this.processInputs(run.inputs);
        }
        if (run.outputs) {
            run.outputs = this.processOutputs(run.outputs);
        }
        // TODO: Untangle types
        const data = { ...run, id: runId };
        if (!this._filterForSampling([data], true).length) {
            return;
        }
        if (this.autoBatchTracing &&
            data.trace_id !== undefined &&
            data.dotted_order !== undefined) {
            if (run.end_time !== undefined &&
                data.parent_run_id === undefined &&
                this.blockOnRootRunFinalization) {
                // Trigger batches as soon as a root trace ends and wait to ensure trace finishes
                // in serverless environments.
                await this.processRunOperation({ action: "update", item: data }).catch(console.error);
                return;
            }
            else {
                void this.processRunOperation({ action: "update", item: data }).catch(console.error);
            }
            return;
        }
        const headers = { ...this.headers, "Content-Type": "application/json" };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/runs/${runId}`, {
            method: "PATCH",
            headers,
            body: stringify(run),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update run", true);
    }
    async readRun(runId, { loadChildRuns } = { loadChildRuns: false }) {
        assertUuid(runId);
        let run = await this._get(`/runs/${runId}`);
        if (loadChildRuns && run.child_run_ids) {
            run = await this._loadChildRuns(run);
        }
        return run;
    }
    async getRunUrl({ runId, run, projectOpts, }) {
        if (run !== undefined) {
            let sessionId;
            if (run.session_id) {
                sessionId = run.session_id;
            }
            else if (projectOpts?.projectName) {
                sessionId = (await this.readProject({ projectName: projectOpts?.projectName })).id;
            }
            else if (projectOpts?.projectId) {
                sessionId = projectOpts?.projectId;
            }
            else {
                const project = await this.readProject({
                    projectName: getLangSmithEnvironmentVariable("PROJECT") || "default",
                });
                sessionId = project.id;
            }
            const tenantId = await this._getTenantId();
            return `${this.getHostUrl()}/o/${tenantId}/projects/p/${sessionId}/r/${run.id}?poll=true`;
        }
        else if (runId !== undefined) {
            const run_ = await this.readRun(runId);
            if (!run_.app_path) {
                throw new Error(`Run ${runId} has no app_path`);
            }
            const baseUrl = this.getHostUrl();
            return `${baseUrl}${run_.app_path}`;
        }
        else {
            throw new Error("Must provide either runId or run");
        }
    }
    async _loadChildRuns(run) {
        const childRuns = await toArray(this.listRuns({ id: run.child_run_ids }));
        const treemap = {};
        const runs = {};
        // TODO: make dotted order required when the migration finishes
        childRuns.sort((a, b) => (a?.dotted_order ?? "").localeCompare(b?.dotted_order ?? ""));
        for (const childRun of childRuns) {
            if (childRun.parent_run_id === null ||
                childRun.parent_run_id === undefined) {
                throw new Error(`Child run ${childRun.id} has no parent`);
            }
            if (!(childRun.parent_run_id in treemap)) {
                treemap[childRun.parent_run_id] = [];
            }
            treemap[childRun.parent_run_id].push(childRun);
            runs[childRun.id] = childRun;
        }
        run.child_runs = treemap[run.id] || [];
        for (const runId in treemap) {
            if (runId !== run.id) {
                runs[runId].child_runs = treemap[runId];
            }
        }
        return run;
    }
    /**
     * List runs from the LangSmith server.
     * @param projectId - The ID of the project to filter by.
     * @param projectName - The name of the project to filter by.
     * @param parentRunId - The ID of the parent run to filter by.
     * @param traceId - The ID of the trace to filter by.
     * @param referenceExampleId - The ID of the reference example to filter by.
     * @param startTime - The start time to filter by.
     * @param isRoot - Indicates whether to only return root runs.
     * @param runType - The run type to filter by.
     * @param error - Indicates whether to filter by error runs.
     * @param id - The ID of the run to filter by.
     * @param query - The query string to filter by.
     * @param filter - The filter string to apply to the run spans.
     * @param traceFilter - The filter string to apply on the root run of the trace.
     * @param limit - The maximum number of runs to retrieve.
     * @returns {AsyncIterable<Run>} - The runs.
     *
     * @example
     * // List all runs in a project
     * const projectRuns = client.listRuns({ projectName: "<your_project>" });
     *
     * @example
     * // List LLM and Chat runs in the last 24 hours
     * const todaysLLMRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
     *   run_type: "llm",
     * });
     *
     * @example
     * // List traces in a project
     * const rootRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   execution_order: 1,
     * });
     *
     * @example
     * // List runs without errors
     * const correctRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   error: false,
     * });
     *
     * @example
     * // List runs by run ID
     * const runIds = [
     *   "a36092d2-4ad5-4fb4-9c0d-0dba9a2ed836",
     *   "9398e6be-964f-4aa4-8ae9-ad78cd4b7074",
     * ];
     * const selectedRuns = client.listRuns({ run_ids: runIds });
     *
     * @example
     * // List all "chain" type runs that took more than 10 seconds and had `total_tokens` greater than 5000
     * const chainRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'and(eq(run_type, "chain"), gt(latency, 10), gt(total_tokens, 5000))',
     * });
     *
     * @example
     * // List all runs called "extractor" whose root of the trace was assigned feedback "user_score" score of 1
     * const goodExtractorRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'eq(name, "extractor")',
     *   traceFilter: 'and(eq(feedback_key, "user_score"), eq(feedback_score, 1))',
     * });
     *
     * @example
     * // List all runs that started after a specific timestamp and either have "error" not equal to null or a "Correctness" feedback score equal to 0
     * const complexRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'and(gt(start_time, "2023-07-15T12:34:56Z"), or(neq(error, null), and(eq(feedback_key, "Correctness"), eq(feedback_score, 0.0))))',
     * });
     *
     * @example
     * // List all runs where `tags` include "experimental" or "beta" and `latency` is greater than 2 seconds
     * const taggedRuns = client.listRuns({
     *   projectName: "<your_project>",
     *   filter: 'and(or(has(tags, "experimental"), has(tags, "beta")), gt(latency, 2))',
     * });
     */
    async *listRuns(props) {
        const { projectId, projectName, parentRunId, traceId, referenceExampleId, startTime, executionOrder, isRoot, runType, error, id, query, filter, traceFilter, treeFilter, limit, select, } = props;
        let projectIds = [];
        if (projectId) {
            projectIds = Array.isArray(projectId) ? projectId : [projectId];
        }
        if (projectName) {
            const projectNames = Array.isArray(projectName)
                ? projectName
                : [projectName];
            const projectIds_ = await Promise.all(projectNames.map((name) => this.readProject({ projectName: name }).then((project) => project.id)));
            projectIds.push(...projectIds_);
        }
        const default_select = [
            "app_path",
            "child_run_ids",
            "completion_cost",
            "completion_tokens",
            "dotted_order",
            "end_time",
            "error",
            "events",
            "extra",
            "feedback_stats",
            "first_token_time",
            "id",
            "inputs",
            "name",
            "outputs",
            "parent_run_id",
            "parent_run_ids",
            "prompt_cost",
            "prompt_tokens",
            "reference_example_id",
            "run_type",
            "session_id",
            "start_time",
            "status",
            "tags",
            "total_cost",
            "total_tokens",
            "trace_id",
        ];
        const body = {
            session: projectIds.length ? projectIds : null,
            run_type: runType,
            reference_example: referenceExampleId,
            query,
            filter,
            trace_filter: traceFilter,
            tree_filter: treeFilter,
            execution_order: executionOrder,
            parent_run: parentRunId,
            start_time: startTime ? startTime.toISOString() : null,
            error,
            id,
            limit,
            trace: traceId,
            select: select ? select : default_select,
            is_root: isRoot,
        };
        let runsYielded = 0;
        for await (const runs of this._getCursorPaginatedList("/runs/query", body)) {
            if (limit) {
                if (runsYielded >= limit) {
                    break;
                }
                if (runs.length + runsYielded > limit) {
                    const newRuns = runs.slice(0, limit - runsYielded);
                    yield* newRuns;
                    break;
                }
                runsYielded += runs.length;
                yield* runs;
            }
            else {
                yield* runs;
            }
        }
    }
    async getRunStats({ id, trace, parentRun, runType, projectNames, projectIds, referenceExampleIds, startTime, endTime, error, query, filter, traceFilter, treeFilter, isRoot, dataSourceType, }) {
        let projectIds_ = projectIds || [];
        if (projectNames) {
            projectIds_ = [
                ...(projectIds || []),
                ...(await Promise.all(projectNames.map((name) => this.readProject({ projectName: name }).then((project) => project.id)))),
            ];
        }
        const payload = {
            id,
            trace,
            parent_run: parentRun,
            run_type: runType,
            session: projectIds_,
            reference_example: referenceExampleIds,
            start_time: startTime,
            end_time: endTime,
            error,
            query,
            filter,
            trace_filter: traceFilter,
            tree_filter: treeFilter,
            is_root: isRoot,
            data_source_type: dataSourceType,
        };
        // Remove undefined values from the payload
        const filteredPayload = Object.fromEntries(Object.entries(payload).filter(([_, value]) => value !== undefined));
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/runs/stats`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(filteredPayload),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const result = await response.json();
        return result;
    }
    async shareRun(runId, { shareId } = {}) {
        const data = {
            run_id: runId,
            share_token: shareId || v4(),
        };
        assertUuid(runId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/runs/${runId}/share`, {
            method: "PUT",
            headers: this.headers,
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const result = await response.json();
        if (result === null || !("share_token" in result)) {
            throw new Error("Invalid response from server");
        }
        return `${this.getHostUrl()}/public/${result["share_token"]}/r`;
    }
    async unshareRun(runId) {
        assertUuid(runId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/runs/${runId}/share`, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "unshare run", true);
    }
    async readRunSharedLink(runId) {
        assertUuid(runId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/runs/${runId}/share`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const result = await response.json();
        if (result === null || !("share_token" in result)) {
            return undefined;
        }
        return `${this.getHostUrl()}/public/${result["share_token"]}/r`;
    }
    async listSharedRuns(shareToken, { runIds, } = {}) {
        const queryParams = new URLSearchParams({
            share_token: shareToken,
        });
        if (runIds !== undefined) {
            for (const runId of runIds) {
                queryParams.append("id", runId);
            }
        }
        assertUuid(shareToken);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/public/${shareToken}/runs${queryParams}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const runs = await response.json();
        return runs;
    }
    async readDatasetSharedSchema(datasetId, datasetName) {
        if (!datasetId && !datasetName) {
            throw new Error("Either datasetId or datasetName must be given");
        }
        if (!datasetId) {
            const dataset = await this.readDataset({ datasetName });
            datasetId = dataset.id;
        }
        assertUuid(datasetId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${datasetId}/share`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const shareSchema = await response.json();
        shareSchema.url = `${this.getHostUrl()}/public/${shareSchema.share_token}/d`;
        return shareSchema;
    }
    async shareDataset(datasetId, datasetName) {
        if (!datasetId && !datasetName) {
            throw new Error("Either datasetId or datasetName must be given");
        }
        if (!datasetId) {
            const dataset = await this.readDataset({ datasetName });
            datasetId = dataset.id;
        }
        const data = {
            dataset_id: datasetId,
        };
        assertUuid(datasetId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${datasetId}/share`, {
            method: "PUT",
            headers: this.headers,
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const shareSchema = await response.json();
        shareSchema.url = `${this.getHostUrl()}/public/${shareSchema.share_token}/d`;
        return shareSchema;
    }
    async unshareDataset(datasetId) {
        assertUuid(datasetId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${datasetId}/share`, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "unshare dataset", true);
    }
    async readSharedDataset(shareToken) {
        assertUuid(shareToken);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/public/${shareToken}/datasets`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const dataset = await response.json();
        return dataset;
    }
    /**
     * Get shared examples.
     *
     * @param {string} shareToken The share token to get examples for. A share token is the UUID (or LangSmith URL, including UUID) generated when explicitly marking an example as public.
     * @param {Object} [options] Additional options for listing the examples.
     * @param {string[] | undefined} [options.exampleIds] A list of example IDs to filter by.
     * @returns {Promise<Example[]>} The shared examples.
     */
    async listSharedExamples(shareToken, options) {
        const params = {};
        if (options?.exampleIds) {
            params.id = options.exampleIds;
        }
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((v) => urlParams.append(key, v));
            }
            else {
                urlParams.append(key, value);
            }
        });
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/public/${shareToken}/examples?${urlParams.toString()}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const result = await response.json();
        if (!response.ok) {
            if ("detail" in result) {
                throw new Error(`Failed to list shared examples.\nStatus: ${response.status}\nMessage: ${result.detail.join("\n")}`);
            }
            throw new Error(`Failed to list shared examples: ${response.status} ${response.statusText}`);
        }
        return result.map((example) => ({
            ...example,
            _hostUrl: this.getHostUrl(),
        }));
    }
    async createProject({ projectName, description = null, metadata = null, upsert = false, projectExtra = null, referenceDatasetId = null, }) {
        const upsert_ = upsert ? `?upsert=true` : "";
        const endpoint = `${this.apiUrl}/sessions${upsert_}`;
        const extra = projectExtra || {};
        if (metadata) {
            extra["metadata"] = metadata;
        }
        const body = {
            name: projectName,
            extra,
            description,
        };
        if (referenceDatasetId !== null) {
            body["reference_dataset_id"] = referenceDatasetId;
        }
        const response = await this.caller.call(_getFetchImplementation(), endpoint, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create project");
        const result = await response.json();
        return result;
    }
    async updateProject(projectId, { name = null, description = null, metadata = null, projectExtra = null, endTime = null, }) {
        const endpoint = `${this.apiUrl}/sessions/${projectId}`;
        let extra = projectExtra;
        if (metadata) {
            extra = { ...(extra || {}), metadata };
        }
        const body = {
            name,
            extra,
            description,
            end_time: endTime ? new Date(endTime).toISOString() : null,
        };
        const response = await this.caller.call(_getFetchImplementation(), endpoint, {
            method: "PATCH",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update project");
        const result = await response.json();
        return result;
    }
    async hasProject({ projectId, projectName, }) {
        // TODO: Add a head request
        let path = "/sessions";
        const params = new URLSearchParams();
        if (projectId !== undefined && projectName !== undefined) {
            throw new Error("Must provide either projectName or projectId, not both");
        }
        else if (projectId !== undefined) {
            assertUuid(projectId);
            path += `/${projectId}`;
        }
        else if (projectName !== undefined) {
            params.append("name", projectName);
        }
        else {
            throw new Error("Must provide projectName or projectId");
        }
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}${path}?${params}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        // consume the response body to release the connection
        // https://undici.nodejs.org/#/?id=garbage-collection
        try {
            const result = await response.json();
            if (!response.ok) {
                return false;
            }
            // If it's OK and we're querying by name, need to check the list is not empty
            if (Array.isArray(result)) {
                return result.length > 0;
            }
            // projectId querying
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async readProject({ projectId, projectName, includeStats, }) {
        let path = "/sessions";
        const params = new URLSearchParams();
        if (projectId !== undefined && projectName !== undefined) {
            throw new Error("Must provide either projectName or projectId, not both");
        }
        else if (projectId !== undefined) {
            assertUuid(projectId);
            path += `/${projectId}`;
        }
        else if (projectName !== undefined) {
            params.append("name", projectName);
        }
        else {
            throw new Error("Must provide projectName or projectId");
        }
        if (includeStats !== undefined) {
            params.append("include_stats", includeStats.toString());
        }
        const response = await this._get(path, params);
        let result;
        if (Array.isArray(response)) {
            if (response.length === 0) {
                throw new Error(`Project[id=${projectId}, name=${projectName}] not found`);
            }
            result = response[0];
        }
        else {
            result = response;
        }
        return result;
    }
    async getProjectUrl({ projectId, projectName, }) {
        if (projectId === undefined && projectName === undefined) {
            throw new Error("Must provide either projectName or projectId");
        }
        const project = await this.readProject({ projectId, projectName });
        const tenantId = await this._getTenantId();
        return `${this.getHostUrl()}/o/${tenantId}/projects/p/${project.id}`;
    }
    async getDatasetUrl({ datasetId, datasetName, }) {
        if (datasetId === undefined && datasetName === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        const dataset = await this.readDataset({ datasetId, datasetName });
        const tenantId = await this._getTenantId();
        return `${this.getHostUrl()}/o/${tenantId}/datasets/${dataset.id}`;
    }
    async _getTenantId() {
        if (this._tenantId !== null) {
            return this._tenantId;
        }
        const queryParams = new URLSearchParams({ limit: "1" });
        for await (const projects of this._getPaginated("/sessions", queryParams)) {
            this._tenantId = projects[0].tenant_id;
            return projects[0].tenant_id;
        }
        throw new Error("No projects found to resolve tenant.");
    }
    async *listProjects({ projectIds, name, nameContains, referenceDatasetId, referenceDatasetName, referenceFree, metadata, } = {}) {
        const params = new URLSearchParams();
        if (projectIds !== undefined) {
            for (const projectId of projectIds) {
                params.append("id", projectId);
            }
        }
        if (name !== undefined) {
            params.append("name", name);
        }
        if (nameContains !== undefined) {
            params.append("name_contains", nameContains);
        }
        if (referenceDatasetId !== undefined) {
            params.append("reference_dataset", referenceDatasetId);
        }
        else if (referenceDatasetName !== undefined) {
            const dataset = await this.readDataset({
                datasetName: referenceDatasetName,
            });
            params.append("reference_dataset", dataset.id);
        }
        if (referenceFree !== undefined) {
            params.append("reference_free", referenceFree.toString());
        }
        if (metadata !== undefined) {
            params.append("metadata", JSON.stringify(metadata));
        }
        for await (const projects of this._getPaginated("/sessions", params)) {
            yield* projects;
        }
    }
    async deleteProject({ projectId, projectName, }) {
        let projectId_;
        if (projectId === undefined && projectName === undefined) {
            throw new Error("Must provide projectName or projectId");
        }
        else if (projectId !== undefined && projectName !== undefined) {
            throw new Error("Must provide either projectName or projectId, not both");
        }
        else if (projectId === undefined) {
            projectId_ = (await this.readProject({ projectName })).id;
        }
        else {
            projectId_ = projectId;
        }
        assertUuid(projectId_);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/sessions/${projectId_}`, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, `delete session ${projectId_} (${projectName})`, true);
    }
    async uploadCsv({ csvFile, fileName, inputKeys, outputKeys, description, dataType, name, }) {
        const url = `${this.apiUrl}/datasets/upload`;
        const formData = new FormData();
        formData.append("file", csvFile, fileName);
        inputKeys.forEach((key) => {
            formData.append("input_keys", key);
        });
        outputKeys.forEach((key) => {
            formData.append("output_keys", key);
        });
        if (description) {
            formData.append("description", description);
        }
        if (dataType) {
            formData.append("data_type", dataType);
        }
        if (name) {
            formData.append("name", name);
        }
        const response = await this.caller.call(_getFetchImplementation(), url, {
            method: "POST",
            headers: this.headers,
            body: formData,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "upload CSV");
        const result = await response.json();
        return result;
    }
    async createDataset(name, { description, dataType, inputsSchema, outputsSchema, metadata, } = {}) {
        const body = {
            name,
            description,
            extra: metadata ? { metadata } : undefined,
        };
        if (dataType) {
            body.data_type = dataType;
        }
        if (inputsSchema) {
            body.inputs_schema_definition = inputsSchema;
        }
        if (outputsSchema) {
            body.outputs_schema_definition = outputsSchema;
        }
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create dataset");
        const result = await response.json();
        return result;
    }
    async readDataset({ datasetId, datasetName, }) {
        let path = "/datasets";
        // limit to 1 result
        const params = new URLSearchParams({ limit: "1" });
        if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId !== undefined) {
            assertUuid(datasetId);
            path += `/${datasetId}`;
        }
        else if (datasetName !== undefined) {
            params.append("name", datasetName);
        }
        else {
            throw new Error("Must provide datasetName or datasetId");
        }
        const response = await this._get(path, params);
        let result;
        if (Array.isArray(response)) {
            if (response.length === 0) {
                throw new Error(`Dataset[id=${datasetId}, name=${datasetName}] not found`);
            }
            result = response[0];
        }
        else {
            result = response;
        }
        return result;
    }
    async hasDataset({ datasetId, datasetName, }) {
        try {
            await this.readDataset({ datasetId, datasetName });
            return true;
        }
        catch (e) {
            if (
            // eslint-disable-next-line no-instanceof/no-instanceof
            e instanceof Error &&
                e.message.toLocaleLowerCase().includes("not found")) {
                return false;
            }
            throw e;
        }
    }
    async diffDatasetVersions({ datasetId, datasetName, fromVersion, toVersion, }) {
        let datasetId_ = datasetId;
        if (datasetId_ === undefined && datasetName === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId_ === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        const urlParams = new URLSearchParams({
            from_version: typeof fromVersion === "string"
                ? fromVersion
                : fromVersion.toISOString(),
            to_version: typeof toVersion === "string" ? toVersion : toVersion.toISOString(),
        });
        const response = await this._get(`/datasets/${datasetId_}/versions/diff`, urlParams);
        return response;
    }
    async readDatasetOpenaiFinetuning({ datasetId, datasetName, }) {
        const path = "/datasets";
        if (datasetId !== undefined) ;
        else if (datasetName !== undefined) {
            datasetId = (await this.readDataset({ datasetName })).id;
        }
        else {
            throw new Error("Must provide datasetName or datasetId");
        }
        const response = await this._getResponse(`${path}/${datasetId}/openai_ft`);
        const datasetText = await response.text();
        const dataset = datasetText
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        return dataset;
    }
    async *listDatasets({ limit = 100, offset = 0, datasetIds, datasetName, datasetNameContains, metadata, } = {}) {
        const path = "/datasets";
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });
        if (datasetIds !== undefined) {
            for (const id_ of datasetIds) {
                params.append("id", id_);
            }
        }
        if (datasetName !== undefined) {
            params.append("name", datasetName);
        }
        if (datasetNameContains !== undefined) {
            params.append("name_contains", datasetNameContains);
        }
        if (metadata !== undefined) {
            params.append("metadata", JSON.stringify(metadata));
        }
        for await (const datasets of this._getPaginated(path, params)) {
            yield* datasets;
        }
    }
    /**
     * Update a dataset
     * @param props The dataset details to update
     * @returns The updated dataset
     */
    async updateDataset(props) {
        const { datasetId, datasetName, ...update } = props;
        if (!datasetId && !datasetName) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        const _datasetId = datasetId ?? (await this.readDataset({ datasetName })).id;
        assertUuid(_datasetId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${_datasetId}`, {
            method: "PATCH",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(update),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update dataset");
        return (await response.json());
    }
    async deleteDataset({ datasetId, datasetName, }) {
        let path = "/datasets";
        let datasetId_ = datasetId;
        if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetName !== undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        if (datasetId_ !== undefined) {
            assertUuid(datasetId_);
            path += `/${datasetId_}`;
        }
        else {
            throw new Error("Must provide datasetName or datasetId");
        }
        const response = await this.caller.call(_getFetchImplementation(), this.apiUrl + path, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, `delete ${path}`);
        await response.json();
    }
    async indexDataset({ datasetId, datasetName, tag, }) {
        let datasetId_ = datasetId;
        if (!datasetId_ && !datasetName) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ && datasetName) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (!datasetId_) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        assertUuid(datasetId_);
        const data = {
            tag: tag,
        };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${datasetId_}/index`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "index dataset");
        await response.json();
    }
    /**
     * Lets you run a similarity search query on a dataset.
     *
     * Requires the dataset to be indexed. Please see the `indexDataset` method to set up indexing.
     *
     * @param inputs      The input on which to run the similarity search. Must have the
     *                    same schema as the dataset.
     *
     * @param datasetId   The dataset to search for similar examples.
     *
     * @param limit       The maximum number of examples to return. Will return the top `limit` most
     *                    similar examples in order of most similar to least similar. If no similar
     *                    examples are found, random examples will be returned.
     *
     * @param filter      A filter string to apply to the search. Only examples will be returned that
     *                    match the filter string. Some examples of filters
     *
     *                    - eq(metadata.mykey, "value")
     *                    - and(neq(metadata.my.nested.key, "value"), neq(metadata.mykey, "value"))
     *                    - or(eq(metadata.mykey, "value"), eq(metadata.mykey, "othervalue"))
     *
     * @returns           A list of similar examples.
     *
     *
     * @example
     * dataset_id = "123e4567-e89b-12d3-a456-426614174000"
     * inputs = {"text": "How many people live in Berlin?"}
     * limit = 5
     * examples = await client.similarExamples(inputs, dataset_id, limit)
     */
    async similarExamples(inputs, datasetId, limit, { filter, } = {}) {
        const data = {
            limit: limit,
            inputs: inputs,
        };
        if (filter !== undefined) {
            data["filter"] = filter;
        }
        assertUuid(datasetId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${datasetId}/search`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "fetch similar examples");
        const result = await response.json();
        return result["examples"];
    }
    async createExample(inputs, outputs, { datasetId, datasetName, createdAt, exampleId, metadata, split, sourceRunId, }) {
        let datasetId_ = datasetId;
        if (datasetId_ === undefined && datasetName === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId_ === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        const createdAt_ = createdAt || new Date();
        const data = {
            dataset_id: datasetId_,
            inputs,
            outputs,
            created_at: createdAt_?.toISOString(),
            id: exampleId,
            metadata,
            split,
            source_run_id: sourceRunId,
        };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/examples`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create example");
        const result = await response.json();
        return result;
    }
    async createExamples(props) {
        const { inputs, outputs, metadata, sourceRunIds, exampleIds, datasetId, datasetName, } = props;
        let datasetId_ = datasetId;
        if (datasetId_ === undefined && datasetName === undefined) {
            throw new Error("Must provide either datasetName or datasetId");
        }
        else if (datasetId_ !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId_ === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        const formattedExamples = inputs.map((input, idx) => {
            return {
                dataset_id: datasetId_,
                inputs: input,
                outputs: outputs ? outputs[idx] : undefined,
                metadata: metadata ? metadata[idx] : undefined,
                split: props.splits ? props.splits[idx] : undefined,
                id: exampleIds ? exampleIds[idx] : undefined,
                source_run_id: sourceRunIds ? sourceRunIds[idx] : undefined,
            };
        });
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/examples/bulk`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(formattedExamples),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create examples");
        const result = await response.json();
        return result;
    }
    async createLLMExample(input, generation, options) {
        return this.createExample({ input }, { output: generation }, options);
    }
    async createChatExample(input, generations, options) {
        const finalInput = input.map((message) => {
            if (isLangChainMessage(message)) {
                return convertLangChainMessageToExample(message);
            }
            return message;
        });
        const finalOutput = isLangChainMessage(generations)
            ? convertLangChainMessageToExample(generations)
            : generations;
        return this.createExample({ input: finalInput }, { output: finalOutput }, options);
    }
    async readExample(exampleId) {
        assertUuid(exampleId);
        const path = `/examples/${exampleId}`;
        return await this._get(path);
    }
    async *listExamples({ datasetId, datasetName, exampleIds, asOf, splits, inlineS3Urls, metadata, limit, offset, filter, } = {}) {
        let datasetId_;
        if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId !== undefined) {
            datasetId_ = datasetId;
        }
        else if (datasetName !== undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        else {
            throw new Error("Must provide a datasetName or datasetId");
        }
        const params = new URLSearchParams({ dataset: datasetId_ });
        const dataset_version = asOf
            ? typeof asOf === "string"
                ? asOf
                : asOf?.toISOString()
            : undefined;
        if (dataset_version) {
            params.append("as_of", dataset_version);
        }
        const inlineS3Urls_ = inlineS3Urls ?? true;
        params.append("inline_s3_urls", inlineS3Urls_.toString());
        if (exampleIds !== undefined) {
            for (const id_ of exampleIds) {
                params.append("id", id_);
            }
        }
        if (splits !== undefined) {
            for (const split of splits) {
                params.append("splits", split);
            }
        }
        if (metadata !== undefined) {
            const serializedMetadata = JSON.stringify(metadata);
            params.append("metadata", serializedMetadata);
        }
        if (limit !== undefined) {
            params.append("limit", limit.toString());
        }
        if (offset !== undefined) {
            params.append("offset", offset.toString());
        }
        if (filter !== undefined) {
            params.append("filter", filter);
        }
        let i = 0;
        for await (const examples of this._getPaginated("/examples", params)) {
            for (const example of examples) {
                yield example;
                i++;
            }
            if (limit !== undefined && i >= limit) {
                break;
            }
        }
    }
    async deleteExample(exampleId) {
        assertUuid(exampleId);
        const path = `/examples/${exampleId}`;
        const response = await this.caller.call(_getFetchImplementation(), this.apiUrl + path, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, `delete ${path}`);
        await response.json();
    }
    async updateExample(exampleId, update) {
        assertUuid(exampleId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/examples/${exampleId}`, {
            method: "PATCH",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(update),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update example");
        const result = await response.json();
        return result;
    }
    async updateExamples(update) {
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/examples/bulk`, {
            method: "PATCH",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(update),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update examples");
        const result = await response.json();
        return result;
    }
    async listDatasetSplits({ datasetId, datasetName, asOf, }) {
        let datasetId_;
        if (datasetId === undefined && datasetName === undefined) {
            throw new Error("Must provide dataset name or ID");
        }
        else if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        else {
            datasetId_ = datasetId;
        }
        assertUuid(datasetId_);
        const params = new URLSearchParams();
        const dataset_version = asOf
            ? typeof asOf === "string"
                ? asOf
                : asOf?.toISOString()
            : undefined;
        if (dataset_version) {
            params.append("as_of", dataset_version);
        }
        const response = await this._get(`/datasets/${datasetId_}/splits`, params);
        return response;
    }
    async updateDatasetSplits({ datasetId, datasetName, splitName, exampleIds, remove = false, }) {
        let datasetId_;
        if (datasetId === undefined && datasetName === undefined) {
            throw new Error("Must provide dataset name or ID");
        }
        else if (datasetId !== undefined && datasetName !== undefined) {
            throw new Error("Must provide either datasetName or datasetId, not both");
        }
        else if (datasetId === undefined) {
            const dataset = await this.readDataset({ datasetName });
            datasetId_ = dataset.id;
        }
        else {
            datasetId_ = datasetId;
        }
        assertUuid(datasetId_);
        const data = {
            split_name: splitName,
            examples: exampleIds.map((id) => {
                assertUuid(id);
                return id;
            }),
            remove,
        };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/${datasetId_}/splits`, {
            method: "PUT",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update dataset splits", true);
    }
    /**
     * @deprecated This method is deprecated and will be removed in future LangSmith versions, use `evaluate` from `langsmith/evaluation` instead.
     */
    async evaluateRun(run, evaluator, { sourceInfo, loadChildRuns, referenceExample, } = { loadChildRuns: false }) {
        warnOnce("This method is deprecated and will be removed in future LangSmith versions, use `evaluate` from `langsmith/evaluation` instead.");
        let run_;
        if (typeof run === "string") {
            run_ = await this.readRun(run, { loadChildRuns });
        }
        else if (typeof run === "object" && "id" in run) {
            run_ = run;
        }
        else {
            throw new Error(`Invalid run type: ${typeof run}`);
        }
        if (run_.reference_example_id !== null &&
            run_.reference_example_id !== undefined) {
            referenceExample = await this.readExample(run_.reference_example_id);
        }
        const feedbackResult = await evaluator.evaluateRun(run_, referenceExample);
        const [_, feedbacks] = await this._logEvaluationFeedback(feedbackResult, run_, sourceInfo);
        return feedbacks[0];
    }
    async createFeedback(runId, key, { score, value, correction, comment, sourceInfo, feedbackSourceType = "api", sourceRunId, feedbackId, feedbackConfig, projectId, comparativeExperimentId, }) {
        if (!runId && !projectId) {
            throw new Error("One of runId or projectId must be provided");
        }
        if (runId && projectId) {
            throw new Error("Only one of runId or projectId can be provided");
        }
        const feedback_source = {
            type: feedbackSourceType ?? "api",
            metadata: sourceInfo ?? {},
        };
        if (sourceRunId !== undefined &&
            feedback_source?.metadata !== undefined &&
            !feedback_source.metadata["__run"]) {
            feedback_source.metadata["__run"] = { run_id: sourceRunId };
        }
        if (feedback_source?.metadata !== undefined &&
            feedback_source.metadata["__run"]?.run_id !== undefined) {
            assertUuid(feedback_source.metadata["__run"].run_id);
        }
        const feedback = {
            id: feedbackId ?? v4(),
            run_id: runId,
            key,
            score,
            value,
            correction,
            comment,
            feedback_source: feedback_source,
            comparative_experiment_id: comparativeExperimentId,
            feedbackConfig,
            session_id: projectId,
        };
        const url = `${this.apiUrl}/feedback`;
        const response = await this.caller.call(_getFetchImplementation(), url, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(feedback),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create feedback", true);
        return feedback;
    }
    async updateFeedback(feedbackId, { score, value, correction, comment, }) {
        const feedbackUpdate = {};
        if (score !== undefined && score !== null) {
            feedbackUpdate["score"] = score;
        }
        if (value !== undefined && value !== null) {
            feedbackUpdate["value"] = value;
        }
        if (correction !== undefined && correction !== null) {
            feedbackUpdate["correction"] = correction;
        }
        if (comment !== undefined && comment !== null) {
            feedbackUpdate["comment"] = comment;
        }
        assertUuid(feedbackId);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/feedback/${feedbackId}`, {
            method: "PATCH",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(feedbackUpdate),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update feedback", true);
    }
    async readFeedback(feedbackId) {
        assertUuid(feedbackId);
        const path = `/feedback/${feedbackId}`;
        const response = await this._get(path);
        return response;
    }
    async deleteFeedback(feedbackId) {
        assertUuid(feedbackId);
        const path = `/feedback/${feedbackId}`;
        const response = await this.caller.call(_getFetchImplementation(), this.apiUrl + path, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, `delete ${path}`);
        await response.json();
    }
    async *listFeedback({ runIds, feedbackKeys, feedbackSourceTypes, } = {}) {
        const queryParams = new URLSearchParams();
        if (runIds) {
            queryParams.append("run", runIds.join(","));
        }
        if (feedbackKeys) {
            for (const key of feedbackKeys) {
                queryParams.append("key", key);
            }
        }
        if (feedbackSourceTypes) {
            for (const type of feedbackSourceTypes) {
                queryParams.append("source", type);
            }
        }
        for await (const feedbacks of this._getPaginated("/feedback", queryParams)) {
            yield* feedbacks;
        }
    }
    /**
     * Creates a presigned feedback token and URL.
     *
     * The token can be used to authorize feedback metrics without
     * needing an API key. This is useful for giving browser-based
     * applications the ability to submit feedback without needing
     * to expose an API key.
     *
     * @param runId - The ID of the run.
     * @param feedbackKey - The feedback key.
     * @param options - Additional options for the token.
     * @param options.expiration - The expiration time for the token.
     *
     * @returns A promise that resolves to a FeedbackIngestToken.
     */
    async createPresignedFeedbackToken(runId, feedbackKey, { expiration, feedbackConfig, } = {}) {
        const body = {
            run_id: runId,
            feedback_key: feedbackKey,
            feedback_config: feedbackConfig,
        };
        if (expiration) {
            if (typeof expiration === "string") {
                body["expires_at"] = expiration;
            }
            else if (expiration?.hours || expiration?.minutes || expiration?.days) {
                body["expires_in"] = expiration;
            }
        }
        else {
            body["expires_in"] = {
                hours: 3,
            };
        }
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/feedback/tokens`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const result = await response.json();
        return result;
    }
    async createComparativeExperiment({ name, experimentIds, referenceDatasetId, createdAt, description, metadata, id, }) {
        if (experimentIds.length === 0) {
            throw new Error("At least one experiment is required");
        }
        if (!referenceDatasetId) {
            referenceDatasetId = (await this.readProject({
                projectId: experimentIds[0],
            })).reference_dataset_id;
        }
        if (!referenceDatasetId == null) {
            throw new Error("A reference dataset is required");
        }
        const body = {
            id,
            name,
            experiment_ids: experimentIds,
            reference_dataset_id: referenceDatasetId,
            description,
            created_at: (createdAt ?? new Date())?.toISOString(),
            extra: {},
        };
        if (metadata)
            body.extra["metadata"] = metadata;
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/datasets/comparative`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        return await response.json();
    }
    /**
     * Retrieves a list of presigned feedback tokens for a given run ID.
     * @param runId The ID of the run.
     * @returns An async iterable of FeedbackIngestToken objects.
     */
    async *listPresignedFeedbackTokens(runId) {
        assertUuid(runId);
        const params = new URLSearchParams({ run_id: runId });
        for await (const tokens of this._getPaginated("/feedback/tokens", params)) {
            yield* tokens;
        }
    }
    _selectEvalResults(results) {
        let results_;
        if ("results" in results) {
            results_ = results.results;
        }
        else {
            results_ = [results];
        }
        return results_;
    }
    async _logEvaluationFeedback(evaluatorResponse, run, sourceInfo) {
        const evalResults = this._selectEvalResults(evaluatorResponse);
        const feedbacks = [];
        for (const res of evalResults) {
            let sourceInfo_ = sourceInfo || {};
            if (res.evaluatorInfo) {
                sourceInfo_ = { ...res.evaluatorInfo, ...sourceInfo_ };
            }
            let runId_ = null;
            if (res.targetRunId) {
                runId_ = res.targetRunId;
            }
            else if (run) {
                runId_ = run.id;
            }
            feedbacks.push(await this.createFeedback(runId_, res.key, {
                score: res.score,
                value: res.value,
                comment: res.comment,
                correction: res.correction,
                sourceInfo: sourceInfo_,
                sourceRunId: res.sourceRunId,
                feedbackConfig: res.feedbackConfig,
                feedbackSourceType: "model",
            }));
        }
        return [evalResults, feedbacks];
    }
    async logEvaluationFeedback(evaluatorResponse, run, sourceInfo) {
        const [results] = await this._logEvaluationFeedback(evaluatorResponse, run, sourceInfo);
        return results;
    }
    /**
     * API for managing annotation queues
     */
    /**
     * List the annotation queues on the LangSmith API.
     * @param options - The options for listing annotation queues
     * @param options.queueIds - The IDs of the queues to filter by
     * @param options.name - The name of the queue to filter by
     * @param options.nameContains - The substring that the queue name should contain
     * @param options.limit - The maximum number of queues to return
     * @returns An iterator of AnnotationQueue objects
     */
    async *listAnnotationQueues(options = {}) {
        const { queueIds, name, nameContains, limit } = options;
        const params = new URLSearchParams();
        if (queueIds) {
            queueIds.forEach((id, i) => {
                assertUuid(id, `queueIds[${i}]`);
                params.append("ids", id);
            });
        }
        if (name)
            params.append("name", name);
        if (nameContains)
            params.append("name_contains", nameContains);
        params.append("limit", (limit !== undefined ? Math.min(limit, 100) : 100).toString());
        let count = 0;
        for await (const queues of this._getPaginated("/annotation-queues", params)) {
            yield* queues;
            count++;
            if (limit !== undefined && count >= limit)
                break;
        }
    }
    /**
     * Create an annotation queue on the LangSmith API.
     * @param options - The options for creating an annotation queue
     * @param options.name - The name of the annotation queue
     * @param options.description - The description of the annotation queue
     * @param options.queueId - The ID of the annotation queue
     * @returns The created AnnotationQueue object
     */
    async createAnnotationQueue(options) {
        const { name, description, queueId } = options;
        const body = {
            name,
            description,
            id: queueId || v4(),
        };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/annotation-queues`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined))),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create annotation queue");
        const data = await response.json();
        return data;
    }
    /**
     * Read an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to read
     * @returns The AnnotationQueue object
     */
    async readAnnotationQueue(queueId) {
        // TODO: Replace when actual endpoint is added
        const queueIteratorResult = await this.listAnnotationQueues({
            queueIds: [queueId],
        }).next();
        if (queueIteratorResult.done) {
            throw new Error(`Annotation queue with ID ${queueId} not found`);
        }
        return queueIteratorResult.value;
    }
    /**
     * Update an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to update
     * @param options - The options for updating the annotation queue
     * @param options.name - The new name for the annotation queue
     * @param options.description - The new description for the annotation queue
     */
    async updateAnnotationQueue(queueId, options) {
        const { name, description } = options;
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}`, {
            method: "PATCH",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update annotation queue");
    }
    /**
     * Delete an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue to delete
     */
    async deleteAnnotationQueue(queueId) {
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}`, {
            method: "DELETE",
            headers: { ...this.headers, Accept: "application/json" },
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "delete annotation queue");
    }
    /**
     * Add runs to an annotation queue with the specified queue ID.
     * @param queueId - The ID of the annotation queue
     * @param runIds - The IDs of the runs to be added to the annotation queue
     */
    async addRunsToAnnotationQueue(queueId, runIds) {
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/annotation-queues/${assertUuid(queueId, "queueId")}/runs`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(runIds.map((id, i) => assertUuid(id, `runIds[${i}]`).toString())),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "add runs to annotation queue");
    }
    /**
     * Get a run from an annotation queue at the specified index.
     * @param queueId - The ID of the annotation queue
     * @param index - The index of the run to retrieve
     * @returns A Promise that resolves to a RunWithAnnotationQueueInfo object
     * @throws {Error} If the run is not found at the given index or for other API-related errors
     */
    async getRunFromAnnotationQueue(queueId, index) {
        const baseUrl = `/annotation-queues/${assertUuid(queueId, "queueId")}/run`;
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}${baseUrl}/${index}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "get run from annotation queue");
        return await response.json();
    }
    async _currentTenantIsOwner(owner) {
        const settings = await this._getSettings();
        return owner == "-" || settings.tenant_handle === owner;
    }
    async _ownerConflictError(action, owner) {
        const settings = await this._getSettings();
        return new Error(`Cannot ${action} for another tenant.\n
      Current tenant: ${settings.tenant_handle}\n
      Requested tenant: ${owner}`);
    }
    async _getLatestCommitHash(promptOwnerAndName) {
        const res = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/commits/${promptOwnerAndName}/?limit=${1}&offset=${0}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        const json = await res.json();
        if (!res.ok) {
            const detail = typeof json.detail === "string"
                ? json.detail
                : JSON.stringify(json.detail);
            const error = new Error(`Error ${res.status}: ${res.statusText}\n${detail}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error.statusCode = res.status;
            throw error;
        }
        if (json.commits.length === 0) {
            return undefined;
        }
        return json.commits[0].commit_hash;
    }
    async _likeOrUnlikePrompt(promptIdentifier, like) {
        const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/likes/${owner}/${promptName}`, {
            method: "POST",
            body: JSON.stringify({ like: like }),
            headers: { ...this.headers, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, `${like ? "like" : "unlike"} prompt`);
        return await response.json();
    }
    async _getPromptUrl(promptIdentifier) {
        const [owner, promptName, commitHash] = parsePromptIdentifier(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            if (commitHash !== "latest") {
                return `${this.getHostUrl()}/hub/${owner}/${promptName}/${commitHash.substring(0, 8)}`;
            }
            else {
                return `${this.getHostUrl()}/hub/${owner}/${promptName}`;
            }
        }
        else {
            const settings = await this._getSettings();
            if (commitHash !== "latest") {
                return `${this.getHostUrl()}/prompts/${promptName}/${commitHash.substring(0, 8)}?organizationId=${settings.id}`;
            }
            else {
                return `${this.getHostUrl()}/prompts/${promptName}?organizationId=${settings.id}`;
            }
        }
    }
    async promptExists(promptIdentifier) {
        const prompt = await this.getPrompt(promptIdentifier);
        return !!prompt;
    }
    async likePrompt(promptIdentifier) {
        return this._likeOrUnlikePrompt(promptIdentifier, true);
    }
    async unlikePrompt(promptIdentifier) {
        return this._likeOrUnlikePrompt(promptIdentifier, false);
    }
    async *listCommits(promptOwnerAndName) {
        for await (const commits of this._getPaginated(`/commits/${promptOwnerAndName}/`, new URLSearchParams(), (res) => res.commits)) {
            yield* commits;
        }
    }
    async *listPrompts(options) {
        const params = new URLSearchParams();
        params.append("sort_field", options?.sortField ?? "updated_at");
        params.append("sort_direction", "desc");
        params.append("is_archived", (!!options?.isArchived).toString());
        if (options?.isPublic !== undefined) {
            params.append("is_public", options.isPublic.toString());
        }
        if (options?.query) {
            params.append("query", options.query);
        }
        for await (const prompts of this._getPaginated("/repos", params, (res) => res.repos)) {
            yield* prompts;
        }
    }
    async getPrompt(promptIdentifier) {
        const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/repos/${owner}/${promptName}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        if (response.status === 404) {
            return null;
        }
        await raiseForStatus(response, "get prompt");
        const result = await response.json();
        if (result.repo) {
            return result.repo;
        }
        else {
            return null;
        }
    }
    async createPrompt(promptIdentifier, options) {
        const settings = await this._getSettings();
        if (options?.isPublic && !settings.tenant_handle) {
            throw new Error(`Cannot create a public prompt without first\n
        creating a LangChain Hub handle. 
        You can add a handle by creating a public prompt at:\n
        https://smith.langchain.com/prompts`);
        }
        const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            throw await this._ownerConflictError("create a prompt", owner);
        }
        const data = {
            repo_handle: promptName,
            ...(options?.description && { description: options.description }),
            ...(options?.readme && { readme: options.readme }),
            ...(options?.tags && { tags: options.tags }),
            is_public: !!options?.isPublic,
        };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/repos/`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create prompt");
        const { repo } = await response.json();
        return repo;
    }
    async createCommit(promptIdentifier, object, options) {
        if (!(await this.promptExists(promptIdentifier))) {
            throw new Error("Prompt does not exist, you must create it first.");
        }
        const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
        const resolvedParentCommitHash = options?.parentCommitHash === "latest" || !options?.parentCommitHash
            ? await this._getLatestCommitHash(`${owner}/${promptName}`)
            : options?.parentCommitHash;
        const payload = {
            manifest: JSON.parse(JSON.stringify(object)),
            parent_commit: resolvedParentCommitHash,
        };
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/commits/${owner}/${promptName}`, {
            method: "POST",
            headers: { ...this.headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "create commit");
        const result = await response.json();
        return this._getPromptUrl(`${owner}/${promptName}${result.commit_hash ? `:${result.commit_hash}` : ""}`);
    }
    async updatePrompt(promptIdentifier, options) {
        if (!(await this.promptExists(promptIdentifier))) {
            throw new Error("Prompt does not exist, you must create it first.");
        }
        const [owner, promptName] = parsePromptIdentifier(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            throw await this._ownerConflictError("update a prompt", owner);
        }
        const payload = {};
        if (options?.description !== undefined)
            payload.description = options.description;
        if (options?.readme !== undefined)
            payload.readme = options.readme;
        if (options?.tags !== undefined)
            payload.tags = options.tags;
        if (options?.isPublic !== undefined)
            payload.is_public = options.isPublic;
        if (options?.isArchived !== undefined)
            payload.is_archived = options.isArchived;
        // Check if payload is empty
        if (Object.keys(payload).length === 0) {
            throw new Error("No valid update options provided");
        }
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/repos/${owner}/${promptName}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "update prompt");
        return response.json();
    }
    async deletePrompt(promptIdentifier) {
        if (!(await this.promptExists(promptIdentifier))) {
            throw new Error("Prompt does not exist, you must create it first.");
        }
        const [owner, promptName, _] = parsePromptIdentifier(promptIdentifier);
        if (!(await this._currentTenantIsOwner(owner))) {
            throw await this._ownerConflictError("delete a prompt", owner);
        }
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/repos/${owner}/${promptName}`, {
            method: "DELETE",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        return await response.json();
    }
    async pullPromptCommit(promptIdentifier, options) {
        const [owner, promptName, commitHash] = parsePromptIdentifier(promptIdentifier);
        const serverInfo = await this._getServerInfo();
        const useOptimization = isVersionGreaterOrEqual(serverInfo.version, "0.5.23");
        let passedCommitHash = commitHash;
        if (!useOptimization && commitHash === "latest") {
            const latestCommitHash = await this._getLatestCommitHash(`${owner}/${promptName}`);
            if (!latestCommitHash) {
                throw new Error("No commits found");
            }
            else {
                passedCommitHash = latestCommitHash;
            }
        }
        const response = await this.caller.call(_getFetchImplementation(), `${this.apiUrl}/commits/${owner}/${promptName}/${passedCommitHash}${options?.includeModel ? "?include_model=true" : ""}`, {
            method: "GET",
            headers: this.headers,
            signal: AbortSignal.timeout(this.timeout_ms),
            ...this.fetchOptions,
        });
        await raiseForStatus(response, "pull prompt commit");
        const result = await response.json();
        return {
            owner,
            repo: promptName,
            commit_hash: result.commit_hash,
            manifest: result.manifest,
            examples: result.examples,
        };
    }
    /**
     * This method should not be used directly, use `import { pull } from "langchain/hub"` instead.
     * Using this method directly returns the JSON string of the prompt rather than a LangChain object.
     * @private
     */
    async _pullPrompt(promptIdentifier, options) {
        const promptObject = await this.pullPromptCommit(promptIdentifier, {
            includeModel: options?.includeModel,
        });
        const prompt = JSON.stringify(promptObject.manifest);
        return prompt;
    }
    async pushPrompt(promptIdentifier, options) {
        // Create or update prompt metadata
        if (await this.promptExists(promptIdentifier)) {
            if (options && Object.keys(options).some((key) => key !== "object")) {
                await this.updatePrompt(promptIdentifier, {
                    description: options?.description,
                    readme: options?.readme,
                    tags: options?.tags,
                    isPublic: options?.isPublic,
                });
            }
        }
        else {
            await this.createPrompt(promptIdentifier, {
                description: options?.description,
                readme: options?.readme,
                tags: options?.tags,
                isPublic: options?.isPublic,
            });
        }
        if (!options?.object) {
            return await this._getPromptUrl(promptIdentifier);
        }
        // Create a commit with the new manifest
        const url = await this.createCommit(promptIdentifier, options?.object, {
            parentCommitHash: options?.parentCommitHash,
        });
        return url;
    }
    /**
     * Clone a public dataset to your own langsmith tenant.
     * This operation is idempotent. If you already have a dataset with the given name,
     * this function will do nothing.
  
     * @param {string} tokenOrUrl The token of the public dataset to clone.
     * @param {Object} [options] Additional options for cloning the dataset.
     * @param {string} [options.sourceApiUrl] The URL of the langsmith server where the data is hosted. Defaults to the API URL of your current client.
     * @param {string} [options.datasetName] The name of the dataset to create in your tenant. Defaults to the name of the public dataset.
     * @returns {Promise<void>}
     */
    async clonePublicDataset(tokenOrUrl, options = {}) {
        const { sourceApiUrl = this.apiUrl, datasetName } = options;
        const [parsedApiUrl, tokenUuid] = this.parseTokenOrUrl(tokenOrUrl, sourceApiUrl);
        const sourceClient = new Client({
            apiUrl: parsedApiUrl,
            // Placeholder API key not needed anymore in most cases, but
            // some private deployments may have API key-based rate limiting
            // that would cause this to fail if we provide no value.
            apiKey: "placeholder",
        });
        const ds = await sourceClient.readSharedDataset(tokenUuid);
        const finalDatasetName = datasetName || ds.name;
        try {
            if (await this.hasDataset({ datasetId: finalDatasetName })) {
                console.log(`Dataset ${finalDatasetName} already exists in your tenant. Skipping.`);
                return;
            }
        }
        catch (_) {
            // `.hasDataset` will throw an error if the dataset does not exist.
            // no-op in that case
        }
        // Fetch examples first, then create the dataset
        const examples = await sourceClient.listSharedExamples(tokenUuid);
        const dataset = await this.createDataset(finalDatasetName, {
            description: ds.description,
            dataType: ds.data_type || "kv",
            inputsSchema: ds.inputs_schema_definition ?? undefined,
            outputsSchema: ds.outputs_schema_definition ?? undefined,
        });
        try {
            await this.createExamples({
                inputs: examples.map((e) => e.inputs),
                outputs: examples.flatMap((e) => (e.outputs ? [e.outputs] : [])),
                datasetId: dataset.id,
            });
        }
        catch (e) {
            console.error(`An error occurred while creating dataset ${finalDatasetName}. ` +
                "You should delete it manually.");
            throw e;
        }
    }
    parseTokenOrUrl(urlOrToken, apiUrl, numParts = 2, kind = "dataset") {
        // Try parsing as UUID
        try {
            assertUuid(urlOrToken); // Will throw if it's not a UUID.
            return [apiUrl, urlOrToken];
        }
        catch (_) {
            // no-op if it's not a uuid
        }
        // Parse as URL
        try {
            const parsedUrl = new URL(urlOrToken);
            const pathParts = parsedUrl.pathname
                .split("/")
                .filter((part) => part !== "");
            if (pathParts.length >= numParts) {
                const tokenUuid = pathParts[pathParts.length - numParts];
                return [apiUrl, tokenUuid];
            }
            else {
                throw new Error(`Invalid public ${kind} URL: ${urlOrToken}`);
            }
        }
        catch (error) {
            throw new Error(`Invalid public ${kind} URL or token: ${urlOrToken}`);
        }
    }
    /**
     * Awaits all pending trace batches. Useful for environments where
     * you need to be sure that all tracing requests finish before execution ends,
     * such as serverless environments.
     *
     * @example
     * ```
     * import { Client } from "langsmith";
     *
     * const client = new Client();
     *
     * try {
     *   // Tracing happens here
     *   ...
     * } finally {
     *   await client.awaitPendingTraceBatches();
     * }
     * ```
     *
     * @returns A promise that resolves once all currently pending traces have sent.
     */
    awaitPendingTraceBatches() {
        return Promise.all([
            ...this.autoBatchQueue.items.map(({ itemPromise }) => itemPromise),
            this.batchIngestCaller.queue.onIdle(),
        ]);
    }
}

// Update using yarn bump-version
const __version__ = "0.2.4";

// Inlined from https://github.com/flexdinesh/browser-or-node
let globalEnv;
const isBrowser$1 = () => typeof window !== "undefined" && typeof window.document !== "undefined";
const isWebWorker$1 = () => typeof globalThis === "object" &&
    globalThis.constructor &&
    globalThis.constructor.name === "DedicatedWorkerGlobalScope";
const isJsDom$1 = () => (typeof window !== "undefined" && window.name === "nodejs") ||
    (typeof navigator !== "undefined" &&
        (navigator.userAgent.includes("Node.js") ||
            navigator.userAgent.includes("jsdom")));
// Supabase Edge Function provides a `Deno` global object
// without `version` property
const isDeno$1 = () => typeof Deno !== "undefined";
// Mark not-as-node if in Supabase Edge Function
const isNode$1 = () => typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined" &&
    !isDeno$1();
const getEnv$1 = () => {
    if (globalEnv) {
        return globalEnv;
    }
    if (isBrowser$1()) {
        globalEnv = "browser";
    }
    else if (isNode$1()) {
        globalEnv = "node";
    }
    else if (isWebWorker$1()) {
        globalEnv = "webworker";
    }
    else if (isJsDom$1()) {
        globalEnv = "jsdom";
    }
    else if (isDeno$1()) {
        globalEnv = "deno";
    }
    else {
        globalEnv = "other";
    }
    return globalEnv;
};
let runtimeEnvironment$1;
function getRuntimeEnvironment$1() {
    if (runtimeEnvironment$1 === undefined) {
        const env = getEnv$1();
        const releaseEnv = getShas();
        runtimeEnvironment$1 = {
            library: "langsmith",
            runtime: env,
            sdk: "langsmith-js",
            sdk_version: __version__,
            ...releaseEnv,
        };
    }
    return runtimeEnvironment$1;
}
/**
 * Retrieves the LangChain-specific metadata from the current runtime environment.
 *
 * @returns {Record<string, string>}
 *  - A record of LangChain-specific metadata environment variables.
 */
function getLangChainEnvVarsMetadata() {
    const allEnvVars = getEnvironmentVariables() || {};
    const envVars = {};
    const excluded = [
        "LANGCHAIN_API_KEY",
        "LANGCHAIN_ENDPOINT",
        "LANGCHAIN_TRACING_V2",
        "LANGCHAIN_PROJECT",
        "LANGCHAIN_SESSION",
    ];
    for (const [key, value] of Object.entries(allEnvVars)) {
        if (key.startsWith("LANGCHAIN_") &&
            typeof value === "string" &&
            !excluded.includes(key) &&
            !key.toLowerCase().includes("key") &&
            !key.toLowerCase().includes("secret") &&
            !key.toLowerCase().includes("token")) {
            if (key === "LANGCHAIN_REVISION_ID") {
                envVars["revision_id"] = value;
            }
            else {
                envVars[key] = value;
            }
        }
    }
    return envVars;
}
/**
 * Retrieves the environment variables from the current runtime environment.
 *
 * This function is designed to operate in a variety of JS environments,
 * including Node.js, Deno, browsers, etc.
 *
 * @returns {Record<string, string> | undefined}
 *  - A record of environment variables if available.
 *  - `undefined` if the environment does not support or allows access to environment variables.
 */
function getEnvironmentVariables() {
    try {
        // Check for Node.js environment
        // eslint-disable-next-line no-process-env
        if (typeof process !== "undefined" && process.env) {
            // eslint-disable-next-line no-process-env
            return Object.entries(process.env).reduce((acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
            }, {});
        }
        // For browsers and other environments, we may not have direct access to env variables
        // Return undefined or any other fallback as required.
        return undefined;
    }
    catch (e) {
        // Catch any errors that might occur while trying to access environment variables
        return undefined;
    }
}
function getEnvironmentVariable$1(name) {
    // Certain Deno setups will throw an error if you try to access environment variables
    // https://github.com/hwchase17/langchainjs/issues/1412
    try {
        return typeof process !== "undefined"
            ? // eslint-disable-next-line no-process-env
                process.env?.[name]
            : undefined;
    }
    catch (e) {
        return undefined;
    }
}
function getLangSmithEnvironmentVariable(name) {
    return (getEnvironmentVariable$1(`LANGSMITH_${name}`) ||
        getEnvironmentVariable$1(`LANGCHAIN_${name}`));
}
let cachedCommitSHAs;
/**
 * Get the Git commit SHA from common environment variables
 * used by different CI/CD platforms.
 * @returns {string | undefined} The Git commit SHA or undefined if not found.
 */
function getShas() {
    if (cachedCommitSHAs !== undefined) {
        return cachedCommitSHAs;
    }
    const common_release_envs = [
        "VERCEL_GIT_COMMIT_SHA",
        "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
        "COMMIT_REF",
        "RENDER_GIT_COMMIT",
        "CI_COMMIT_SHA",
        "CIRCLE_SHA1",
        "CF_PAGES_COMMIT_SHA",
        "REACT_APP_GIT_SHA",
        "SOURCE_VERSION",
        "GITHUB_SHA",
        "TRAVIS_COMMIT",
        "GIT_COMMIT",
        "BUILD_VCS_NUMBER",
        "bamboo_planRepository_revision",
        "Build.SourceVersion",
        "BITBUCKET_COMMIT",
        "DRONE_COMMIT_SHA",
        "SEMAPHORE_GIT_SHA",
        "BUILDKITE_COMMIT",
    ];
    const shas = {};
    for (const env of common_release_envs) {
        const envVar = getEnvironmentVariable$1(env);
        if (envVar !== undefined) {
            shas[env] = envVar;
        }
    }
    cachedCommitSHAs = shas;
    return shas;
}

const isTracingEnabled$1 = (tracingEnabled) => {
    const envVars = ["TRACING_V2", "TRACING"];
    return !!envVars.find((envVar) => getLangSmithEnvironmentVariable(envVar) === "true");
};

const _LC_CONTEXT_VARIABLES_KEY = Symbol.for("lc:context_variables");

function stripNonAlphanumeric$1(input) {
    return input.replace(/[-:.]/g, "");
}
function convertToDottedOrderFormat$1(epoch, runId, executionOrder = 1) {
    // Date only has millisecond precision, so we use the microseconds to break
    // possible ties, avoiding incorrect run order
    const paddedOrder = executionOrder.toFixed(0).slice(0, 3).padStart(3, "0");
    return (stripNonAlphanumeric$1(`${new Date(epoch).toISOString().slice(0, -1)}${paddedOrder}Z`) + runId);
}
/**
 * Baggage header information
 */
class Baggage {
    constructor(metadata, tags) {
        Object.defineProperty(this, "metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.metadata = metadata;
        this.tags = tags;
    }
    static fromHeader(value) {
        const items = value.split(",");
        let metadata = {};
        let tags = [];
        for (const item of items) {
            const [key, uriValue] = item.split("=");
            const value = decodeURIComponent(uriValue);
            if (key === "langsmith-metadata") {
                metadata = JSON.parse(value);
            }
            else if (key === "langsmith-tags") {
                tags = value.split(",");
            }
        }
        return new Baggage(metadata, tags);
    }
    toHeader() {
        const items = [];
        if (this.metadata && Object.keys(this.metadata).length > 0) {
            items.push(`langsmith-metadata=${encodeURIComponent(JSON.stringify(this.metadata))}`);
        }
        if (this.tags && this.tags.length > 0) {
            items.push(`langsmith-tags=${encodeURIComponent(this.tags.join(","))}`);
        }
        return items.join(",");
    }
}
class RunTree {
    constructor(originalConfig) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "run_type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "project_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "parent_run", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "child_runs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "start_time", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "end_time", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "extra", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "error", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "serialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "inputs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "outputs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "reference_example_id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "events", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "trace_id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dotted_order", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tracingEnabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "execution_order", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "child_execution_order", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Attachments associated with the run.
         * Each entry is a tuple of [mime_type, bytes]
         */
        Object.defineProperty(this, "attachments", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // If you pass in a run tree directly, return a shallow clone
        if (isRunTree(originalConfig)) {
            Object.assign(this, { ...originalConfig });
            return;
        }
        const defaultConfig = RunTree.getDefaultConfig();
        const { metadata, ...config } = originalConfig;
        const client = config.client ?? RunTree.getSharedClient();
        const dedupedMetadata = {
            ...metadata,
            ...config?.extra?.metadata,
        };
        config.extra = { ...config.extra, metadata: dedupedMetadata };
        Object.assign(this, { ...defaultConfig, ...config, client });
        if (!this.trace_id) {
            if (this.parent_run) {
                this.trace_id = this.parent_run.trace_id ?? this.id;
            }
            else {
                this.trace_id = this.id;
            }
        }
        this.execution_order ??= 1;
        this.child_execution_order ??= 1;
        if (!this.dotted_order) {
            const currentDottedOrder = convertToDottedOrderFormat$1(this.start_time, this.id, this.execution_order);
            if (this.parent_run) {
                this.dotted_order =
                    this.parent_run.dotted_order + "." + currentDottedOrder;
            }
            else {
                this.dotted_order = currentDottedOrder;
            }
        }
    }
    static getDefaultConfig() {
        return {
            id: v4(),
            run_type: "chain",
            project_name: getEnvironmentVariable$1("LANGCHAIN_PROJECT") ??
                getEnvironmentVariable$1("LANGCHAIN_SESSION") ?? // TODO: Deprecate
                "default",
            child_runs: [],
            api_url: getEnvironmentVariable$1("LANGCHAIN_ENDPOINT") ?? "http://localhost:1984",
            api_key: getEnvironmentVariable$1("LANGCHAIN_API_KEY"),
            caller_options: {},
            start_time: Date.now(),
            serialized: {},
            inputs: {},
            extra: {},
        };
    }
    static getSharedClient() {
        if (!RunTree.sharedClient) {
            RunTree.sharedClient = new Client();
        }
        return RunTree.sharedClient;
    }
    createChild(config) {
        const child_execution_order = this.child_execution_order + 1;
        const child = new RunTree({
            ...config,
            parent_run: this,
            project_name: this.project_name,
            client: this.client,
            tracingEnabled: this.tracingEnabled,
            execution_order: child_execution_order,
            child_execution_order: child_execution_order,
        });
        // Copy context vars over into the new run tree.
        if (_LC_CONTEXT_VARIABLES_KEY in this) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            child[_LC_CONTEXT_VARIABLES_KEY] =
                this[_LC_CONTEXT_VARIABLES_KEY];
        }
        const LC_CHILD = Symbol.for("lc:child_config");
        const presentConfig = config.extra?.[LC_CHILD] ??
            this.extra[LC_CHILD];
        // tracing for LangChain is defined by the _parentRunId and runMap of the tracer
        if (isRunnableConfigLike(presentConfig)) {
            const newConfig = { ...presentConfig };
            const callbacks = isCallbackManagerLike(newConfig.callbacks)
                ? newConfig.callbacks.copy?.()
                : undefined;
            if (callbacks) {
                // update the parent run id
                Object.assign(callbacks, { _parentRunId: child.id });
                // only populate if we're in a newer LC.JS version
                callbacks.handlers
                    ?.find(isLangChainTracerLike)
                    ?.updateFromRunTree?.(child);
                newConfig.callbacks = callbacks;
            }
            child.extra[LC_CHILD] = newConfig;
        }
        // propagate child_execution_order upwards
        const visited = new Set();
        let current = this;
        while (current != null && !visited.has(current.id)) {
            visited.add(current.id);
            current.child_execution_order = Math.max(current.child_execution_order, child_execution_order);
            current = current.parent_run;
        }
        this.child_runs.push(child);
        return child;
    }
    async end(outputs, error, endTime = Date.now(), metadata) {
        this.outputs = this.outputs ?? outputs;
        this.error = this.error ?? error;
        this.end_time = this.end_time ?? endTime;
        if (metadata && Object.keys(metadata).length > 0) {
            this.extra = this.extra
                ? { ...this.extra, metadata: { ...this.extra.metadata, ...metadata } }
                : { metadata };
        }
    }
    _convertToCreate(run, runtimeEnv, excludeChildRuns = true) {
        const runExtra = run.extra ?? {};
        if (!runExtra.runtime) {
            runExtra.runtime = {};
        }
        if (runtimeEnv) {
            for (const [k, v] of Object.entries(runtimeEnv)) {
                if (!runExtra.runtime[k]) {
                    runExtra.runtime[k] = v;
                }
            }
        }
        let child_runs;
        let parent_run_id;
        if (!excludeChildRuns) {
            child_runs = run.child_runs.map((child_run) => this._convertToCreate(child_run, runtimeEnv, excludeChildRuns));
            parent_run_id = undefined;
        }
        else {
            parent_run_id = run.parent_run?.id;
            child_runs = [];
        }
        const persistedRun = {
            id: run.id,
            name: run.name,
            start_time: run.start_time,
            end_time: run.end_time,
            run_type: run.run_type,
            reference_example_id: run.reference_example_id,
            extra: runExtra,
            serialized: run.serialized,
            error: run.error,
            inputs: run.inputs,
            outputs: run.outputs,
            session_name: run.project_name,
            child_runs: child_runs,
            parent_run_id: parent_run_id,
            trace_id: run.trace_id,
            dotted_order: run.dotted_order,
            tags: run.tags,
            attachments: run.attachments,
        };
        return persistedRun;
    }
    async postRun(excludeChildRuns = true) {
        try {
            const runtimeEnv = getRuntimeEnvironment$1();
            const runCreate = await this._convertToCreate(this, runtimeEnv, true);
            await this.client.createRun(runCreate);
            if (!excludeChildRuns) {
                warnOnce("Posting with excludeChildRuns=false is deprecated and will be removed in a future version.");
                for (const childRun of this.child_runs) {
                    await childRun.postRun(false);
                }
            }
        }
        catch (error) {
            console.error(`Error in postRun for run ${this.id}:`, error);
        }
    }
    async patchRun() {
        try {
            const runUpdate = {
                end_time: this.end_time,
                error: this.error,
                inputs: this.inputs,
                outputs: this.outputs,
                parent_run_id: this.parent_run?.id,
                reference_example_id: this.reference_example_id,
                extra: this.extra,
                events: this.events,
                dotted_order: this.dotted_order,
                trace_id: this.trace_id,
                tags: this.tags,
                attachments: this.attachments,
            };
            await this.client.updateRun(this.id, runUpdate);
        }
        catch (error) {
            console.error(`Error in patchRun for run ${this.id}`, error);
        }
    }
    toJSON() {
        return this._convertToCreate(this, undefined, false);
    }
    static fromRunnableConfig(parentConfig, props) {
        // We only handle the callback manager case for now
        const callbackManager = parentConfig?.callbacks;
        let parentRun;
        let projectName;
        let client;
        let tracingEnabled = isTracingEnabled$1();
        if (callbackManager) {
            const parentRunId = callbackManager?.getParentRunId?.() ?? "";
            const langChainTracer = callbackManager?.handlers?.find((handler) => handler?.name == "langchain_tracer");
            parentRun = langChainTracer?.getRun?.(parentRunId);
            projectName = langChainTracer?.projectName;
            client = langChainTracer?.client;
            tracingEnabled = tracingEnabled || !!langChainTracer;
        }
        if (!parentRun) {
            return new RunTree({
                ...props,
                client,
                tracingEnabled,
                project_name: projectName,
            });
        }
        const parentRunTree = new RunTree({
            name: parentRun.name,
            id: parentRun.id,
            trace_id: parentRun.trace_id,
            dotted_order: parentRun.dotted_order,
            client,
            tracingEnabled,
            project_name: projectName,
            tags: [
                ...new Set((parentRun?.tags ?? []).concat(parentConfig?.tags ?? [])),
            ],
            extra: {
                metadata: {
                    ...parentRun?.extra?.metadata,
                    ...parentConfig?.metadata,
                },
            },
        });
        return parentRunTree.createChild(props);
    }
    static fromDottedOrder(dottedOrder) {
        return this.fromHeaders({ "langsmith-trace": dottedOrder });
    }
    static fromHeaders(headers, inheritArgs) {
        const rawHeaders = "get" in headers && typeof headers.get === "function"
            ? {
                "langsmith-trace": headers.get("langsmith-trace"),
                baggage: headers.get("baggage"),
            }
            : headers;
        const headerTrace = rawHeaders["langsmith-trace"];
        if (!headerTrace || typeof headerTrace !== "string")
            return undefined;
        const parentDottedOrder = headerTrace.trim();
        const parsedDottedOrder = parentDottedOrder.split(".").map((part) => {
            const [strTime, uuid] = part.split("Z");
            return { strTime, time: Date.parse(strTime + "Z"), uuid };
        });
        const traceId = parsedDottedOrder[0].uuid;
        const config = {
            ...inheritArgs,
            name: inheritArgs?.["name"] ?? "parent",
            run_type: inheritArgs?.["run_type"] ?? "chain",
            start_time: inheritArgs?.["start_time"] ?? Date.now(),
            id: parsedDottedOrder.at(-1)?.uuid,
            trace_id: traceId,
            dotted_order: parentDottedOrder,
        };
        if (rawHeaders["baggage"] && typeof rawHeaders["baggage"] === "string") {
            const baggage = Baggage.fromHeader(rawHeaders["baggage"]);
            config.metadata = baggage.metadata;
            config.tags = baggage.tags;
        }
        return new RunTree(config);
    }
    toHeaders(headers) {
        const result = {
            "langsmith-trace": this.dotted_order,
            baggage: new Baggage(this.extra?.metadata, this.tags).toHeader(),
        };
        if (headers) {
            for (const [key, value] of Object.entries(result)) {
                headers.set(key, value);
            }
        }
        return result;
    }
}
Object.defineProperty(RunTree, "sharedClient", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
function isRunTree(x) {
    return (x !== undefined &&
        typeof x.createChild === "function" &&
        typeof x.postRun === "function");
}
function isLangChainTracerLike(x) {
    return (typeof x === "object" &&
        x != null &&
        typeof x.name === "string" &&
        x.name === "langchain_tracer");
}
function containsLangChainTracerLike(x) {
    return (Array.isArray(x) && x.some((callback) => isLangChainTracerLike(callback)));
}
function isCallbackManagerLike(x) {
    return (typeof x === "object" &&
        x != null &&
        Array.isArray(x.handlers));
}
function isRunnableConfigLike(x) {
    // Check that it's an object with a callbacks arg
    // that has either a CallbackManagerLike object with a langchain tracer within it
    // or an array with a LangChainTracerLike object within it
    return (x !== undefined &&
        typeof x.callbacks === "object" &&
        // Callback manager with a langchain tracer
        (containsLangChainTracerLike(x.callbacks?.handlers) ||
            // Or it's an array with a LangChainTracerLike object within it
            containsLangChainTracerLike(x.callbacks)));
}

let MockAsyncLocalStorage$1 = class MockAsyncLocalStorage {
    getStore() {
        return undefined;
    }
    run(_, callback) {
        return callback();
    }
};
const TRACING_ALS_KEY$1 = Symbol.for("ls:tracing_async_local_storage");
const mockAsyncLocalStorage$1 = new MockAsyncLocalStorage$1();
let AsyncLocalStorageProvider$1 = class AsyncLocalStorageProvider {
    getInstance() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return globalThis[TRACING_ALS_KEY$1] ?? mockAsyncLocalStorage$1;
    }
    initializeGlobalInstance(instance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (globalThis[TRACING_ALS_KEY$1] === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalThis[TRACING_ALS_KEY$1] = instance;
        }
    }
};
const AsyncLocalStorageProviderSingleton$1 = new AsyncLocalStorageProvider$1();
/**
 * Return the current run tree from within a traceable-wrapped function.
 * Will throw an error if called outside of a traceable function.
 *
 * @returns The run tree for the given context.
 */
const getCurrentRunTree = () => {
    const runTree = AsyncLocalStorageProviderSingleton$1.getInstance().getStore();
    if (!isRunTree(runTree)) {
        throw new Error([
            "Could not get the current run tree.",
            "",
            "Please make sure you are calling this method within a traceable function or the tracing is enabled.",
        ].join("\n"));
    }
    return runTree;
};
function isTraceableFunction(x
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    return typeof x === "function" && "langsmith:traceable" in x;
}

// @ts-nocheck
// Inlined because of ESM import issues
/*!
 * https://github.com/Starcounter-Jack/JSON-Patch
 * (c) 2017-2022 Joachim Wester
 * MIT licensed
 */
const _hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(obj, key) {
    return _hasOwnProperty.call(obj, key);
}
function _objectKeys(obj) {
    if (Array.isArray(obj)) {
        const keys = new Array(obj.length);
        for (let k = 0; k < keys.length; k++) {
            keys[k] = "" + k;
        }
        return keys;
    }
    if (Object.keys) {
        return Object.keys(obj);
    }
    let keys = [];
    for (let i in obj) {
        if (hasOwnProperty(obj, i)) {
            keys.push(i);
        }
    }
    return keys;
}
/**
 * Deeply clone the object.
 * https://jsperf.com/deep-copy-vs-json-stringify-json-parse/25 (recursiveDeepCopy)
 * @param  {any} obj value to clone
 * @return {any} cloned obj
 */
function _deepClone(obj) {
    switch (typeof obj) {
        case "object":
            return JSON.parse(JSON.stringify(obj)); //Faster than ES5 clone - http://jsperf.com/deep-cloning-of-objects/5
        case "undefined":
            return null; //this is how JSON.stringify behaves for array items
        default:
            return obj; //no need to clone primitives
    }
}
//3x faster than cached /^\d+$/.test(str)
function isInteger(str) {
    let i = 0;
    const len = str.length;
    let charCode;
    while (i < len) {
        charCode = str.charCodeAt(i);
        if (charCode >= 48 && charCode <= 57) {
            i++;
            continue;
        }
        return false;
    }
    return true;
}
/**
 * Unescapes a json pointer path
 * @param path The escaped pointer
 * @return The unescaped path
 */
function unescapePathComponent(path) {
    return path.replace(/~1/g, "/").replace(/~0/g, "~");
}
/**
 * Recursively checks whether an object has any undefined values inside.
 */
function hasUndefined(obj) {
    if (obj === undefined) {
        return true;
    }
    if (obj) {
        if (Array.isArray(obj)) {
            for (let i = 0, len = obj.length; i < len; i++) {
                if (hasUndefined(obj[i])) {
                    return true;
                }
            }
        }
        else if (typeof obj === "object") {
            const objKeys = _objectKeys(obj);
            const objKeysLength = objKeys.length;
            for (var i = 0; i < objKeysLength; i++) {
                if (hasUndefined(obj[objKeys[i]])) {
                    return true;
                }
            }
        }
    }
    return false;
}
function patchErrorMessageFormatter(message, args) {
    const messageParts = [message];
    for (const key in args) {
        const value = typeof args[key] === "object"
            ? JSON.stringify(args[key], null, 2)
            : args[key]; // pretty print
        if (typeof value !== "undefined") {
            messageParts.push(`${key}: ${value}`);
        }
    }
    return messageParts.join("\n");
}
class PatchError extends Error {
    constructor(message, name, index, operation, tree) {
        super(patchErrorMessageFormatter(message, { name, index, operation, tree }));
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: name
        });
        Object.defineProperty(this, "index", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: index
        });
        Object.defineProperty(this, "operation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: operation
        });
        Object.defineProperty(this, "tree", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: tree
        });
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain, see https://stackoverflow.com/a/48342359
        this.message = patchErrorMessageFormatter(message, {
            name,
            index,
            operation,
            tree,
        });
    }
}

// @ts-nocheck
const JsonPatchError = PatchError;
/* We use a Javascript hash to store each
 function. Each hash entry (property) uses
 the operation identifiers specified in rfc6902.
 In this way, we can map each patch operation
 to its dedicated function in efficient way.
 */
/* The operations applicable to an object */
const objOps = {
    add: function (obj, key, document) {
        obj[key] = this.value;
        return { newDocument: document };
    },
    remove: function (obj, key, document) {
        var removed = obj[key];
        delete obj[key];
        return { newDocument: document, removed };
    },
    replace: function (obj, key, document) {
        var removed = obj[key];
        obj[key] = this.value;
        return { newDocument: document, removed };
    },
    move: function (obj, key, document) {
        /* in case move target overwrites an existing value,
        return the removed value, this can be taxing performance-wise,
        and is potentially unneeded */
        let removed = getValueByPointer(document, this.path);
        if (removed) {
            removed = _deepClone(removed);
        }
        const originalValue = applyOperation(document, {
            op: "remove",
            path: this.from,
        }).removed;
        applyOperation(document, {
            op: "add",
            path: this.path,
            value: originalValue,
        });
        return { newDocument: document, removed };
    },
    copy: function (obj, key, document) {
        const valueToCopy = getValueByPointer(document, this.from);
        // enforce copy by value so further operations don't affect source (see issue #177)
        applyOperation(document, {
            op: "add",
            path: this.path,
            value: _deepClone(valueToCopy),
        });
        return { newDocument: document };
    },
    test: function (obj, key, document) {
        return { newDocument: document, test: _areEquals(obj[key], this.value) };
    },
    _get: function (obj, key, document) {
        this.value = obj[key];
        return { newDocument: document };
    },
};
/* The operations applicable to an array. Many are the same as for the object */
var arrOps = {
    add: function (arr, i, document) {
        if (isInteger(i)) {
            arr.splice(i, 0, this.value);
        }
        else {
            // array props
            arr[i] = this.value;
        }
        // this may be needed when using '-' in an array
        return { newDocument: document, index: i };
    },
    remove: function (arr, i, document) {
        var removedList = arr.splice(i, 1);
        return { newDocument: document, removed: removedList[0] };
    },
    replace: function (arr, i, document) {
        var removed = arr[i];
        arr[i] = this.value;
        return { newDocument: document, removed };
    },
    move: objOps.move,
    copy: objOps.copy,
    test: objOps.test,
    _get: objOps._get,
};
/**
 * Retrieves a value from a JSON document by a JSON pointer.
 * Returns the value.
 *
 * @param document The document to get the value from
 * @param pointer an escaped JSON pointer
 * @return The retrieved value
 */
function getValueByPointer(document, pointer) {
    if (pointer == "") {
        return document;
    }
    var getOriginalDestination = { op: "_get", path: pointer };
    applyOperation(document, getOriginalDestination);
    return getOriginalDestination.value;
}
/**
 * Apply a single JSON Patch Operation on a JSON document.
 * Returns the {newDocument, result} of the operation.
 * It modifies the `document` and `operation` objects - it gets the values by reference.
 * If you would like to avoid touching your values, clone them:
 * `jsonpatch.applyOperation(document, jsonpatch._deepClone(operation))`.
 *
 * @param document The document to patch
 * @param operation The operation to apply
 * @param validateOperation `false` is without validation, `true` to use default jsonpatch's validation, or you can pass a `validateOperation` callback to be used for validation.
 * @param mutateDocument Whether to mutate the original document or clone it before applying
 * @param banPrototypeModifications Whether to ban modifications to `__proto__`, defaults to `true`.
 * @return `{newDocument, result}` after the operation
 */
function applyOperation(document, operation, validateOperation = false, mutateDocument = true, banPrototypeModifications = true, index = 0) {
    if (validateOperation) {
        if (typeof validateOperation == "function") {
            validateOperation(operation, 0, document, operation.path);
        }
        else {
            validator(operation, 0);
        }
    }
    /* ROOT OPERATIONS */
    if (operation.path === "") {
        let returnValue = { newDocument: document };
        if (operation.op === "add") {
            returnValue.newDocument = operation.value;
            return returnValue;
        }
        else if (operation.op === "replace") {
            returnValue.newDocument = operation.value;
            returnValue.removed = document; //document we removed
            return returnValue;
        }
        else if (operation.op === "move" || operation.op === "copy") {
            // it's a move or copy to root
            returnValue.newDocument = getValueByPointer(document, operation.from); // get the value by json-pointer in `from` field
            if (operation.op === "move") {
                // report removed item
                returnValue.removed = document;
            }
            return returnValue;
        }
        else if (operation.op === "test") {
            returnValue.test = _areEquals(document, operation.value);
            if (returnValue.test === false) {
                throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
            }
            returnValue.newDocument = document;
            return returnValue;
        }
        else if (operation.op === "remove") {
            // a remove on root
            returnValue.removed = document;
            returnValue.newDocument = null;
            return returnValue;
        }
        else if (operation.op === "_get") {
            operation.value = document;
            return returnValue;
        }
        else {
            /* bad operation */
            if (validateOperation) {
                throw new JsonPatchError("Operation `op` property is not one of operations defined in RFC-6902", "OPERATION_OP_INVALID", index, operation, document);
            }
            else {
                return returnValue;
            }
        }
    } /* END ROOT OPERATIONS */
    else {
        if (!mutateDocument) {
            document = _deepClone(document);
        }
        const path = operation.path || "";
        const keys = path.split("/");
        let obj = document;
        let t = 1; //skip empty element - http://jsperf.com/to-shift-or-not-to-shift
        let len = keys.length;
        let existingPathFragment = undefined;
        let key;
        let validateFunction;
        if (typeof validateOperation == "function") {
            validateFunction = validateOperation;
        }
        else {
            validateFunction = validator;
        }
        while (true) {
            key = keys[t];
            if (key && key.indexOf("~") != -1) {
                key = unescapePathComponent(key);
            }
            if (banPrototypeModifications &&
                (key == "__proto__" ||
                    (key == "prototype" && t > 0 && keys[t - 1] == "constructor"))) {
                throw new TypeError("JSON-Patch: modifying `__proto__` or `constructor/prototype` prop is banned for security reasons, if this was on purpose, please set `banPrototypeModifications` flag false and pass it to this function. More info in fast-json-patch README");
            }
            if (validateOperation) {
                if (existingPathFragment === undefined) {
                    if (obj[key] === undefined) {
                        existingPathFragment = keys.slice(0, t).join("/");
                    }
                    else if (t == len - 1) {
                        existingPathFragment = operation.path;
                    }
                    if (existingPathFragment !== undefined) {
                        validateFunction(operation, 0, document, existingPathFragment);
                    }
                }
            }
            t++;
            if (Array.isArray(obj)) {
                if (key === "-") {
                    key = obj.length;
                }
                else {
                    if (validateOperation && !isInteger(key)) {
                        throw new JsonPatchError("Expected an unsigned base-10 integer value, making the new referenced value the array element with the zero-based index", "OPERATION_PATH_ILLEGAL_ARRAY_INDEX", index, operation, document);
                    } // only parse key when it's an integer for `arr.prop` to work
                    else if (isInteger(key)) {
                        key = ~~key;
                    }
                }
                if (t >= len) {
                    if (validateOperation && operation.op === "add" && key > obj.length) {
                        throw new JsonPatchError("The specified index MUST NOT be greater than the number of elements in the array", "OPERATION_VALUE_OUT_OF_BOUNDS", index, operation, document);
                    }
                    const returnValue = arrOps[operation.op].call(operation, obj, key, document); // Apply patch
                    if (returnValue.test === false) {
                        throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
                    }
                    return returnValue;
                }
            }
            else {
                if (t >= len) {
                    const returnValue = objOps[operation.op].call(operation, obj, key, document); // Apply patch
                    if (returnValue.test === false) {
                        throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, document);
                    }
                    return returnValue;
                }
            }
            obj = obj[key];
            // If we have more keys in the path, but the next value isn't a non-null object,
            // throw an OPERATION_PATH_UNRESOLVABLE error instead of iterating again.
            if (validateOperation && t < len && (!obj || typeof obj !== "object")) {
                throw new JsonPatchError("Cannot perform operation at the desired path", "OPERATION_PATH_UNRESOLVABLE", index, operation, document);
            }
        }
    }
}
/**
 * Apply a full JSON Patch array on a JSON document.
 * Returns the {newDocument, result} of the patch.
 * It modifies the `document` object and `patch` - it gets the values by reference.
 * If you would like to avoid touching your values, clone them:
 * `jsonpatch.applyPatch(document, jsonpatch._deepClone(patch))`.
 *
 * @param document The document to patch
 * @param patch The patch to apply
 * @param validateOperation `false` is without validation, `true` to use default jsonpatch's validation, or you can pass a `validateOperation` callback to be used for validation.
 * @param mutateDocument Whether to mutate the original document or clone it before applying
 * @param banPrototypeModifications Whether to ban modifications to `__proto__`, defaults to `true`.
 * @return An array of `{newDocument, result}` after the patch
 */
function applyPatch(document, patch, validateOperation, mutateDocument = true, banPrototypeModifications = true) {
    if (validateOperation) {
        if (!Array.isArray(patch)) {
            throw new JsonPatchError("Patch sequence must be an array", "SEQUENCE_NOT_AN_ARRAY");
        }
    }
    if (!mutateDocument) {
        document = _deepClone(document);
    }
    const results = new Array(patch.length);
    for (let i = 0, length = patch.length; i < length; i++) {
        // we don't need to pass mutateDocument argument because if it was true, we already deep cloned the object, we'll just pass `true`
        results[i] = applyOperation(document, patch[i], validateOperation, true, banPrototypeModifications, i);
        document = results[i].newDocument; // in case root was replaced
    }
    results.newDocument = document;
    return results;
}
/**
 * Validates a single operation. Called from `jsonpatch.validate`. Throws `JsonPatchError` in case of an error.
 * @param {object} operation - operation object (patch)
 * @param {number} index - index of operation in the sequence
 * @param {object} [document] - object where the operation is supposed to be applied
 * @param {string} [existingPathFragment] - comes along with `document`
 */
function validator(operation, index, document, existingPathFragment) {
    if (typeof operation !== "object" ||
        operation === null ||
        Array.isArray(operation)) {
        throw new JsonPatchError("Operation is not an object", "OPERATION_NOT_AN_OBJECT", index, operation, document);
    }
    else if (!objOps[operation.op]) {
        throw new JsonPatchError("Operation `op` property is not one of operations defined in RFC-6902", "OPERATION_OP_INVALID", index, operation, document);
    }
    else if (typeof operation.path !== "string") {
        throw new JsonPatchError("Operation `path` property is not a string", "OPERATION_PATH_INVALID", index, operation, document);
    }
    else if (operation.path.indexOf("/") !== 0 && operation.path.length > 0) {
        // paths that aren't empty string should start with "/"
        throw new JsonPatchError('Operation `path` property must start with "/"', "OPERATION_PATH_INVALID", index, operation, document);
    }
    else if ((operation.op === "move" || operation.op === "copy") &&
        typeof operation.from !== "string") {
        throw new JsonPatchError("Operation `from` property is not present (applicable in `move` and `copy` operations)", "OPERATION_FROM_REQUIRED", index, operation, document);
    }
    else if ((operation.op === "add" ||
        operation.op === "replace" ||
        operation.op === "test") &&
        operation.value === undefined) {
        throw new JsonPatchError("Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)", "OPERATION_VALUE_REQUIRED", index, operation, document);
    }
    else if ((operation.op === "add" ||
        operation.op === "replace" ||
        operation.op === "test") &&
        hasUndefined(operation.value)) {
        throw new JsonPatchError("Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)", "OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED", index, operation, document);
    }
    else if (document) {
        if (operation.op == "add") {
            var pathLen = operation.path.split("/").length;
            var existingPathLen = existingPathFragment.split("/").length;
            if (pathLen !== existingPathLen + 1 && pathLen !== existingPathLen) {
                throw new JsonPatchError("Cannot perform an `add` operation at the desired path", "OPERATION_PATH_CANNOT_ADD", index, operation, document);
            }
        }
        else if (operation.op === "replace" ||
            operation.op === "remove" ||
            operation.op === "_get") {
            if (operation.path !== existingPathFragment) {
                throw new JsonPatchError("Cannot perform the operation at a path that does not exist", "OPERATION_PATH_UNRESOLVABLE", index, operation, document);
            }
        }
        else if (operation.op === "move" || operation.op === "copy") {
            var existingValue = {
                op: "_get",
                path: operation.from,
                value: undefined,
            };
            var error = validate([existingValue], document);
            if (error && error.name === "OPERATION_PATH_UNRESOLVABLE") {
                throw new JsonPatchError("Cannot perform the operation from a path that does not exist", "OPERATION_FROM_UNRESOLVABLE", index, operation, document);
            }
        }
    }
}
/**
 * Validates a sequence of operations. If `document` parameter is provided, the sequence is additionally validated against the object document.
 * If error is encountered, returns a JsonPatchError object
 * @param sequence
 * @param document
 * @returns {JsonPatchError|undefined}
 */
function validate(sequence, document, externalValidator) {
    try {
        if (!Array.isArray(sequence)) {
            throw new JsonPatchError("Patch sequence must be an array", "SEQUENCE_NOT_AN_ARRAY");
        }
        if (document) {
            //clone document and sequence so that we can safely try applying operations
            applyPatch(_deepClone(document), _deepClone(sequence), externalValidator || true);
        }
        else {
            externalValidator = externalValidator || validator;
            for (var i = 0; i < sequence.length; i++) {
                externalValidator(sequence[i], i, document, undefined);
            }
        }
    }
    catch (e) {
        if (e instanceof JsonPatchError) {
            return e;
        }
        else {
            throw e;
        }
    }
}
// based on https://github.com/epoberezkin/fast-deep-equal
// MIT License
// Copyright (c) 2017 Evgeny Poberezkin
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
function _areEquals(a, b) {
    if (a === b)
        return true;
    if (a && b && typeof a == "object" && typeof b == "object") {
        var arrA = Array.isArray(a), arrB = Array.isArray(b), i, length, key;
        if (arrA && arrB) {
            length = a.length;
            if (length != b.length)
                return false;
            for (i = length; i-- !== 0;)
                if (!_areEquals(a[i], b[i]))
                    return false;
            return true;
        }
        if (arrA != arrB)
            return false;
        var keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length)
            return false;
        for (i = length; i-- !== 0;)
            if (!b.hasOwnProperty(keys[i]))
                return false;
        for (i = length; i-- !== 0;) {
            key = keys[i];
            if (!_areEquals(a[key], b[key]))
                return false;
        }
        return true;
    }
    return a !== a && b !== b;
}

var decamelize;
var hasRequiredDecamelize;

function requireDecamelize () {
	if (hasRequiredDecamelize) return decamelize;
	hasRequiredDecamelize = 1;
	decamelize = function (str, sep) {
		if (typeof str !== 'string') {
			throw new TypeError('Expected a string');
		}

		sep = typeof sep === 'undefined' ? '_' : sep;

		return str
			.replace(/([a-z\d])([A-Z])/g, '$1' + sep + '$2')
			.replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1' + sep + '$2')
			.toLowerCase();
	};
	return decamelize;
}

var decamelizeExports = requireDecamelize();
var snakeCase = /*@__PURE__*/getDefaultExportFromCjs(decamelizeExports);

var camelcase = {exports: {}};

var hasRequiredCamelcase;

function requireCamelcase () {
	if (hasRequiredCamelcase) return camelcase.exports;
	hasRequiredCamelcase = 1;

	const UPPERCASE = /[\p{Lu}]/u;
	const LOWERCASE = /[\p{Ll}]/u;
	const LEADING_CAPITAL = /^[\p{Lu}](?![\p{Lu}])/gu;
	const IDENTIFIER = /([\p{Alpha}\p{N}_]|$)/u;
	const SEPARATORS = /[_.\- ]+/;

	const LEADING_SEPARATORS = new RegExp('^' + SEPARATORS.source);
	const SEPARATORS_AND_IDENTIFIER = new RegExp(SEPARATORS.source + IDENTIFIER.source, 'gu');
	const NUMBERS_AND_IDENTIFIER = new RegExp('\\d+' + IDENTIFIER.source, 'gu');

	const preserveCamelCase = (string, toLowerCase, toUpperCase) => {
		let isLastCharLower = false;
		let isLastCharUpper = false;
		let isLastLastCharUpper = false;

		for (let i = 0; i < string.length; i++) {
			const character = string[i];

			if (isLastCharLower && UPPERCASE.test(character)) {
				string = string.slice(0, i) + '-' + string.slice(i);
				isLastCharLower = false;
				isLastLastCharUpper = isLastCharUpper;
				isLastCharUpper = true;
				i++;
			} else if (isLastCharUpper && isLastLastCharUpper && LOWERCASE.test(character)) {
				string = string.slice(0, i - 1) + '-' + string.slice(i - 1);
				isLastLastCharUpper = isLastCharUpper;
				isLastCharUpper = false;
				isLastCharLower = true;
			} else {
				isLastCharLower = toLowerCase(character) === character && toUpperCase(character) !== character;
				isLastLastCharUpper = isLastCharUpper;
				isLastCharUpper = toUpperCase(character) === character && toLowerCase(character) !== character;
			}
		}

		return string;
	};

	const preserveConsecutiveUppercase = (input, toLowerCase) => {
		LEADING_CAPITAL.lastIndex = 0;

		return input.replace(LEADING_CAPITAL, m1 => toLowerCase(m1));
	};

	const postProcess = (input, toUpperCase) => {
		SEPARATORS_AND_IDENTIFIER.lastIndex = 0;
		NUMBERS_AND_IDENTIFIER.lastIndex = 0;

		return input.replace(SEPARATORS_AND_IDENTIFIER, (_, identifier) => toUpperCase(identifier))
			.replace(NUMBERS_AND_IDENTIFIER, m => toUpperCase(m));
	};

	const camelCase = (input, options) => {
		if (!(typeof input === 'string' || Array.isArray(input))) {
			throw new TypeError('Expected the input to be `string | string[]`');
		}

		options = {
			pascalCase: false,
			preserveConsecutiveUppercase: false,
			...options
		};

		if (Array.isArray(input)) {
			input = input.map(x => x.trim())
				.filter(x => x.length)
				.join('-');
		} else {
			input = input.trim();
		}

		if (input.length === 0) {
			return '';
		}

		const toLowerCase = options.locale === false ?
			string => string.toLowerCase() :
			string => string.toLocaleLowerCase(options.locale);
		const toUpperCase = options.locale === false ?
			string => string.toUpperCase() :
			string => string.toLocaleUpperCase(options.locale);

		if (input.length === 1) {
			return options.pascalCase ? toUpperCase(input) : toLowerCase(input);
		}

		const hasUpperCase = input !== toLowerCase(input);

		if (hasUpperCase) {
			input = preserveCamelCase(input, toLowerCase, toUpperCase);
		}

		input = input.replace(LEADING_SEPARATORS, '');

		if (options.preserveConsecutiveUppercase) {
			input = preserveConsecutiveUppercase(input, toLowerCase);
		} else {
			input = toLowerCase(input);
		}

		if (options.pascalCase) {
			input = toUpperCase(input.charAt(0)) + input.slice(1);
		}

		return postProcess(input, toUpperCase);
	};

	camelcase.exports = camelCase;
	// TODO: Remove this for the next major release
	camelcase.exports.default = camelCase;
	return camelcase.exports;
}

requireCamelcase();

function keyToJson(key, map) {
    return map?.[key] || snakeCase(key);
}
function mapKeys(fields, mapper, map) {
    const mapped = {};
    for (const key in fields) {
        if (Object.hasOwn(fields, key)) {
            mapped[mapper(key, map)] = fields[key];
        }
    }
    return mapped;
}

function shallowCopy(obj) {
    return Array.isArray(obj) ? [...obj] : { ...obj };
}
function replaceSecrets(root, secretsMap) {
    const result = shallowCopy(root);
    for (const [path, secretId] of Object.entries(secretsMap)) {
        const [last, ...partsReverse] = path.split(".").reverse();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let current = result;
        for (const part of partsReverse.reverse()) {
            if (current[part] === undefined) {
                break;
            }
            current[part] = shallowCopy(current[part]);
            current = current[part];
        }
        if (current[last] !== undefined) {
            current[last] = {
                lc: 1,
                type: "secret",
                id: [secretId],
            };
        }
    }
    return result;
}
/**
 * Get a unique name for the module, rather than parent class implementations.
 * Should not be subclassed, subclass lc_name above instead.
 */
function get_lc_unique_name(
// eslint-disable-next-line @typescript-eslint/no-use-before-define
serializableClass) {
    // "super" here would refer to the parent class of Serializable,
    // when we want the parent class of the module actually calling this method.
    const parentClass = Object.getPrototypeOf(serializableClass);
    const lcNameIsSubclassed = typeof serializableClass.lc_name === "function" &&
        (typeof parentClass.lc_name !== "function" ||
            serializableClass.lc_name() !== parentClass.lc_name());
    if (lcNameIsSubclassed) {
        return serializableClass.lc_name();
    }
    else {
        return serializableClass.name;
    }
}
class Serializable {
    /**
     * The name of the serializable. Override to provide an alias or
     * to preserve the serialized module name in minified environments.
     *
     * Implemented as a static method to support loading logic.
     */
    static lc_name() {
        return this.name;
    }
    /**
     * The final serialized identifier for the module.
     */
    get lc_id() {
        return [
            ...this.lc_namespace,
            get_lc_unique_name(this.constructor),
        ];
    }
    /**
     * A map of secrets, which will be omitted from serialization.
     * Keys are paths to the secret in constructor args, e.g. "foo.bar.baz".
     * Values are the secret ids, which will be used when deserializing.
     */
    get lc_secrets() {
        return undefined;
    }
    /**
     * A map of additional attributes to merge with constructor args.
     * Keys are the attribute names, e.g. "foo".
     * Values are the attribute values, which will be serialized.
     * These attributes need to be accepted by the constructor as arguments.
     */
    get lc_attributes() {
        return undefined;
    }
    /**
     * A map of aliases for constructor args.
     * Keys are the attribute names, e.g. "foo".
     * Values are the alias that will replace the key in serialization.
     * This is used to eg. make argument names match Python.
     */
    get lc_aliases() {
        return undefined;
    }
    constructor(kwargs, ..._args) {
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lc_kwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.lc_kwargs = kwargs || {};
    }
    toJSON() {
        if (!this.lc_serializable) {
            return this.toJSONNotImplemented();
        }
        if (
        // eslint-disable-next-line no-instanceof/no-instanceof
        this.lc_kwargs instanceof Serializable ||
            typeof this.lc_kwargs !== "object" ||
            Array.isArray(this.lc_kwargs)) {
            // We do not support serialization of classes with arg not a POJO
            // I'm aware the check above isn't as strict as it could be
            return this.toJSONNotImplemented();
        }
        const aliases = {};
        const secrets = {};
        const kwargs = Object.keys(this.lc_kwargs).reduce((acc, key) => {
            acc[key] = key in this ? this[key] : this.lc_kwargs[key];
            return acc;
        }, {});
        // get secrets, attributes and aliases from all superclasses
        for (
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current = Object.getPrototypeOf(this); current; current = Object.getPrototypeOf(current)) {
            Object.assign(aliases, Reflect.get(current, "lc_aliases", this));
            Object.assign(secrets, Reflect.get(current, "lc_secrets", this));
            Object.assign(kwargs, Reflect.get(current, "lc_attributes", this));
        }
        // include all secrets used, even if not in kwargs,
        // will be replaced with sentinel value in replaceSecrets
        Object.keys(secrets).forEach((keyPath) => {
            // eslint-disable-next-line @typescript-eslint/no-this-alias, @typescript-eslint/no-explicit-any
            let read = this;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let write = kwargs;
            const [last, ...partsReverse] = keyPath.split(".").reverse();
            for (const key of partsReverse.reverse()) {
                if (!(key in read) || read[key] === undefined)
                    return;
                if (!(key in write) || write[key] === undefined) {
                    if (typeof read[key] === "object" && read[key] != null) {
                        write[key] = {};
                    }
                    else if (Array.isArray(read[key])) {
                        write[key] = [];
                    }
                }
                read = read[key];
                write = write[key];
            }
            if (last in read && read[last] !== undefined) {
                write[last] = write[last] || read[last];
            }
        });
        return {
            lc: 1,
            type: "constructor",
            id: this.lc_id,
            kwargs: mapKeys(Object.keys(secrets).length ? replaceSecrets(kwargs, secrets) : kwargs, keyToJson, aliases),
        };
    }
    toJSONNotImplemented() {
        return {
            lc: 1,
            type: "not_implemented",
            id: this.lc_id,
        };
    }
}

const isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";
const isWebWorker = () => typeof globalThis === "object" &&
    globalThis.constructor &&
    globalThis.constructor.name === "DedicatedWorkerGlobalScope";
const isJsDom = () => (typeof window !== "undefined" && window.name === "nodejs") ||
    (typeof navigator !== "undefined" &&
        (navigator.userAgent.includes("Node.js") ||
            navigator.userAgent.includes("jsdom")));
// Supabase Edge Function provides a `Deno` global object
// without `version` property
const isDeno = () => typeof Deno !== "undefined";
// Mark not-as-node if in Supabase Edge Function
const isNode = () => typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined" &&
    !isDeno();
const getEnv = () => {
    let env;
    if (isBrowser()) {
        env = "browser";
    }
    else if (isNode()) {
        env = "node";
    }
    else if (isWebWorker()) {
        env = "webworker";
    }
    else if (isJsDom()) {
        env = "jsdom";
    }
    else if (isDeno()) {
        env = "deno";
    }
    else {
        env = "other";
    }
    return env;
};
let runtimeEnvironment;
async function getRuntimeEnvironment() {
    if (runtimeEnvironment === undefined) {
        const env = getEnv();
        runtimeEnvironment = {
            library: "langchain-js",
            runtime: env,
        };
    }
    return runtimeEnvironment;
}
function getEnvironmentVariable(name) {
    // Certain Deno setups will throw an error if you try to access environment variables
    // https://github.com/langchain-ai/langchainjs/issues/1412
    try {
        return typeof process !== "undefined"
            ? // eslint-disable-next-line no-process-env
                process.env?.[name]
            : undefined;
    }
    catch (e) {
        return undefined;
    }
}

/**
 * Abstract class that provides a set of optional methods that can be
 * overridden in derived classes to handle various events during the
 * execution of a LangChain application.
 */
class BaseCallbackHandlerMethodsClass {
}
/**
 * Abstract base class for creating callback handlers in the LangChain
 * framework. It provides a set of optional methods that can be overridden
 * in derived classes to handle various events during the execution of a
 * LangChain application.
 */
class BaseCallbackHandler extends BaseCallbackHandlerMethodsClass {
    get lc_namespace() {
        return ["langchain_core", "callbacks", this.name];
    }
    get lc_secrets() {
        return undefined;
    }
    get lc_attributes() {
        return undefined;
    }
    get lc_aliases() {
        return undefined;
    }
    /**
     * The name of the serializable. Override to provide an alias or
     * to preserve the serialized module name in minified environments.
     *
     * Implemented as a static method to support loading logic.
     */
    static lc_name() {
        return this.name;
    }
    /**
     * The final serialized identifier for the module.
     */
    get lc_id() {
        return [
            ...this.lc_namespace,
            get_lc_unique_name(this.constructor),
        ];
    }
    constructor(input) {
        super();
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lc_kwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ignoreLLM", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "ignoreChain", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "ignoreAgent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "ignoreRetriever", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "ignoreCustomEvent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "raiseError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "awaitHandlers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false"
        });
        this.lc_kwargs = input || {};
        if (input) {
            this.ignoreLLM = input.ignoreLLM ?? this.ignoreLLM;
            this.ignoreChain = input.ignoreChain ?? this.ignoreChain;
            this.ignoreAgent = input.ignoreAgent ?? this.ignoreAgent;
            this.ignoreRetriever = input.ignoreRetriever ?? this.ignoreRetriever;
            this.ignoreCustomEvent =
                input.ignoreCustomEvent ?? this.ignoreCustomEvent;
            this.raiseError = input.raiseError ?? this.raiseError;
            this.awaitHandlers =
                this.raiseError || (input._awaitHandler ?? this.awaitHandlers);
        }
    }
    copy() {
        return new this.constructor(this);
    }
    toJSON() {
        return Serializable.prototype.toJSON.call(this);
    }
    toJSONNotImplemented() {
        return Serializable.prototype.toJSONNotImplemented.call(this);
    }
    static fromMethods(methods) {
        class Handler extends BaseCallbackHandler {
            constructor() {
                super();
                Object.defineProperty(this, "name", {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: v4()
                });
                Object.assign(this, methods);
            }
        }
        return new Handler();
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _coerceToDict$1(value, defaultKey) {
    return value && !Array.isArray(value) && typeof value === "object"
        ? value
        : { [defaultKey]: value };
}
function stripNonAlphanumeric(input) {
    return input.replace(/[-:.]/g, "");
}
function convertToDottedOrderFormat(epoch, runId, executionOrder) {
    const paddedOrder = executionOrder.toFixed(0).slice(0, 3).padStart(3, "0");
    return (stripNonAlphanumeric(`${new Date(epoch).toISOString().slice(0, -1)}${paddedOrder}Z`) + runId);
}
function isBaseTracer(x) {
    return typeof x._addRunToRunMap === "function";
}
class BaseTracer extends BaseCallbackHandler {
    constructor(_fields) {
        super(...arguments);
        Object.defineProperty(this, "runMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    copy() {
        return this;
    }
    stringifyError(error) {
        // eslint-disable-next-line no-instanceof/no-instanceof
        if (error instanceof Error) {
            return error.message + (error?.stack ? `\n\n${error.stack}` : "");
        }
        if (typeof error === "string") {
            return error;
        }
        return `${error}`;
    }
    _addChildRun(parentRun, childRun) {
        parentRun.child_runs.push(childRun);
    }
    _addRunToRunMap(run) {
        const currentDottedOrder = convertToDottedOrderFormat(run.start_time, run.id, run.execution_order);
        const storedRun = { ...run };
        if (storedRun.parent_run_id !== undefined) {
            const parentRun = this.runMap.get(storedRun.parent_run_id);
            if (parentRun) {
                this._addChildRun(parentRun, storedRun);
                parentRun.child_execution_order = Math.max(parentRun.child_execution_order, storedRun.child_execution_order);
                storedRun.trace_id = parentRun.trace_id;
                if (parentRun.dotted_order !== undefined) {
                    storedRun.dotted_order = [
                        parentRun.dotted_order,
                        currentDottedOrder,
                    ].join(".");
                }
            }
        }
        else {
            storedRun.trace_id = storedRun.id;
            storedRun.dotted_order = currentDottedOrder;
        }
        this.runMap.set(storedRun.id, storedRun);
        return storedRun;
    }
    async _endTrace(run) {
        const parentRun = run.parent_run_id !== undefined && this.runMap.get(run.parent_run_id);
        if (parentRun) {
            parentRun.child_execution_order = Math.max(parentRun.child_execution_order, run.child_execution_order);
        }
        else {
            await this.persistRun(run);
        }
        this.runMap.delete(run.id);
        await this.onRunUpdate?.(run);
    }
    _getExecutionOrder(parentRunId) {
        const parentRun = parentRunId !== undefined && this.runMap.get(parentRunId);
        // If a run has no parent then execution order is 1
        if (!parentRun) {
            return 1;
        }
        return parentRun.child_execution_order + 1;
    }
    /**
     * Create and add a run to the run map for LLM start events.
     * This must sometimes be done synchronously to avoid race conditions
     * when callbacks are backgrounded, so we expose it as a separate method here.
     */
    _createRunForLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name) {
        const execution_order = this._getExecutionOrder(parentRunId);
        const start_time = Date.now();
        const finalExtraParams = metadata
            ? { ...extraParams, metadata }
            : extraParams;
        const run = {
            id: runId,
            name: name ?? llm.id[llm.id.length - 1],
            parent_run_id: parentRunId,
            start_time,
            serialized: llm,
            events: [
                {
                    name: "start",
                    time: new Date(start_time).toISOString(),
                },
            ],
            inputs: { prompts },
            execution_order,
            child_runs: [],
            child_execution_order: execution_order,
            run_type: "llm",
            extra: finalExtraParams ?? {},
            tags: tags || [],
        };
        return this._addRunToRunMap(run);
    }
    async handleLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name) {
        const run = this.runMap.get(runId) ??
            this._createRunForLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name);
        await this.onRunCreate?.(run);
        await this.onLLMStart?.(run);
        return run;
    }
    /**
     * Create and add a run to the run map for chat model start events.
     * This must sometimes be done synchronously to avoid race conditions
     * when callbacks are backgrounded, so we expose it as a separate method here.
     */
    _createRunForChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name) {
        const execution_order = this._getExecutionOrder(parentRunId);
        const start_time = Date.now();
        const finalExtraParams = metadata
            ? { ...extraParams, metadata }
            : extraParams;
        const run = {
            id: runId,
            name: name ?? llm.id[llm.id.length - 1],
            parent_run_id: parentRunId,
            start_time,
            serialized: llm,
            events: [
                {
                    name: "start",
                    time: new Date(start_time).toISOString(),
                },
            ],
            inputs: { messages },
            execution_order,
            child_runs: [],
            child_execution_order: execution_order,
            run_type: "llm",
            extra: finalExtraParams ?? {},
            tags: tags || [],
        };
        return this._addRunToRunMap(run);
    }
    async handleChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name) {
        const run = this.runMap.get(runId) ??
            this._createRunForChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name);
        await this.onRunCreate?.(run);
        await this.onLLMStart?.(run);
        return run;
    }
    async handleLLMEnd(output, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "llm") {
            throw new Error("No LLM run to end.");
        }
        run.end_time = Date.now();
        run.outputs = output;
        run.events.push({
            name: "end",
            time: new Date(run.end_time).toISOString(),
        });
        await this.onLLMEnd?.(run);
        await this._endTrace(run);
        return run;
    }
    async handleLLMError(error, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "llm") {
            throw new Error("No LLM run to end.");
        }
        run.end_time = Date.now();
        run.error = this.stringifyError(error);
        run.events.push({
            name: "error",
            time: new Date(run.end_time).toISOString(),
        });
        await this.onLLMError?.(run);
        await this._endTrace(run);
        return run;
    }
    /**
     * Create and add a run to the run map for chain start events.
     * This must sometimes be done synchronously to avoid race conditions
     * when callbacks are backgrounded, so we expose it as a separate method here.
     */
    _createRunForChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name) {
        const execution_order = this._getExecutionOrder(parentRunId);
        const start_time = Date.now();
        const run = {
            id: runId,
            name: name ?? chain.id[chain.id.length - 1],
            parent_run_id: parentRunId,
            start_time,
            serialized: chain,
            events: [
                {
                    name: "start",
                    time: new Date(start_time).toISOString(),
                },
            ],
            inputs,
            execution_order,
            child_execution_order: execution_order,
            run_type: runType ?? "chain",
            child_runs: [],
            extra: metadata ? { metadata } : {},
            tags: tags || [],
        };
        return this._addRunToRunMap(run);
    }
    async handleChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name) {
        const run = this.runMap.get(runId) ??
            this._createRunForChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name);
        await this.onRunCreate?.(run);
        await this.onChainStart?.(run);
        return run;
    }
    async handleChainEnd(outputs, runId, _parentRunId, _tags, kwargs) {
        const run = this.runMap.get(runId);
        if (!run) {
            throw new Error("No chain run to end.");
        }
        run.end_time = Date.now();
        run.outputs = _coerceToDict$1(outputs, "output");
        run.events.push({
            name: "end",
            time: new Date(run.end_time).toISOString(),
        });
        if (kwargs?.inputs !== undefined) {
            run.inputs = _coerceToDict$1(kwargs.inputs, "input");
        }
        await this.onChainEnd?.(run);
        await this._endTrace(run);
        return run;
    }
    async handleChainError(error, runId, _parentRunId, _tags, kwargs) {
        const run = this.runMap.get(runId);
        if (!run) {
            throw new Error("No chain run to end.");
        }
        run.end_time = Date.now();
        run.error = this.stringifyError(error);
        run.events.push({
            name: "error",
            time: new Date(run.end_time).toISOString(),
        });
        if (kwargs?.inputs !== undefined) {
            run.inputs = _coerceToDict$1(kwargs.inputs, "input");
        }
        await this.onChainError?.(run);
        await this._endTrace(run);
        return run;
    }
    /**
     * Create and add a run to the run map for tool start events.
     * This must sometimes be done synchronously to avoid race conditions
     * when callbacks are backgrounded, so we expose it as a separate method here.
     */
    _createRunForToolStart(tool, input, runId, parentRunId, tags, metadata, name) {
        const execution_order = this._getExecutionOrder(parentRunId);
        const start_time = Date.now();
        const run = {
            id: runId,
            name: name ?? tool.id[tool.id.length - 1],
            parent_run_id: parentRunId,
            start_time,
            serialized: tool,
            events: [
                {
                    name: "start",
                    time: new Date(start_time).toISOString(),
                },
            ],
            inputs: { input },
            execution_order,
            child_execution_order: execution_order,
            run_type: "tool",
            child_runs: [],
            extra: metadata ? { metadata } : {},
            tags: tags || [],
        };
        return this._addRunToRunMap(run);
    }
    async handleToolStart(tool, input, runId, parentRunId, tags, metadata, name) {
        const run = this.runMap.get(runId) ??
            this._createRunForToolStart(tool, input, runId, parentRunId, tags, metadata, name);
        await this.onRunCreate?.(run);
        await this.onToolStart?.(run);
        return run;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleToolEnd(output, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "tool") {
            throw new Error("No tool run to end");
        }
        run.end_time = Date.now();
        run.outputs = { output };
        run.events.push({
            name: "end",
            time: new Date(run.end_time).toISOString(),
        });
        await this.onToolEnd?.(run);
        await this._endTrace(run);
        return run;
    }
    async handleToolError(error, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "tool") {
            throw new Error("No tool run to end");
        }
        run.end_time = Date.now();
        run.error = this.stringifyError(error);
        run.events.push({
            name: "error",
            time: new Date(run.end_time).toISOString(),
        });
        await this.onToolError?.(run);
        await this._endTrace(run);
        return run;
    }
    async handleAgentAction(action, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "chain") {
            return;
        }
        const agentRun = run;
        agentRun.actions = agentRun.actions || [];
        agentRun.actions.push(action);
        agentRun.events.push({
            name: "agent_action",
            time: new Date().toISOString(),
            kwargs: { action },
        });
        await this.onAgentAction?.(run);
    }
    async handleAgentEnd(action, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "chain") {
            return;
        }
        run.events.push({
            name: "agent_end",
            time: new Date().toISOString(),
            kwargs: { action },
        });
        await this.onAgentEnd?.(run);
    }
    /**
     * Create and add a run to the run map for retriever start events.
     * This must sometimes be done synchronously to avoid race conditions
     * when callbacks are backgrounded, so we expose it as a separate method here.
     */
    _createRunForRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name) {
        const execution_order = this._getExecutionOrder(parentRunId);
        const start_time = Date.now();
        const run = {
            id: runId,
            name: name ?? retriever.id[retriever.id.length - 1],
            parent_run_id: parentRunId,
            start_time,
            serialized: retriever,
            events: [
                {
                    name: "start",
                    time: new Date(start_time).toISOString(),
                },
            ],
            inputs: { query },
            execution_order,
            child_execution_order: execution_order,
            run_type: "retriever",
            child_runs: [],
            extra: metadata ? { metadata } : {},
            tags: tags || [],
        };
        return this._addRunToRunMap(run);
    }
    async handleRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name) {
        const run = this.runMap.get(runId) ??
            this._createRunForRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name);
        await this.onRunCreate?.(run);
        await this.onRetrieverStart?.(run);
        return run;
    }
    async handleRetrieverEnd(documents, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "retriever") {
            throw new Error("No retriever run to end");
        }
        run.end_time = Date.now();
        run.outputs = { documents };
        run.events.push({
            name: "end",
            time: new Date(run.end_time).toISOString(),
        });
        await this.onRetrieverEnd?.(run);
        await this._endTrace(run);
        return run;
    }
    async handleRetrieverError(error, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "retriever") {
            throw new Error("No retriever run to end");
        }
        run.end_time = Date.now();
        run.error = this.stringifyError(error);
        run.events.push({
            name: "error",
            time: new Date(run.end_time).toISOString(),
        });
        await this.onRetrieverError?.(run);
        await this._endTrace(run);
        return run;
    }
    async handleText(text, runId) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "chain") {
            return;
        }
        run.events.push({
            name: "text",
            time: new Date().toISOString(),
            kwargs: { text },
        });
        await this.onText?.(run);
    }
    async handleLLMNewToken(token, idx, runId, _parentRunId, _tags, fields) {
        const run = this.runMap.get(runId);
        if (!run || run?.run_type !== "llm") {
            throw new Error(`Invalid "runId" provided to "handleLLMNewToken" callback.`);
        }
        run.events.push({
            name: "new_token",
            time: new Date().toISOString(),
            kwargs: { token, idx, chunk: fields?.chunk },
        });
        await this.onLLMNewToken?.(run, token, { chunk: fields?.chunk });
        return run;
    }
}

var ansiStyles = {exports: {}};

ansiStyles.exports;

var hasRequiredAnsiStyles;

function requireAnsiStyles () {
	if (hasRequiredAnsiStyles) return ansiStyles.exports;
	hasRequiredAnsiStyles = 1;
	(function (module) {

		const ANSI_BACKGROUND_OFFSET = 10;

		const wrapAnsi256 = (offset = 0) => code => `\u001B[${38 + offset};5;${code}m`;

		const wrapAnsi16m = (offset = 0) => (red, green, blue) => `\u001B[${38 + offset};2;${red};${green};${blue}m`;

		function assembleStyles() {
			const codes = new Map();
			const styles = {
				modifier: {
					reset: [0, 0],
					// 21 isn't widely supported and 22 does the same thing
					bold: [1, 22],
					dim: [2, 22],
					italic: [3, 23],
					underline: [4, 24],
					overline: [53, 55],
					inverse: [7, 27],
					hidden: [8, 28],
					strikethrough: [9, 29]
				},
				color: {
					black: [30, 39],
					red: [31, 39],
					green: [32, 39],
					yellow: [33, 39],
					blue: [34, 39],
					magenta: [35, 39],
					cyan: [36, 39],
					white: [37, 39],

					// Bright color
					blackBright: [90, 39],
					redBright: [91, 39],
					greenBright: [92, 39],
					yellowBright: [93, 39],
					blueBright: [94, 39],
					magentaBright: [95, 39],
					cyanBright: [96, 39],
					whiteBright: [97, 39]
				},
				bgColor: {
					bgBlack: [40, 49],
					bgRed: [41, 49],
					bgGreen: [42, 49],
					bgYellow: [43, 49],
					bgBlue: [44, 49],
					bgMagenta: [45, 49],
					bgCyan: [46, 49],
					bgWhite: [47, 49],

					// Bright color
					bgBlackBright: [100, 49],
					bgRedBright: [101, 49],
					bgGreenBright: [102, 49],
					bgYellowBright: [103, 49],
					bgBlueBright: [104, 49],
					bgMagentaBright: [105, 49],
					bgCyanBright: [106, 49],
					bgWhiteBright: [107, 49]
				}
			};

			// Alias bright black as gray (and grey)
			styles.color.gray = styles.color.blackBright;
			styles.bgColor.bgGray = styles.bgColor.bgBlackBright;
			styles.color.grey = styles.color.blackBright;
			styles.bgColor.bgGrey = styles.bgColor.bgBlackBright;

			for (const [groupName, group] of Object.entries(styles)) {
				for (const [styleName, style] of Object.entries(group)) {
					styles[styleName] = {
						open: `\u001B[${style[0]}m`,
						close: `\u001B[${style[1]}m`
					};

					group[styleName] = styles[styleName];

					codes.set(style[0], style[1]);
				}

				Object.defineProperty(styles, groupName, {
					value: group,
					enumerable: false
				});
			}

			Object.defineProperty(styles, 'codes', {
				value: codes,
				enumerable: false
			});

			styles.color.close = '\u001B[39m';
			styles.bgColor.close = '\u001B[49m';

			styles.color.ansi256 = wrapAnsi256();
			styles.color.ansi16m = wrapAnsi16m();
			styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
			styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);

			// From https://github.com/Qix-/color-convert/blob/3f0e0d4e92e235796ccb17f6e85c72094a651f49/conversions.js
			Object.defineProperties(styles, {
				rgbToAnsi256: {
					value: (red, green, blue) => {
						// We use the extended greyscale palette here, with the exception of
						// black and white. normal palette only has 4 greyscale shades.
						if (red === green && green === blue) {
							if (red < 8) {
								return 16;
							}

							if (red > 248) {
								return 231;
							}

							return Math.round(((red - 8) / 247) * 24) + 232;
						}

						return 16 +
							(36 * Math.round(red / 255 * 5)) +
							(6 * Math.round(green / 255 * 5)) +
							Math.round(blue / 255 * 5);
					},
					enumerable: false
				},
				hexToRgb: {
					value: hex => {
						const matches = /(?<colorString>[a-f\d]{6}|[a-f\d]{3})/i.exec(hex.toString(16));
						if (!matches) {
							return [0, 0, 0];
						}

						let {colorString} = matches.groups;

						if (colorString.length === 3) {
							colorString = colorString.split('').map(character => character + character).join('');
						}

						const integer = Number.parseInt(colorString, 16);

						return [
							(integer >> 16) & 0xFF,
							(integer >> 8) & 0xFF,
							integer & 0xFF
						];
					},
					enumerable: false
				},
				hexToAnsi256: {
					value: hex => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
					enumerable: false
				}
			});

			return styles;
		}

		// Make the export immutable
		Object.defineProperty(module, 'exports', {
			enumerable: true,
			get: assembleStyles
		}); 
	} (ansiStyles));
	return ansiStyles.exports;
}

var ansiStylesExports = requireAnsiStyles();
var styles = /*@__PURE__*/getDefaultExportFromCjs(ansiStylesExports);

function wrap(style, text) {
    return `${style.open}${text}${style.close}`;
}
function tryJsonStringify(obj, fallback) {
    try {
        return JSON.stringify(obj, null, 2);
    }
    catch (err) {
        return fallback;
    }
}
function formatKVMapItem(value) {
    if (typeof value === "string") {
        return value.trim();
    }
    if (value === null || value === undefined) {
        return value;
    }
    return tryJsonStringify(value, value.toString());
}
function elapsed(run) {
    if (!run.end_time)
        return "";
    const elapsed = run.end_time - run.start_time;
    if (elapsed < 1000) {
        return `${elapsed}ms`;
    }
    return `${(elapsed / 1000).toFixed(2)}s`;
}
const { color } = styles;
/**
 * A tracer that logs all events to the console. It extends from the
 * `BaseTracer` class and overrides its methods to provide custom logging
 * functionality.
 * @example
 * ```typescript
 *
 * const llm = new ChatAnthropic({
 *   temperature: 0,
 *   tags: ["example", "callbacks", "constructor"],
 *   callbacks: [new ConsoleCallbackHandler()],
 * });
 *
 * ```
 */
class ConsoleCallbackHandler extends BaseTracer {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "console_callback_handler"
        });
    }
    /**
     * Method used to persist the run. In this case, it simply returns a
     * resolved promise as there's no persistence logic.
     * @param _run The run to persist.
     * @returns A resolved promise.
     */
    persistRun(_run) {
        return Promise.resolve();
    }
    // utility methods
    /**
     * Method used to get all the parent runs of a given run.
     * @param run The run whose parents are to be retrieved.
     * @returns An array of parent runs.
     */
    getParents(run) {
        const parents = [];
        let currentRun = run;
        while (currentRun.parent_run_id) {
            const parent = this.runMap.get(currentRun.parent_run_id);
            if (parent) {
                parents.push(parent);
                currentRun = parent;
            }
            else {
                break;
            }
        }
        return parents;
    }
    /**
     * Method used to get a string representation of the run's lineage, which
     * is used in logging.
     * @param run The run whose lineage is to be retrieved.
     * @returns A string representation of the run's lineage.
     */
    getBreadcrumbs(run) {
        const parents = this.getParents(run).reverse();
        const string = [...parents, run]
            .map((parent, i, arr) => {
            const name = `${parent.execution_order}:${parent.run_type}:${parent.name}`;
            return i === arr.length - 1 ? wrap(styles.bold, name) : name;
        })
            .join(" > ");
        return wrap(color.grey, string);
    }
    // logging methods
    /**
     * Method used to log the start of a chain run.
     * @param run The chain run that has started.
     * @returns void
     */
    onChainStart(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.green, "[chain/start]")} [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, "[inputs]")}`);
    }
    /**
     * Method used to log the end of a chain run.
     * @param run The chain run that has ended.
     * @returns void
     */
    onChainEnd(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.cyan, "[chain/end]")} [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(run.outputs, "[outputs]")}`);
    }
    /**
     * Method used to log any errors of a chain run.
     * @param run The chain run that has errored.
     * @returns void
     */
    onChainError(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.red, "[chain/error]")} [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
    }
    /**
     * Method used to log the start of an LLM run.
     * @param run The LLM run that has started.
     * @returns void
     */
    onLLMStart(run) {
        const crumbs = this.getBreadcrumbs(run);
        const inputs = "prompts" in run.inputs
            ? { prompts: run.inputs.prompts.map((p) => p.trim()) }
            : run.inputs;
        console.log(`${wrap(color.green, "[llm/start]")} [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, "[inputs]")}`);
    }
    /**
     * Method used to log the end of an LLM run.
     * @param run The LLM run that has ended.
     * @returns void
     */
    onLLMEnd(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.cyan, "[llm/end]")} [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(run.outputs, "[response]")}`);
    }
    /**
     * Method used to log any errors of an LLM run.
     * @param run The LLM run that has errored.
     * @returns void
     */
    onLLMError(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.red, "[llm/error]")} [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
    }
    /**
     * Method used to log the start of a tool run.
     * @param run The tool run that has started.
     * @returns void
     */
    onToolStart(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.green, "[tool/start]")} [${crumbs}] Entering Tool run with input: "${formatKVMapItem(run.inputs.input)}"`);
    }
    /**
     * Method used to log the end of a tool run.
     * @param run The tool run that has ended.
     * @returns void
     */
    onToolEnd(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.cyan, "[tool/end]")} [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${formatKVMapItem(run.outputs?.output)}"`);
    }
    /**
     * Method used to log any errors of a tool run.
     * @param run The tool run that has errored.
     * @returns void
     */
    onToolError(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.red, "[tool/error]")} [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
    }
    /**
     * Method used to log the start of a retriever run.
     * @param run The retriever run that has started.
     * @returns void
     */
    onRetrieverStart(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.green, "[retriever/start]")} [${crumbs}] Entering Retriever run with input: ${tryJsonStringify(run.inputs, "[inputs]")}`);
    }
    /**
     * Method used to log the end of a retriever run.
     * @param run The retriever run that has ended.
     * @returns void
     */
    onRetrieverEnd(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.cyan, "[retriever/end]")} [${crumbs}] [${elapsed(run)}] Exiting Retriever run with output: ${tryJsonStringify(run.outputs, "[outputs]")}`);
    }
    /**
     * Method used to log any errors of a retriever run.
     * @param run The retriever run that has errored.
     * @returns void
     */
    onRetrieverError(run) {
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.red, "[retriever/error]")} [${crumbs}] [${elapsed(run)}] Retriever run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
    }
    /**
     * Method used to log the action selected by the agent.
     * @param run The run in which the agent action occurred.
     * @returns void
     */
    onAgentAction(run) {
        const agentRun = run;
        const crumbs = this.getBreadcrumbs(run);
        console.log(`${wrap(color.blue, "[agent/action]")} [${crumbs}] Agent selected action: ${tryJsonStringify(agentRun.actions[agentRun.actions.length - 1], "[action]")}`);
    }
}

function _isToolCall(toolCall) {
    return !!(toolCall &&
        typeof toolCall === "object" &&
        "type" in toolCall &&
        toolCall.type === "tool_call");
}
/**
 * Custom error class used to handle exceptions related to tool input parsing.
 * It extends the built-in `Error` class and adds an optional `output`
 * property that can hold the output that caused the exception.
 */
class ToolInputParsingException extends Error {
    constructor(message, output) {
        super(message);
        Object.defineProperty(this, "output", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.output = output;
    }
}

// Adapted from https://github.com/KillianLucas/open-interpreter/blob/main/interpreter/core/llm/utils/parse_partial_json.py
// MIT License
function parsePartialJson(s) {
    // If the input is undefined, return null to indicate failure.
    if (typeof s === "undefined") {
        return null;
    }
    // Attempt to parse the string as-is.
    try {
        return JSON.parse(s);
    }
    catch (error) {
        // Pass
    }
    // Initialize variables.
    let new_s = "";
    const stack = [];
    let isInsideString = false;
    let escaped = false;
    // Process each character in the string one at a time.
    for (let char of s) {
        if (isInsideString) {
            if (char === '"' && !escaped) {
                isInsideString = false;
            }
            else if (char === "\n" && !escaped) {
                char = "\\n"; // Replace the newline character with the escape sequence.
            }
            else if (char === "\\") {
                escaped = !escaped;
            }
            else {
                escaped = false;
            }
        }
        else {
            if (char === '"') {
                isInsideString = true;
                escaped = false;
            }
            else if (char === "{") {
                stack.push("}");
            }
            else if (char === "[") {
                stack.push("]");
            }
            else if (char === "}" || char === "]") {
                if (stack && stack[stack.length - 1] === char) {
                    stack.pop();
                }
                else {
                    // Mismatched closing character; the input is malformed.
                    return null;
                }
            }
        }
        // Append the processed character to the new string.
        new_s += char;
    }
    // If we're still inside a string at the end of processing,
    // we need to close the string.
    if (isInsideString) {
        new_s += '"';
    }
    // Close any remaining open structures in the reverse order that they were opened.
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        new_s += stack[i];
    }
    // Attempt to parse the modified string as JSON.
    try {
        return JSON.parse(new_s);
    }
    catch (error) {
        // If we still can't parse the string as JSON, return null to indicate failure.
        return null;
    }
}

function mergeContent(firstContent, secondContent) {
    // If first content is a string
    if (typeof firstContent === "string") {
        if (typeof secondContent === "string") {
            return firstContent + secondContent;
        }
        else {
            return [{ type: "text", text: firstContent }, ...secondContent];
        }
        // If both are arrays
    }
    else if (Array.isArray(secondContent)) {
        return (_mergeLists(firstContent, secondContent) ?? [
            ...firstContent,
            ...secondContent,
        ]);
    }
    else {
        // Otherwise, add the second content as a new element of the list
        return [...firstContent, { type: "text", text: secondContent }];
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stringifyWithDepthLimit(obj, depthLimit) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function helper(obj, currentDepth) {
        if (typeof obj !== "object" || obj === null || obj === undefined) {
            return obj;
        }
        if (currentDepth >= depthLimit) {
            if (Array.isArray(obj)) {
                return "[Array]";
            }
            return "[Object]";
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => helper(item, currentDepth + 1));
        }
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = helper(obj[key], currentDepth + 1);
        }
        return result;
    }
    return JSON.stringify(helper(obj, 0), null, 2);
}
/**
 * Base class for all types of messages in a conversation. It includes
 * properties like `content`, `name`, and `additional_kwargs`. It also
 * includes methods like `toDict()` and `_getType()`.
 */
class BaseMessage extends Serializable {
    get lc_aliases() {
        // exclude snake case conversion to pascal case
        return {
            additional_kwargs: "additional_kwargs",
            response_metadata: "response_metadata",
        };
    }
    /**
     * @deprecated
     * Use {@link BaseMessage.content} instead.
     */
    get text() {
        return typeof this.content === "string" ? this.content : "";
    }
    /** The type of the message. */
    getType() {
        return this._getType();
    }
    constructor(fields, 
    /** @deprecated */
    kwargs) {
        if (typeof fields === "string") {
            // eslint-disable-next-line no-param-reassign
            fields = {
                content: fields,
                additional_kwargs: kwargs,
                response_metadata: {},
            };
        }
        // Make sure the default value for additional_kwargs is passed into super() for serialization
        if (!fields.additional_kwargs) {
            // eslint-disable-next-line no-param-reassign
            fields.additional_kwargs = {};
        }
        if (!fields.response_metadata) {
            // eslint-disable-next-line no-param-reassign
            fields.response_metadata = {};
        }
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "messages"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        /** The content of the message. */
        Object.defineProperty(this, "content", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The name of the message sender in a multi-user chat. */
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Additional keyword arguments */
        Object.defineProperty(this, "additional_kwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Response metadata. For example: response headers, logprobs, token counts. */
        Object.defineProperty(this, "response_metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * An optional unique identifier for the message. This should ideally be
         * provided by the provider/model which created the message.
         */
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = fields.name;
        this.content = fields.content;
        this.additional_kwargs = fields.additional_kwargs;
        this.response_metadata = fields.response_metadata;
        this.id = fields.id;
    }
    toDict() {
        return {
            type: this._getType(),
            data: this.toJSON()
                .kwargs,
        };
    }
    static lc_name() {
        return "BaseMessage";
    }
    // Can't be protected for silly reasons
    get _printableFields() {
        return {
            id: this.id,
            content: this.content,
            name: this.name,
            additional_kwargs: this.additional_kwargs,
            response_metadata: this.response_metadata,
        };
    }
    // this private method is used to update the ID for the runtime
    // value as well as in lc_kwargs for serialisation
    _updateId(value) {
        this.id = value;
        // lc_attributes wouldn't work here, because jest compares the
        // whole object
        this.lc_kwargs.id = value;
    }
    get [Symbol.toStringTag]() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.constructor.lc_name();
    }
    // Override the default behavior of console.log
    [Symbol.for("nodejs.util.inspect.custom")](depth) {
        if (depth === null) {
            return this;
        }
        const printable = stringifyWithDepthLimit(this._printableFields, Math.max(4, depth));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return `${this.constructor.lc_name()} ${printable}`;
    }
}
function _mergeDicts(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
left, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
right
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    const merged = { ...left };
    for (const [key, value] of Object.entries(right)) {
        if (merged[key] == null) {
            merged[key] = value;
        }
        else if (value == null) {
            continue;
        }
        else if (typeof merged[key] !== typeof value ||
            Array.isArray(merged[key]) !== Array.isArray(value)) {
            throw new Error(`field[${key}] already exists in the message chunk, but with a different type.`);
        }
        else if (typeof merged[key] === "string") {
            if (key === "type") {
                // Do not merge 'type' fields
                continue;
            }
            merged[key] += value;
        }
        else if (typeof merged[key] === "object" && !Array.isArray(merged[key])) {
            merged[key] = _mergeDicts(merged[key], value);
        }
        else if (Array.isArray(merged[key])) {
            merged[key] = _mergeLists(merged[key], value);
        }
        else if (merged[key] === value) {
            continue;
        }
        else {
            console.warn(`field[${key}] already exists in this message chunk and value has unsupported type.`);
        }
    }
    return merged;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _mergeLists(left, right) {
    if (left === undefined && right === undefined) {
        return undefined;
    }
    else if (left === undefined || right === undefined) {
        return left || right;
    }
    else {
        const merged = [...left];
        for (const item of right) {
            if (typeof item === "object" &&
                "index" in item &&
                typeof item.index === "number") {
                const toMerge = merged.findIndex((leftItem) => leftItem.index === item.index);
                if (toMerge !== -1) {
                    merged[toMerge] = _mergeDicts(merged[toMerge], item);
                }
                else {
                    merged.push(item);
                }
            }
            else if (typeof item === "object" &&
                "text" in item &&
                item.text === "") {
                // No-op - skip empty text blocks
                continue;
            }
            else {
                merged.push(item);
            }
        }
        return merged;
    }
}
/**
 * Represents a chunk of a message, which can be concatenated with other
 * message chunks. It includes a method `_merge_kwargs_dict()` for merging
 * additional keyword arguments from another `BaseMessageChunk` into this
 * one. It also overrides the `__add__()` method to support concatenation
 * of `BaseMessageChunk` instances.
 */
class BaseMessageChunk extends BaseMessage {
}

/**
 * Represents a chunk of an AI message, which can be concatenated with
 * other AI message chunks.
 */
class AIMessageChunk extends BaseMessageChunk {
    constructor(fields) {
        let initParams;
        if (typeof fields === "string") {
            initParams = {
                content: fields,
                tool_calls: [],
                invalid_tool_calls: [],
                tool_call_chunks: [],
            };
        }
        else if (fields.tool_call_chunks === undefined) {
            initParams = {
                ...fields,
                tool_calls: fields.tool_calls ?? [],
                invalid_tool_calls: [],
                tool_call_chunks: [],
                usage_metadata: fields.usage_metadata !== undefined
                    ? fields.usage_metadata
                    : undefined,
            };
        }
        else {
            const toolCalls = [];
            const invalidToolCalls = [];
            for (const toolCallChunk of fields.tool_call_chunks) {
                let parsedArgs = {};
                try {
                    parsedArgs = parsePartialJson(toolCallChunk.args || "{}");
                    if (parsedArgs === null ||
                        typeof parsedArgs !== "object" ||
                        Array.isArray(parsedArgs)) {
                        throw new Error("Malformed tool call chunk args.");
                    }
                    toolCalls.push({
                        name: toolCallChunk.name ?? "",
                        args: parsedArgs,
                        id: toolCallChunk.id,
                        type: "tool_call",
                    });
                }
                catch (e) {
                    invalidToolCalls.push({
                        name: toolCallChunk.name,
                        args: toolCallChunk.args,
                        id: toolCallChunk.id,
                        error: "Malformed args.",
                        type: "invalid_tool_call",
                    });
                }
            }
            initParams = {
                ...fields,
                tool_calls: toolCalls,
                invalid_tool_calls: invalidToolCalls,
                usage_metadata: fields.usage_metadata !== undefined
                    ? fields.usage_metadata
                    : undefined,
            };
        }
        // Sadly, TypeScript only allows super() calls at root if the class has
        // properties with initializers, so we have to check types twice.
        super(initParams);
        // Must redeclare tool call fields since there is no multiple inheritance in JS.
        // These are typed as optional to avoid breaking changes and allow for casting
        // from BaseMessage.
        Object.defineProperty(this, "tool_calls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "invalid_tool_calls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "tool_call_chunks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /**
         * If provided, token usage information associated with the message.
         */
        Object.defineProperty(this, "usage_metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.tool_call_chunks =
            initParams.tool_call_chunks ?? this.tool_call_chunks;
        this.tool_calls = initParams.tool_calls ?? this.tool_calls;
        this.invalid_tool_calls =
            initParams.invalid_tool_calls ?? this.invalid_tool_calls;
        this.usage_metadata = initParams.usage_metadata;
    }
    get lc_aliases() {
        // exclude snake case conversion to pascal case
        return {
            ...super.lc_aliases,
            tool_calls: "tool_calls",
            invalid_tool_calls: "invalid_tool_calls",
            tool_call_chunks: "tool_call_chunks",
        };
    }
    static lc_name() {
        return "AIMessageChunk";
    }
    _getType() {
        return "ai";
    }
    get _printableFields() {
        return {
            ...super._printableFields,
            tool_calls: this.tool_calls,
            tool_call_chunks: this.tool_call_chunks,
            invalid_tool_calls: this.invalid_tool_calls,
            usage_metadata: this.usage_metadata,
        };
    }
    concat(chunk) {
        const combinedFields = {
            content: mergeContent(this.content, chunk.content),
            additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
            response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
            tool_call_chunks: [],
            id: this.id ?? chunk.id,
        };
        if (this.tool_call_chunks !== undefined ||
            chunk.tool_call_chunks !== undefined) {
            const rawToolCalls = _mergeLists(this.tool_call_chunks, chunk.tool_call_chunks);
            if (rawToolCalls !== undefined && rawToolCalls.length > 0) {
                combinedFields.tool_call_chunks = rawToolCalls;
            }
        }
        if (this.usage_metadata !== undefined ||
            chunk.usage_metadata !== undefined) {
            const inputTokenDetails = {
                ...((this.usage_metadata?.input_token_details?.audio !== undefined ||
                    chunk.usage_metadata?.input_token_details?.audio !== undefined) && {
                    audio: (this.usage_metadata?.input_token_details?.audio ?? 0) +
                        (chunk.usage_metadata?.input_token_details?.audio ?? 0),
                }),
                ...((this.usage_metadata?.input_token_details?.cache_read !==
                    undefined ||
                    chunk.usage_metadata?.input_token_details?.cache_read !==
                        undefined) && {
                    cache_read: (this.usage_metadata?.input_token_details?.cache_read ?? 0) +
                        (chunk.usage_metadata?.input_token_details?.cache_read ?? 0),
                }),
                ...((this.usage_metadata?.input_token_details?.cache_creation !==
                    undefined ||
                    chunk.usage_metadata?.input_token_details?.cache_creation !==
                        undefined) && {
                    cache_creation: (this.usage_metadata?.input_token_details?.cache_creation ?? 0) +
                        (chunk.usage_metadata?.input_token_details?.cache_creation ?? 0),
                }),
            };
            const outputTokenDetails = {
                ...((this.usage_metadata?.output_token_details?.audio !== undefined ||
                    chunk.usage_metadata?.output_token_details?.audio !== undefined) && {
                    audio: (this.usage_metadata?.output_token_details?.audio ?? 0) +
                        (chunk.usage_metadata?.output_token_details?.audio ?? 0),
                }),
                ...((this.usage_metadata?.output_token_details?.reasoning !==
                    undefined ||
                    chunk.usage_metadata?.output_token_details?.reasoning !==
                        undefined) && {
                    reasoning: (this.usage_metadata?.output_token_details?.reasoning ?? 0) +
                        (chunk.usage_metadata?.output_token_details?.reasoning ?? 0),
                }),
            };
            const left = this.usage_metadata ?? {
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
            };
            const right = chunk.usage_metadata ?? {
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
            };
            const usage_metadata = {
                input_tokens: left.input_tokens + right.input_tokens,
                output_tokens: left.output_tokens + right.output_tokens,
                total_tokens: left.total_tokens + right.total_tokens,
                // Do not include `input_token_details` / `output_token_details` keys in combined fields
                // unless their values are defined.
                ...(Object.keys(inputTokenDetails).length > 0 && {
                    input_token_details: inputTokenDetails,
                }),
                ...(Object.keys(outputTokenDetails).length > 0 && {
                    output_token_details: outputTokenDetails,
                }),
            };
            combinedFields.usage_metadata = usage_metadata;
        }
        return new AIMessageChunk(combinedFields);
    }
}

/**
 * This function is used by memory classes to get a string representation
 * of the chat message history, based on the message content and role.
 */
function getBufferString(messages, humanPrefix = "Human", aiPrefix = "AI") {
    const string_messages = [];
    for (const m of messages) {
        let role;
        if (m._getType() === "human") {
            role = humanPrefix;
        }
        else if (m._getType() === "ai") {
            role = aiPrefix;
        }
        else if (m._getType() === "system") {
            role = "System";
        }
        else if (m._getType() === "function") {
            role = "Function";
        }
        else if (m._getType() === "tool") {
            role = "Tool";
        }
        else if (m._getType() === "generic") {
            role = m.role;
        }
        else {
            throw new Error(`Got unsupported message type: ${m._getType()}`);
        }
        const nameStr = m.name ? `${m.name}, ` : "";
        const readableContent = typeof m.content === "string"
            ? m.content
            : JSON.stringify(m.content, null, 2);
        string_messages.push(`${role}: ${nameStr}${readableContent}`);
    }
    return string_messages.join("\n");
}

class LangChainTracer extends BaseTracer {
    constructor(fields = {}) {
        super(fields);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "langchain_tracer"
        });
        Object.defineProperty(this, "projectName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "exampleId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const { exampleId, projectName, client } = fields;
        this.projectName =
            projectName ??
                getEnvironmentVariable("LANGCHAIN_PROJECT") ??
                getEnvironmentVariable("LANGCHAIN_SESSION");
        this.exampleId = exampleId;
        const clientParams = getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false"
            ? {
                // LangSmith has its own backgrounding system
                blockOnRootRunFinalization: true,
            }
            : {};
        this.client = client ?? new Client(clientParams);
        const traceableTree = LangChainTracer.getTraceableRunTree();
        if (traceableTree) {
            this.updateFromRunTree(traceableTree);
        }
    }
    async _convertToCreate(run, example_id = undefined) {
        return {
            ...run,
            extra: {
                ...run.extra,
                runtime: await getRuntimeEnvironment(),
            },
            child_runs: undefined,
            session_name: this.projectName,
            reference_example_id: run.parent_run_id ? undefined : example_id,
        };
    }
    async persistRun(_run) { }
    async onRunCreate(run) {
        const persistedRun = await this._convertToCreate(run, this.exampleId);
        await this.client.createRun(persistedRun);
    }
    async onRunUpdate(run) {
        const runUpdate = {
            end_time: run.end_time,
            error: run.error,
            outputs: run.outputs,
            events: run.events,
            inputs: run.inputs,
            trace_id: run.trace_id,
            dotted_order: run.dotted_order,
            parent_run_id: run.parent_run_id,
        };
        await this.client.updateRun(run.id, runUpdate);
    }
    getRun(id) {
        return this.runMap.get(id);
    }
    updateFromRunTree(runTree) {
        let rootRun = runTree;
        const visited = new Set();
        while (rootRun.parent_run) {
            if (visited.has(rootRun.id))
                break;
            visited.add(rootRun.id);
            if (!rootRun.parent_run)
                break;
            rootRun = rootRun.parent_run;
        }
        visited.clear();
        const queue = [rootRun];
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current || visited.has(current.id))
                continue;
            visited.add(current.id);
            // @ts-expect-error Types of property 'events' are incompatible.
            this.runMap.set(current.id, current);
            if (current.child_runs) {
                queue.push(...current.child_runs);
            }
        }
        this.client = runTree.client ?? this.client;
        this.projectName = runTree.project_name ?? this.projectName;
        this.exampleId = runTree.reference_example_id ?? this.exampleId;
    }
    convertToRunTree(id) {
        const runTreeMap = {};
        const runTreeList = [];
        for (const [id, run] of this.runMap) {
            // by converting the run map to a run tree, we are doing a copy
            // thus, any mutation performed on the run tree will not be reflected
            // back in the run map
            // TODO: Stop using `this.runMap` in favour of LangSmith's `RunTree`
            const runTree = new RunTree({
                ...run,
                child_runs: [],
                parent_run: undefined,
                // inherited properties
                client: this.client,
                project_name: this.projectName,
                reference_example_id: this.exampleId,
                tracingEnabled: true,
            });
            runTreeMap[id] = runTree;
            runTreeList.push([id, run.dotted_order]);
        }
        runTreeList.sort((a, b) => {
            if (!a[1] || !b[1])
                return 0;
            return a[1].localeCompare(b[1]);
        });
        for (const [id] of runTreeList) {
            const run = this.runMap.get(id);
            const runTree = runTreeMap[id];
            if (!run || !runTree)
                continue;
            if (run.parent_run_id) {
                const parentRunTree = runTreeMap[run.parent_run_id];
                if (parentRunTree) {
                    parentRunTree.child_runs.push(runTree);
                    runTree.parent_run = parentRunTree;
                }
            }
        }
        return runTreeMap[id];
    }
    static getTraceableRunTree() {
        try {
            return getCurrentRunTree();
        }
        catch {
            return undefined;
        }
    }
}

let queue;
/**
 * Creates a queue using the p-queue library. The queue is configured to
 * auto-start and has a concurrency of 1, meaning it will process tasks
 * one at a time.
 */
function createQueue() {
    const PQueue = "default" in PQueueMod ? PQueueMod.default : PQueueMod;
    return new PQueue({
        autoStart: true,
        concurrency: 1,
    });
}
/**
 * Consume a promise, either adding it to the queue or waiting for it to resolve
 * @param promiseFn Promise to consume
 * @param wait Whether to wait for the promise to resolve or resolve immediately
 */
async function consumeCallback(promiseFn, wait) {
    if (wait === true) {
        await promiseFn();
    }
    else {
        if (typeof queue === "undefined") {
            queue = createQueue();
        }
        void queue.add(promiseFn);
    }
}

const isTracingEnabled = (tracingEnabled) => {
    const envVars = [
        "LANGSMITH_TRACING_V2",
        "LANGCHAIN_TRACING_V2",
        "LANGSMITH_TRACING",
        "LANGCHAIN_TRACING",
    ];
    return !!envVars.find((envVar) => getEnvironmentVariable(envVar) === "true");
};

/**
 * Manage callbacks from different components of LangChain.
 */
class BaseCallbackManager {
    setHandler(handler) {
        return this.setHandlers([handler]);
    }
}
/**
 * Base class for run manager in LangChain.
 */
class BaseRunManager {
    constructor(runId, handlers, inheritableHandlers, tags, inheritableTags, metadata, inheritableMetadata, _parentRunId) {
        Object.defineProperty(this, "runId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: runId
        });
        Object.defineProperty(this, "handlers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: handlers
        });
        Object.defineProperty(this, "inheritableHandlers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: inheritableHandlers
        });
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: tags
        });
        Object.defineProperty(this, "inheritableTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: inheritableTags
        });
        Object.defineProperty(this, "metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: metadata
        });
        Object.defineProperty(this, "inheritableMetadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: inheritableMetadata
        });
        Object.defineProperty(this, "_parentRunId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _parentRunId
        });
    }
    get parentRunId() {
        return this._parentRunId;
    }
    async handleText(text) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            try {
                await handler.handleText?.(text, this.runId, this._parentRunId, this.tags);
            }
            catch (err) {
                const logFunction = handler.raiseError
                    ? console.error
                    : console.warn;
                logFunction(`Error in handler ${handler.constructor.name}, handleText: ${err}`);
                if (handler.raiseError) {
                    throw err;
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleCustomEvent(eventName, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data, _runId, _tags, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _metadata) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            try {
                await handler.handleCustomEvent?.(eventName, data, this.runId, this.tags, this.metadata);
            }
            catch (err) {
                const logFunction = handler.raiseError
                    ? console.error
                    : console.warn;
                logFunction(`Error in handler ${handler.constructor.name}, handleCustomEvent: ${err}`);
                if (handler.raiseError) {
                    throw err;
                }
            }
        }, handler.awaitHandlers)));
    }
}
/**
 * Manages callbacks for retriever runs.
 */
class CallbackManagerForRetrieverRun extends BaseRunManager {
    getChild(tag) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const manager = new CallbackManager(this.runId);
        manager.setHandlers(this.inheritableHandlers);
        manager.addTags(this.inheritableTags);
        manager.addMetadata(this.inheritableMetadata);
        if (tag) {
            manager.addTags([tag], false);
        }
        return manager;
    }
    async handleRetrieverEnd(documents) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreRetriever) {
                try {
                    await handler.handleRetrieverEnd?.(documents, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleRetriever`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleRetrieverError(err) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreRetriever) {
                try {
                    await handler.handleRetrieverError?.(err, this.runId, this._parentRunId, this.tags);
                }
                catch (error) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleRetrieverError: ${error}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
}
class CallbackManagerForLLMRun extends BaseRunManager {
    async handleLLMNewToken(token, idx, _runId, _parentRunId, _tags, fields) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreLLM) {
                try {
                    await handler.handleLLMNewToken?.(token, idx ?? { prompt: 0, completion: 0 }, this.runId, this._parentRunId, this.tags, fields);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleLLMNewToken: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleLLMError(err) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreLLM) {
                try {
                    await handler.handleLLMError?.(err, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleLLMError: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleLLMEnd(output) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreLLM) {
                try {
                    await handler.handleLLMEnd?.(output, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleLLMEnd: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
}
class CallbackManagerForChainRun extends BaseRunManager {
    getChild(tag) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const manager = new CallbackManager(this.runId);
        manager.setHandlers(this.inheritableHandlers);
        manager.addTags(this.inheritableTags);
        manager.addMetadata(this.inheritableMetadata);
        if (tag) {
            manager.addTags([tag], false);
        }
        return manager;
    }
    async handleChainError(err, _runId, _parentRunId, _tags, kwargs) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreChain) {
                try {
                    await handler.handleChainError?.(err, this.runId, this._parentRunId, this.tags, kwargs);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleChainError: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleChainEnd(output, _runId, _parentRunId, _tags, kwargs) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreChain) {
                try {
                    await handler.handleChainEnd?.(output, this.runId, this._parentRunId, this.tags, kwargs);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleChainEnd: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleAgentAction(action) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreAgent) {
                try {
                    await handler.handleAgentAction?.(action, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleAgentAction: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    async handleAgentEnd(action) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreAgent) {
                try {
                    await handler.handleAgentEnd?.(action, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleAgentEnd: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
}
class CallbackManagerForToolRun extends BaseRunManager {
    getChild(tag) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const manager = new CallbackManager(this.runId);
        manager.setHandlers(this.inheritableHandlers);
        manager.addTags(this.inheritableTags);
        manager.addMetadata(this.inheritableMetadata);
        if (tag) {
            manager.addTags([tag], false);
        }
        return manager;
    }
    async handleToolError(err) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreAgent) {
                try {
                    await handler.handleToolError?.(err, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleToolError: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleToolEnd(output) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreAgent) {
                try {
                    await handler.handleToolEnd?.(output, this.runId, this._parentRunId, this.tags);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleToolEnd: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
}
/**
 * @example
 * ```typescript
 * const prompt = PromptTemplate.fromTemplate("What is the answer to {question}?");
 *
 * // Example of using LLMChain with OpenAI and a simple prompt
 * const chain = new LLMChain({
 *   llm: new ChatOpenAI({ temperature: 0.9 }),
 *   prompt,
 * });
 *
 * // Running the chain with a single question
 * const result = await chain.call({
 *   question: "What is the airspeed velocity of an unladen swallow?",
 * });
 * console.log("The answer is:", result);
 * ```
 */
class CallbackManager extends BaseCallbackManager {
    constructor(parentRunId, options) {
        super();
        Object.defineProperty(this, "handlers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "inheritableHandlers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "inheritableTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "inheritableMetadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "callback_manager"
        });
        Object.defineProperty(this, "_parentRunId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.handlers = options?.handlers ?? this.handlers;
        this.inheritableHandlers =
            options?.inheritableHandlers ?? this.inheritableHandlers;
        this.tags = options?.tags ?? this.tags;
        this.inheritableTags = options?.inheritableTags ?? this.inheritableTags;
        this.metadata = options?.metadata ?? this.metadata;
        this.inheritableMetadata =
            options?.inheritableMetadata ?? this.inheritableMetadata;
        this._parentRunId = parentRunId;
    }
    /**
     * Gets the parent run ID, if any.
     *
     * @returns The parent run ID.
     */
    getParentRunId() {
        return this._parentRunId;
    }
    async handleLLMStart(llm, prompts, runId = undefined, _parentRunId = undefined, extraParams = undefined, _tags = undefined, _metadata = undefined, runName = undefined) {
        return Promise.all(prompts.map(async (prompt, idx) => {
            // Can't have duplicate runs with the same run ID (if provided)
            const runId_ = idx === 0 && runId ? runId : v4();
            await Promise.all(this.handlers.map((handler) => {
                if (handler.ignoreLLM) {
                    return;
                }
                if (isBaseTracer(handler)) {
                    // Create and add run to the run map.
                    // We do this synchronously to avoid race conditions
                    // when callbacks are backgrounded.
                    handler._createRunForLLMStart(llm, [prompt], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
                }
                return consumeCallback(async () => {
                    try {
                        await handler.handleLLMStart?.(llm, [prompt], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
                    }
                    catch (err) {
                        const logFunction = handler.raiseError
                            ? console.error
                            : console.warn;
                        logFunction(`Error in handler ${handler.constructor.name}, handleLLMStart: ${err}`);
                        if (handler.raiseError) {
                            throw err;
                        }
                    }
                }, handler.awaitHandlers);
            }));
            return new CallbackManagerForLLMRun(runId_, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
        }));
    }
    async handleChatModelStart(llm, messages, runId = undefined, _parentRunId = undefined, extraParams = undefined, _tags = undefined, _metadata = undefined, runName = undefined) {
        return Promise.all(messages.map(async (messageGroup, idx) => {
            // Can't have duplicate runs with the same run ID (if provided)
            const runId_ = idx === 0 && runId ? runId : v4();
            await Promise.all(this.handlers.map((handler) => {
                if (handler.ignoreLLM) {
                    return;
                }
                if (isBaseTracer(handler)) {
                    // Create and add run to the run map.
                    // We do this synchronously to avoid race conditions
                    // when callbacks are backgrounded.
                    handler._createRunForChatModelStart(llm, [messageGroup], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
                }
                return consumeCallback(async () => {
                    try {
                        if (handler.handleChatModelStart) {
                            await handler.handleChatModelStart?.(llm, [messageGroup], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
                        }
                        else if (handler.handleLLMStart) {
                            const messageString = getBufferString(messageGroup);
                            await handler.handleLLMStart?.(llm, [messageString], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
                        }
                    }
                    catch (err) {
                        const logFunction = handler.raiseError
                            ? console.error
                            : console.warn;
                        logFunction(`Error in handler ${handler.constructor.name}, handleLLMStart: ${err}`);
                        if (handler.raiseError) {
                            throw err;
                        }
                    }
                }, handler.awaitHandlers);
            }));
            return new CallbackManagerForLLMRun(runId_, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
        }));
    }
    async handleChainStart(chain, inputs, runId = v4(), runType = undefined, _tags = undefined, _metadata = undefined, runName = undefined) {
        await Promise.all(this.handlers.map((handler) => {
            if (handler.ignoreChain) {
                return;
            }
            if (isBaseTracer(handler)) {
                // Create and add run to the run map.
                // We do this synchronously to avoid race conditions
                // when callbacks are backgrounded.
                handler._createRunForChainStart(chain, inputs, runId, this._parentRunId, this.tags, this.metadata, runType, runName);
            }
            return consumeCallback(async () => {
                try {
                    await handler.handleChainStart?.(chain, inputs, runId, this._parentRunId, this.tags, this.metadata, runType, runName);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleChainStart: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }, handler.awaitHandlers);
        }));
        return new CallbackManagerForChainRun(runId, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
    }
    async handleToolStart(tool, input, runId = v4(), _parentRunId = undefined, _tags = undefined, _metadata = undefined, runName = undefined) {
        await Promise.all(this.handlers.map((handler) => {
            if (handler.ignoreAgent) {
                return;
            }
            if (isBaseTracer(handler)) {
                // Create and add run to the run map.
                // We do this synchronously to avoid race conditions
                // when callbacks are backgrounded.
                handler._createRunForToolStart(tool, input, runId, this._parentRunId, this.tags, this.metadata, runName);
            }
            return consumeCallback(async () => {
                try {
                    await handler.handleToolStart?.(tool, input, runId, this._parentRunId, this.tags, this.metadata, runName);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleToolStart: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }, handler.awaitHandlers);
        }));
        return new CallbackManagerForToolRun(runId, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
    }
    async handleRetrieverStart(retriever, query, runId = v4(), _parentRunId = undefined, _tags = undefined, _metadata = undefined, runName = undefined) {
        await Promise.all(this.handlers.map((handler) => {
            if (handler.ignoreRetriever) {
                return;
            }
            if (isBaseTracer(handler)) {
                // Create and add run to the run map.
                // We do this synchronously to avoid race conditions
                // when callbacks are backgrounded.
                handler._createRunForRetrieverStart(retriever, query, runId, this._parentRunId, this.tags, this.metadata, runName);
            }
            return consumeCallback(async () => {
                try {
                    await handler.handleRetrieverStart?.(retriever, query, runId, this._parentRunId, this.tags, this.metadata, runName);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleRetrieverStart: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }, handler.awaitHandlers);
        }));
        return new CallbackManagerForRetrieverRun(runId, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
    }
    async handleCustomEvent(eventName, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data, runId, _tags, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _metadata) {
        await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
            if (!handler.ignoreCustomEvent) {
                try {
                    await handler.handleCustomEvent?.(eventName, data, runId, this.tags, this.metadata);
                }
                catch (err) {
                    const logFunction = handler.raiseError
                        ? console.error
                        : console.warn;
                    logFunction(`Error in handler ${handler.constructor.name}, handleCustomEvent: ${err}`);
                    if (handler.raiseError) {
                        throw err;
                    }
                }
            }
        }, handler.awaitHandlers)));
    }
    addHandler(handler, inherit = true) {
        this.handlers.push(handler);
        if (inherit) {
            this.inheritableHandlers.push(handler);
        }
    }
    removeHandler(handler) {
        this.handlers = this.handlers.filter((_handler) => _handler !== handler);
        this.inheritableHandlers = this.inheritableHandlers.filter((_handler) => _handler !== handler);
    }
    setHandlers(handlers, inherit = true) {
        this.handlers = [];
        this.inheritableHandlers = [];
        for (const handler of handlers) {
            this.addHandler(handler, inherit);
        }
    }
    addTags(tags, inherit = true) {
        this.removeTags(tags); // Remove duplicates
        this.tags.push(...tags);
        if (inherit) {
            this.inheritableTags.push(...tags);
        }
    }
    removeTags(tags) {
        this.tags = this.tags.filter((tag) => !tags.includes(tag));
        this.inheritableTags = this.inheritableTags.filter((tag) => !tags.includes(tag));
    }
    addMetadata(metadata, inherit = true) {
        this.metadata = { ...this.metadata, ...metadata };
        if (inherit) {
            this.inheritableMetadata = { ...this.inheritableMetadata, ...metadata };
        }
    }
    removeMetadata(metadata) {
        for (const key of Object.keys(metadata)) {
            delete this.metadata[key];
            delete this.inheritableMetadata[key];
        }
    }
    copy(additionalHandlers = [], inherit = true) {
        const manager = new CallbackManager(this._parentRunId);
        for (const handler of this.handlers) {
            const inheritable = this.inheritableHandlers.includes(handler);
            manager.addHandler(handler, inheritable);
        }
        for (const tag of this.tags) {
            const inheritable = this.inheritableTags.includes(tag);
            manager.addTags([tag], inheritable);
        }
        for (const key of Object.keys(this.metadata)) {
            const inheritable = Object.keys(this.inheritableMetadata).includes(key);
            manager.addMetadata({ [key]: this.metadata[key] }, inheritable);
        }
        for (const handler of additionalHandlers) {
            if (
            // Prevent multiple copies of console_callback_handler
            manager.handlers
                .filter((h) => h.name === "console_callback_handler")
                .some((h) => h.name === handler.name)) {
                continue;
            }
            manager.addHandler(handler, inherit);
        }
        return manager;
    }
    static fromHandlers(handlers) {
        class Handler extends BaseCallbackHandler {
            constructor() {
                super();
                Object.defineProperty(this, "name", {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: v4()
                });
                Object.assign(this, handlers);
            }
        }
        const manager = new this();
        manager.addHandler(new Handler());
        return manager;
    }
    static configure(inheritableHandlers, localHandlers, inheritableTags, localTags, inheritableMetadata, localMetadata, options) {
        return this._configureSync(inheritableHandlers, localHandlers, inheritableTags, localTags, inheritableMetadata, localMetadata, options);
    }
    // TODO: Deprecate async method in favor of this one.
    static _configureSync(inheritableHandlers, localHandlers, inheritableTags, localTags, inheritableMetadata, localMetadata, options) {
        let callbackManager;
        if (inheritableHandlers || localHandlers) {
            if (Array.isArray(inheritableHandlers) || !inheritableHandlers) {
                callbackManager = new CallbackManager();
                callbackManager.setHandlers(inheritableHandlers?.map(ensureHandler) ?? [], true);
            }
            else {
                callbackManager = inheritableHandlers;
            }
            callbackManager = callbackManager.copy(Array.isArray(localHandlers)
                ? localHandlers.map(ensureHandler)
                : localHandlers?.handlers, false);
        }
        const verboseEnabled = getEnvironmentVariable("LANGCHAIN_VERBOSE") === "true" ||
            options?.verbose;
        const tracingV2Enabled = LangChainTracer.getTraceableRunTree()?.tracingEnabled ||
            isTracingEnabled();
        const tracingEnabled = tracingV2Enabled ||
            (getEnvironmentVariable("LANGCHAIN_TRACING") ?? false);
        if (verboseEnabled || tracingEnabled) {
            if (!callbackManager) {
                callbackManager = new CallbackManager();
            }
            if (verboseEnabled &&
                !callbackManager.handlers.some((handler) => handler.name === ConsoleCallbackHandler.prototype.name)) {
                const consoleHandler = new ConsoleCallbackHandler();
                callbackManager.addHandler(consoleHandler, true);
            }
            if (tracingEnabled &&
                !callbackManager.handlers.some((handler) => handler.name === "langchain_tracer")) {
                if (tracingV2Enabled) {
                    const tracerV2 = new LangChainTracer();
                    callbackManager.addHandler(tracerV2, true);
                    // handoff between langchain and langsmith/traceable
                    // override the parent run ID
                    callbackManager._parentRunId =
                        LangChainTracer.getTraceableRunTree()?.id ??
                            callbackManager._parentRunId;
                }
            }
        }
        if (inheritableTags || localTags) {
            if (callbackManager) {
                callbackManager.addTags(inheritableTags ?? []);
                callbackManager.addTags(localTags ?? [], false);
            }
        }
        if (inheritableMetadata || localMetadata) {
            if (callbackManager) {
                callbackManager.addMetadata(inheritableMetadata ?? {});
                callbackManager.addMetadata(localMetadata ?? {}, false);
            }
        }
        return callbackManager;
    }
}
function ensureHandler(handler) {
    if ("name" in handler) {
        return handler;
    }
    return BaseCallbackHandler.fromMethods(handler);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
class MockAsyncLocalStorage {
    getStore() {
        return undefined;
    }
    run(_store, callback) {
        return callback();
    }
    enterWith(_store) {
        return undefined;
    }
}
const mockAsyncLocalStorage = new MockAsyncLocalStorage();
const TRACING_ALS_KEY = Symbol.for("ls:tracing_async_local_storage");
const LC_CHILD_KEY = Symbol.for("lc:child_config");
const _CONTEXT_VARIABLES_KEY = Symbol.for("lc:context_variables");
class AsyncLocalStorageProvider {
    getInstance() {
        return globalThis[TRACING_ALS_KEY] ?? mockAsyncLocalStorage;
    }
    getRunnableConfig() {
        const storage = this.getInstance();
        // this has the runnable config
        // which means that we should also have an instance of a LangChainTracer
        // with the run map prepopulated
        return storage.getStore()?.extra?.[LC_CHILD_KEY];
    }
    runWithConfig(config, callback, avoidCreatingRootRunTree) {
        const callbackManager = CallbackManager._configureSync(config?.callbacks, undefined, config?.tags, undefined, config?.metadata);
        const storage = this.getInstance();
        const previousValue = storage.getStore();
        const parentRunId = callbackManager?.getParentRunId();
        const langChainTracer = callbackManager?.handlers?.find((handler) => handler?.name === "langchain_tracer");
        let runTree;
        if (langChainTracer && parentRunId) {
            runTree = langChainTracer.convertToRunTree(parentRunId);
        }
        else if (!avoidCreatingRootRunTree) {
            runTree = new RunTree({
                name: "<runnable_lambda>",
                tracingEnabled: false,
            });
        }
        if (runTree) {
            runTree.extra = { ...runTree.extra, [LC_CHILD_KEY]: config };
        }
        if (previousValue !== undefined &&
            previousValue[_CONTEXT_VARIABLES_KEY] !== undefined) {
            runTree[_CONTEXT_VARIABLES_KEY] =
                previousValue[_CONTEXT_VARIABLES_KEY];
        }
        return storage.run(runTree, callback);
    }
    initializeGlobalInstance(instance) {
        if (globalThis[TRACING_ALS_KEY] === undefined) {
            globalThis[TRACING_ALS_KEY] = instance;
        }
    }
}
const AsyncLocalStorageProviderSingleton = new AsyncLocalStorageProvider();

async function raceWithSignal(promise, signal) {
    if (signal === undefined) {
        return promise;
    }
    let listener;
    return Promise.race([
        promise.catch((err) => {
            if (!signal?.aborted) {
                throw err;
            }
            else {
                return undefined;
            }
        }),
        new Promise((_, reject) => {
            listener = () => {
                reject(new Error("Aborted"));
            };
            signal.addEventListener("abort", listener);
            // Must be here inside the promise to avoid a race condition
            if (signal.aborted) {
                reject(new Error("Aborted"));
            }
        }),
    ]).finally(() => signal.removeEventListener("abort", listener));
}

/*
 * Support async iterator syntax for ReadableStreams in all environments.
 * Source: https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
class IterableReadableStream extends ReadableStream {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "reader", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    ensureReader() {
        if (!this.reader) {
            this.reader = this.getReader();
        }
    }
    async next() {
        this.ensureReader();
        try {
            const result = await this.reader.read();
            if (result.done) {
                this.reader.releaseLock(); // release lock when stream becomes closed
                return {
                    done: true,
                    value: undefined,
                };
            }
            else {
                return {
                    done: false,
                    value: result.value,
                };
            }
        }
        catch (e) {
            this.reader.releaseLock(); // release lock when stream becomes errored
            throw e;
        }
    }
    async return() {
        this.ensureReader();
        // If wrapped in a Node stream, cancel is already called.
        if (this.locked) {
            const cancelPromise = this.reader.cancel(); // cancel first, but don't await yet
            this.reader.releaseLock(); // release lock first
            await cancelPromise; // now await it
        }
        return { done: true, value: undefined };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async throw(e) {
        this.ensureReader();
        if (this.locked) {
            const cancelPromise = this.reader.cancel(); // cancel first, but don't await yet
            this.reader.releaseLock(); // release lock first
            await cancelPromise; // now await it
        }
        throw e;
    }
    [Symbol.asyncIterator]() {
        return this;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Not present in Node 18 types, required in latest Node 22
    async [Symbol.asyncDispose]() {
        await this.return();
    }
    static fromReadableStream(stream) {
        // From https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#reading_the_stream
        const reader = stream.getReader();
        return new IterableReadableStream({
            start(controller) {
                return pump();
                function pump() {
                    return reader.read().then(({ done, value }) => {
                        // When no more data needs to be consumed, close the stream
                        if (done) {
                            controller.close();
                            return;
                        }
                        // Enqueue the next data chunk into our target stream
                        controller.enqueue(value);
                        return pump();
                    });
                }
            },
            cancel() {
                reader.releaseLock();
            },
        });
    }
    static fromAsyncGenerator(generator) {
        return new IterableReadableStream({
            async pull(controller) {
                const { value, done } = await generator.next();
                // When no more data needs to be consumed, close the stream
                if (done) {
                    controller.close();
                }
                // Fix: `else if (value)` will hang the streaming when nullish value (e.g. empty string) is pulled
                controller.enqueue(value);
            },
            async cancel(reason) {
                await generator.return(reason);
            },
        });
    }
}
function atee(iter, length = 2) {
    const buffers = Array.from({ length }, () => []);
    return buffers.map(async function* makeIter(buffer) {
        while (true) {
            if (buffer.length === 0) {
                const result = await iter.next();
                for (const buffer of buffers) {
                    buffer.push(result);
                }
            }
            else if (buffer[0].done) {
                return;
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                yield buffer.shift().value;
            }
        }
    });
}
function concat(first, second) {
    if (Array.isArray(first) && Array.isArray(second)) {
        return first.concat(second);
    }
    else if (typeof first === "string" && typeof second === "string") {
        return (first + second);
    }
    else if (typeof first === "number" && typeof second === "number") {
        return (first + second);
    }
    else if (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "concat" in first &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof first.concat === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return first.concat(second);
    }
    else if (typeof first === "object" && typeof second === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chunk = { ...first };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [key, value] of Object.entries(second)) {
            if (key in chunk && !Array.isArray(chunk[key])) {
                chunk[key] = concat(chunk[key], value);
            }
            else {
                chunk[key] = value;
            }
        }
        return chunk;
    }
    else {
        throw new Error(`Cannot concat ${typeof first} and ${typeof second}`);
    }
}
class AsyncGeneratorWithSetup {
    constructor(params) {
        Object.defineProperty(this, "generator", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "setup", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "signal", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "firstResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "firstResultUsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.generator = params.generator;
        this.config = params.config;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.signal = params.signal ?? this.config?.signal;
        // setup is a promise that resolves only after the first iterator value
        // is available. this is useful when setup of several piped generators
        // needs to happen in logical order, ie. in the order in which input to
        // to each generator is available.
        this.setup = new Promise((resolve, reject) => {
            void AsyncLocalStorageProviderSingleton.runWithConfig(params.config, async () => {
                this.firstResult = params.generator.next();
                if (params.startSetup) {
                    this.firstResult.then(params.startSetup).then(resolve, reject);
                }
                else {
                    this.firstResult.then((_result) => resolve(undefined), reject);
                }
            }, true);
        });
    }
    async next(...args) {
        this.signal?.throwIfAborted();
        if (!this.firstResultUsed) {
            this.firstResultUsed = true;
            return this.firstResult;
        }
        return AsyncLocalStorageProviderSingleton.runWithConfig(this.config, this.signal
            ? async () => {
                return raceWithSignal(this.generator.next(...args), this.signal);
            }
            : async () => {
                return this.generator.next(...args);
            }, true);
    }
    async return(value) {
        return this.generator.return(value);
    }
    async throw(e) {
        return this.generator.throw(e);
    }
    [Symbol.asyncIterator]() {
        return this;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Not present in Node 18 types, required in latest Node 22
    async [Symbol.asyncDispose]() {
        await this.return();
    }
}
async function pipeGeneratorWithSetup(to, generator, startSetup, signal, ...args) {
    const gen = new AsyncGeneratorWithSetup({
        generator,
        startSetup,
        signal,
    });
    const setup = await gen.setup;
    return { output: to(gen, setup, ...args), setup };
}

/**
 * List of jsonpatch JSONPatchOperations, which describe how to create the run state
 * from an empty dict. This is the minimal representation of the log, designed to
 * be serialized as JSON and sent over the wire to reconstruct the log on the other
 * side. Reconstruction of the state can be done with any jsonpatch-compliant library,
 * see https://jsonpatch.com for more information.
 */
class RunLogPatch {
    constructor(fields) {
        Object.defineProperty(this, "ops", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.ops = fields.ops ?? [];
    }
    concat(other) {
        const ops = this.ops.concat(other.ops);
        const states = applyPatch({}, ops);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunLog({
            ops,
            state: states[states.length - 1].newDocument,
        });
    }
}
class RunLog extends RunLogPatch {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.state = fields.state;
    }
    concat(other) {
        const ops = this.ops.concat(other.ops);
        const states = applyPatch(this.state, other.ops);
        return new RunLog({ ops, state: states[states.length - 1].newDocument });
    }
    static fromRunLogPatch(patch) {
        const states = applyPatch({}, patch.ops);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunLog({
            ops: patch.ops,
            state: states[states.length - 1].newDocument,
        });
    }
}
const isLogStreamHandler = (handler) => handler.name === "log_stream_tracer";
/**
 * Extract standardized inputs from a run.
 *
 * Standardizes the inputs based on the type of the runnable used.
 *
 * @param run - Run object
 * @param schemaFormat - The schema format to use.
 *
 * @returns Valid inputs are only dict. By conventions, inputs always represented
 * invocation using named arguments.
 * A null means that the input is not yet known!
 */
async function _getStandardizedInputs(run, schemaFormat) {
    if (schemaFormat === "original") {
        throw new Error("Do not assign inputs with original schema drop the key for now. " +
            "When inputs are added to streamLog they should be added with " +
            "standardized schema for streaming events.");
    }
    const { inputs } = run;
    if (["retriever", "llm", "prompt"].includes(run.run_type)) {
        return inputs;
    }
    if (Object.keys(inputs).length === 1 && inputs?.input === "") {
        return undefined;
    }
    // new style chains
    // These nest an additional 'input' key inside the 'inputs' to make sure
    // the input is always a dict. We need to unpack and user the inner value.
    // We should try to fix this in Runnables and callbacks/tracers
    // Runnables should be using a null type here not a placeholder
    // dict.
    return inputs.input;
}
async function _getStandardizedOutputs(run, schemaFormat) {
    const { outputs } = run;
    if (schemaFormat === "original") {
        // Return the old schema, without standardizing anything
        return outputs;
    }
    if (["retriever", "llm", "prompt"].includes(run.run_type)) {
        return outputs;
    }
    // TODO: Remove this hacky check
    if (outputs !== undefined &&
        Object.keys(outputs).length === 1 &&
        outputs?.output !== undefined) {
        return outputs.output;
    }
    return outputs;
}
function isChatGenerationChunk(x) {
    return x !== undefined && x.message !== undefined;
}
/**
 * Class that extends the `BaseTracer` class from the
 * `langchain.callbacks.tracers.base` module. It represents a callback
 * handler that logs the execution of runs and emits `RunLog` instances to a
 * `RunLogStream`.
 */
class LogStreamCallbackHandler extends BaseTracer {
    constructor(fields) {
        super({ _awaitHandler: true, ...fields });
        Object.defineProperty(this, "autoClose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "includeNames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "includeTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "includeTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeNames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_schemaFormat", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "original"
        });
        Object.defineProperty(this, "rootId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "keyMapByRunId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "counterMapByRunName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "transformStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "writer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "receiveStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "log_stream_tracer"
        });
        this.autoClose = fields?.autoClose ?? true;
        this.includeNames = fields?.includeNames;
        this.includeTypes = fields?.includeTypes;
        this.includeTags = fields?.includeTags;
        this.excludeNames = fields?.excludeNames;
        this.excludeTypes = fields?.excludeTypes;
        this.excludeTags = fields?.excludeTags;
        this._schemaFormat = fields?._schemaFormat ?? this._schemaFormat;
        this.transformStream = new TransformStream();
        this.writer = this.transformStream.writable.getWriter();
        this.receiveStream = IterableReadableStream.fromReadableStream(this.transformStream.readable);
    }
    [Symbol.asyncIterator]() {
        return this.receiveStream;
    }
    async persistRun(_run) {
        // This is a legacy method only called once for an entire run tree
        // and is therefore not useful here
    }
    _includeRun(run) {
        if (run.id === this.rootId) {
            return false;
        }
        const runTags = run.tags ?? [];
        let include = this.includeNames === undefined &&
            this.includeTags === undefined &&
            this.includeTypes === undefined;
        if (this.includeNames !== undefined) {
            include = include || this.includeNames.includes(run.name);
        }
        if (this.includeTypes !== undefined) {
            include = include || this.includeTypes.includes(run.run_type);
        }
        if (this.includeTags !== undefined) {
            include =
                include ||
                    runTags.find((tag) => this.includeTags?.includes(tag)) !== undefined;
        }
        if (this.excludeNames !== undefined) {
            include = include && !this.excludeNames.includes(run.name);
        }
        if (this.excludeTypes !== undefined) {
            include = include && !this.excludeTypes.includes(run.run_type);
        }
        if (this.excludeTags !== undefined) {
            include =
                include && runTags.every((tag) => !this.excludeTags?.includes(tag));
        }
        return include;
    }
    async *tapOutputIterable(runId, output) {
        // Tap an output async iterator to stream its values to the log.
        for await (const chunk of output) {
            // root run is handled in .streamLog()
            if (runId !== this.rootId) {
                // if we can't find the run silently ignore
                // eg. because this run wasn't included in the log
                const key = this.keyMapByRunId[runId];
                if (key) {
                    await this.writer.write(new RunLogPatch({
                        ops: [
                            {
                                op: "add",
                                path: `/logs/${key}/streamed_output/-`,
                                value: chunk,
                            },
                        ],
                    }));
                }
            }
            yield chunk;
        }
    }
    async onRunCreate(run) {
        if (this.rootId === undefined) {
            this.rootId = run.id;
            await this.writer.write(new RunLogPatch({
                ops: [
                    {
                        op: "replace",
                        path: "",
                        value: {
                            id: run.id,
                            name: run.name,
                            type: run.run_type,
                            streamed_output: [],
                            final_output: undefined,
                            logs: {},
                        },
                    },
                ],
            }));
        }
        if (!this._includeRun(run)) {
            return;
        }
        if (this.counterMapByRunName[run.name] === undefined) {
            this.counterMapByRunName[run.name] = 0;
        }
        this.counterMapByRunName[run.name] += 1;
        const count = this.counterMapByRunName[run.name];
        this.keyMapByRunId[run.id] =
            count === 1 ? run.name : `${run.name}:${count}`;
        const logEntry = {
            id: run.id,
            name: run.name,
            type: run.run_type,
            tags: run.tags ?? [],
            metadata: run.extra?.metadata ?? {},
            start_time: new Date(run.start_time).toISOString(),
            streamed_output: [],
            streamed_output_str: [],
            final_output: undefined,
            end_time: undefined,
        };
        if (this._schemaFormat === "streaming_events") {
            logEntry.inputs = await _getStandardizedInputs(run, this._schemaFormat);
        }
        await this.writer.write(new RunLogPatch({
            ops: [
                {
                    op: "add",
                    path: `/logs/${this.keyMapByRunId[run.id]}`,
                    value: logEntry,
                },
            ],
        }));
    }
    async onRunUpdate(run) {
        try {
            const runName = this.keyMapByRunId[run.id];
            if (runName === undefined) {
                return;
            }
            const ops = [];
            if (this._schemaFormat === "streaming_events") {
                ops.push({
                    op: "replace",
                    path: `/logs/${runName}/inputs`,
                    value: await _getStandardizedInputs(run, this._schemaFormat),
                });
            }
            ops.push({
                op: "add",
                path: `/logs/${runName}/final_output`,
                value: await _getStandardizedOutputs(run, this._schemaFormat),
            });
            if (run.end_time !== undefined) {
                ops.push({
                    op: "add",
                    path: `/logs/${runName}/end_time`,
                    value: new Date(run.end_time).toISOString(),
                });
            }
            const patch = new RunLogPatch({ ops });
            await this.writer.write(patch);
        }
        finally {
            if (run.id === this.rootId) {
                const patch = new RunLogPatch({
                    ops: [
                        {
                            op: "replace",
                            path: "/final_output",
                            value: await _getStandardizedOutputs(run, this._schemaFormat),
                        },
                    ],
                });
                await this.writer.write(patch);
                if (this.autoClose) {
                    await this.writer.close();
                }
            }
        }
    }
    async onLLMNewToken(run, token, kwargs) {
        const runName = this.keyMapByRunId[run.id];
        if (runName === undefined) {
            return;
        }
        // TODO: Remove hack
        const isChatModel = run.inputs.messages !== undefined;
        let streamedOutputValue;
        if (isChatModel) {
            if (isChatGenerationChunk(kwargs?.chunk)) {
                streamedOutputValue = kwargs?.chunk;
            }
            else {
                streamedOutputValue = new AIMessageChunk({
                    id: `run-${run.id}`,
                    content: token,
                });
            }
        }
        else {
            streamedOutputValue = token;
        }
        const patch = new RunLogPatch({
            ops: [
                {
                    op: "add",
                    path: `/logs/${runName}/streamed_output_str/-`,
                    value: token,
                },
                {
                    op: "add",
                    path: `/logs/${runName}/streamed_output/-`,
                    value: streamedOutputValue,
                },
            ],
        });
        await this.writer.write(patch);
    }
}

/**
 * Chunk of a single generation. Used for streaming.
 */
class GenerationChunk {
    constructor(fields) {
        Object.defineProperty(this, "text", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.defineProperty(this, "generationInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.text = fields.text;
        this.generationInfo = fields.generationInfo;
    }
    concat(chunk) {
        return new GenerationChunk({
            text: this.text + chunk.text,
            generationInfo: {
                ...this.generationInfo,
                ...chunk.generationInfo,
            },
        });
    }
}

function assignName({ name, serialized, }) {
    if (name !== undefined) {
        return name;
    }
    if (serialized?.name !== undefined) {
        return serialized.name;
    }
    else if (serialized?.id !== undefined && Array.isArray(serialized?.id)) {
        return serialized.id[serialized.id.length - 1];
    }
    return "Unnamed";
}
const isStreamEventsHandler = (handler) => handler.name === "event_stream_tracer";
/**
 * Class that extends the `BaseTracer` class from the
 * `langchain.callbacks.tracers.base` module. It represents a callback
 * handler that logs the execution of runs and emits `RunLog` instances to a
 * `RunLogStream`.
 */
class EventStreamCallbackHandler extends BaseTracer {
    constructor(fields) {
        super({ _awaitHandler: true, ...fields });
        Object.defineProperty(this, "autoClose", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "includeNames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "includeTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "includeTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeNames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "runInfoMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "tappedPromises", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "transformStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "writer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "receiveStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "event_stream_tracer"
        });
        this.autoClose = fields?.autoClose ?? true;
        this.includeNames = fields?.includeNames;
        this.includeTypes = fields?.includeTypes;
        this.includeTags = fields?.includeTags;
        this.excludeNames = fields?.excludeNames;
        this.excludeTypes = fields?.excludeTypes;
        this.excludeTags = fields?.excludeTags;
        this.transformStream = new TransformStream();
        this.writer = this.transformStream.writable.getWriter();
        this.receiveStream = IterableReadableStream.fromReadableStream(this.transformStream.readable);
    }
    [Symbol.asyncIterator]() {
        return this.receiveStream;
    }
    async persistRun(_run) {
        // This is a legacy method only called once for an entire run tree
        // and is therefore not useful here
    }
    _includeRun(run) {
        const runTags = run.tags ?? [];
        let include = this.includeNames === undefined &&
            this.includeTags === undefined &&
            this.includeTypes === undefined;
        if (this.includeNames !== undefined) {
            include = include || this.includeNames.includes(run.name);
        }
        if (this.includeTypes !== undefined) {
            include = include || this.includeTypes.includes(run.runType);
        }
        if (this.includeTags !== undefined) {
            include =
                include ||
                    runTags.find((tag) => this.includeTags?.includes(tag)) !== undefined;
        }
        if (this.excludeNames !== undefined) {
            include = include && !this.excludeNames.includes(run.name);
        }
        if (this.excludeTypes !== undefined) {
            include = include && !this.excludeTypes.includes(run.runType);
        }
        if (this.excludeTags !== undefined) {
            include =
                include && runTags.every((tag) => !this.excludeTags?.includes(tag));
        }
        return include;
    }
    async *tapOutputIterable(runId, outputStream) {
        const firstChunk = await outputStream.next();
        if (firstChunk.done) {
            return;
        }
        const runInfo = this.runInfoMap.get(runId);
        // Run has finished, don't issue any stream events.
        // An example of this is for runnables that use the default
        // implementation of .stream(), which delegates to .invoke()
        // and calls .onChainEnd() before passing it to the iterator.
        if (runInfo === undefined) {
            yield firstChunk.value;
            return;
        }
        // Match format from handlers below
        function _formatOutputChunk(eventType, data) {
            if (eventType === "llm" && typeof data === "string") {
                return new GenerationChunk({ text: data });
            }
            return data;
        }
        let tappedPromise = this.tappedPromises.get(runId);
        // if we are the first to tap, issue stream events
        if (tappedPromise === undefined) {
            let tappedPromiseResolver;
            tappedPromise = new Promise((resolve) => {
                tappedPromiseResolver = resolve;
            });
            this.tappedPromises.set(runId, tappedPromise);
            try {
                const event = {
                    event: `on_${runInfo.runType}_stream`,
                    run_id: runId,
                    name: runInfo.name,
                    tags: runInfo.tags,
                    metadata: runInfo.metadata,
                    data: {},
                };
                await this.send({
                    ...event,
                    data: {
                        chunk: _formatOutputChunk(runInfo.runType, firstChunk.value),
                    },
                }, runInfo);
                yield firstChunk.value;
                for await (const chunk of outputStream) {
                    // Don't yield tool and retriever stream events
                    if (runInfo.runType !== "tool" && runInfo.runType !== "retriever") {
                        await this.send({
                            ...event,
                            data: {
                                chunk: _formatOutputChunk(runInfo.runType, chunk),
                            },
                        }, runInfo);
                    }
                    yield chunk;
                }
            }
            finally {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                tappedPromiseResolver();
                // Don't delete from the promises map to keep track of which runs have been tapped.
            }
        }
        else {
            // otherwise just pass through
            yield firstChunk.value;
            for await (const chunk of outputStream) {
                yield chunk;
            }
        }
    }
    async send(payload, run) {
        if (this._includeRun(run)) {
            await this.writer.write(payload);
        }
    }
    async sendEndEvent(payload, run) {
        const tappedPromise = this.tappedPromises.get(payload.run_id);
        if (tappedPromise !== undefined) {
            void tappedPromise.then(() => {
                void this.send(payload, run);
            });
        }
        else {
            await this.send(payload, run);
        }
    }
    async onLLMStart(run) {
        const runName = assignName(run);
        const runType = run.inputs.messages !== undefined ? "chat_model" : "llm";
        const runInfo = {
            tags: run.tags ?? [],
            metadata: run.extra?.metadata ?? {},
            name: runName,
            runType,
            inputs: run.inputs,
        };
        this.runInfoMap.set(run.id, runInfo);
        const eventName = `on_${runType}_start`;
        await this.send({
            event: eventName,
            data: {
                input: run.inputs,
            },
            name: runName,
            tags: run.tags ?? [],
            run_id: run.id,
            metadata: run.extra?.metadata ?? {},
        }, runInfo);
    }
    async onLLMNewToken(run, token, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kwargs) {
        const runInfo = this.runInfoMap.get(run.id);
        let chunk;
        let eventName;
        if (runInfo === undefined) {
            throw new Error(`onLLMNewToken: Run ID ${run.id} not found in run map.`);
        }
        // Top-level streaming events are covered by tapOutputIterable
        if (this.runInfoMap.size === 1) {
            return;
        }
        if (runInfo.runType === "chat_model") {
            eventName = "on_chat_model_stream";
            if (kwargs?.chunk === undefined) {
                chunk = new AIMessageChunk({ content: token, id: `run-${run.id}` });
            }
            else {
                chunk = kwargs.chunk.message;
            }
        }
        else if (runInfo.runType === "llm") {
            eventName = "on_llm_stream";
            if (kwargs?.chunk === undefined) {
                chunk = new GenerationChunk({ text: token });
            }
            else {
                chunk = kwargs.chunk;
            }
        }
        else {
            throw new Error(`Unexpected run type ${runInfo.runType}`);
        }
        await this.send({
            event: eventName,
            data: {
                chunk,
            },
            run_id: run.id,
            name: runInfo.name,
            tags: runInfo.tags,
            metadata: runInfo.metadata,
        }, runInfo);
    }
    async onLLMEnd(run) {
        const runInfo = this.runInfoMap.get(run.id);
        this.runInfoMap.delete(run.id);
        let eventName;
        if (runInfo === undefined) {
            throw new Error(`onLLMEnd: Run ID ${run.id} not found in run map.`);
        }
        const generations = run.outputs?.generations;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let output;
        if (runInfo.runType === "chat_model") {
            for (const generation of generations ?? []) {
                if (output !== undefined) {
                    break;
                }
                output = generation[0]?.message;
            }
            eventName = "on_chat_model_end";
        }
        else if (runInfo.runType === "llm") {
            output = {
                generations: generations?.map((generation) => {
                    return generation.map((chunk) => {
                        return {
                            text: chunk.text,
                            generationInfo: chunk.generationInfo,
                        };
                    });
                }),
                llmOutput: run.outputs?.llmOutput ?? {},
            };
            eventName = "on_llm_end";
        }
        else {
            throw new Error(`onLLMEnd: Unexpected run type: ${runInfo.runType}`);
        }
        await this.sendEndEvent({
            event: eventName,
            data: {
                output,
                input: runInfo.inputs,
            },
            run_id: run.id,
            name: runInfo.name,
            tags: runInfo.tags,
            metadata: runInfo.metadata,
        }, runInfo);
    }
    async onChainStart(run) {
        const runName = assignName(run);
        const runType = run.run_type ?? "chain";
        const runInfo = {
            tags: run.tags ?? [],
            metadata: run.extra?.metadata ?? {},
            name: runName,
            runType: run.run_type,
        };
        let eventData = {};
        // Workaround Runnable core code not sending input when transform streaming.
        if (run.inputs.input === "" && Object.keys(run.inputs).length === 1) {
            eventData = {};
            runInfo.inputs = {};
        }
        else if (run.inputs.input !== undefined) {
            eventData.input = run.inputs.input;
            runInfo.inputs = run.inputs.input;
        }
        else {
            eventData.input = run.inputs;
            runInfo.inputs = run.inputs;
        }
        this.runInfoMap.set(run.id, runInfo);
        await this.send({
            event: `on_${runType}_start`,
            data: eventData,
            name: runName,
            tags: run.tags ?? [],
            run_id: run.id,
            metadata: run.extra?.metadata ?? {},
        }, runInfo);
    }
    async onChainEnd(run) {
        const runInfo = this.runInfoMap.get(run.id);
        this.runInfoMap.delete(run.id);
        if (runInfo === undefined) {
            throw new Error(`onChainEnd: Run ID ${run.id} not found in run map.`);
        }
        const eventName = `on_${run.run_type}_end`;
        const inputs = run.inputs ?? runInfo.inputs ?? {};
        const outputs = run.outputs?.output ?? run.outputs;
        const data = {
            output: outputs,
            input: inputs,
        };
        if (inputs.input && Object.keys(inputs).length === 1) {
            data.input = inputs.input;
            runInfo.inputs = inputs.input;
        }
        await this.sendEndEvent({
            event: eventName,
            data,
            run_id: run.id,
            name: runInfo.name,
            tags: runInfo.tags,
            metadata: runInfo.metadata ?? {},
        }, runInfo);
    }
    async onToolStart(run) {
        const runName = assignName(run);
        const runInfo = {
            tags: run.tags ?? [],
            metadata: run.extra?.metadata ?? {},
            name: runName,
            runType: "tool",
            inputs: run.inputs ?? {},
        };
        this.runInfoMap.set(run.id, runInfo);
        await this.send({
            event: "on_tool_start",
            data: {
                input: run.inputs ?? {},
            },
            name: runName,
            run_id: run.id,
            tags: run.tags ?? [],
            metadata: run.extra?.metadata ?? {},
        }, runInfo);
    }
    async onToolEnd(run) {
        const runInfo = this.runInfoMap.get(run.id);
        this.runInfoMap.delete(run.id);
        if (runInfo === undefined) {
            throw new Error(`onToolEnd: Run ID ${run.id} not found in run map.`);
        }
        if (runInfo.inputs === undefined) {
            throw new Error(`onToolEnd: Run ID ${run.id} is a tool call, and is expected to have traced inputs.`);
        }
        const output = run.outputs?.output === undefined ? run.outputs : run.outputs.output;
        await this.sendEndEvent({
            event: "on_tool_end",
            data: {
                output,
                input: runInfo.inputs,
            },
            run_id: run.id,
            name: runInfo.name,
            tags: runInfo.tags,
            metadata: runInfo.metadata,
        }, runInfo);
    }
    async onRetrieverStart(run) {
        const runName = assignName(run);
        const runType = "retriever";
        const runInfo = {
            tags: run.tags ?? [],
            metadata: run.extra?.metadata ?? {},
            name: runName,
            runType,
            inputs: {
                query: run.inputs.query,
            },
        };
        this.runInfoMap.set(run.id, runInfo);
        await this.send({
            event: "on_retriever_start",
            data: {
                input: {
                    query: run.inputs.query,
                },
            },
            name: runName,
            tags: run.tags ?? [],
            run_id: run.id,
            metadata: run.extra?.metadata ?? {},
        }, runInfo);
    }
    async onRetrieverEnd(run) {
        const runInfo = this.runInfoMap.get(run.id);
        this.runInfoMap.delete(run.id);
        if (runInfo === undefined) {
            throw new Error(`onRetrieverEnd: Run ID ${run.id} not found in run map.`);
        }
        await this.sendEndEvent({
            event: "on_retriever_end",
            data: {
                output: run.outputs?.documents ?? run.outputs,
                input: runInfo.inputs,
            },
            run_id: run.id,
            name: runInfo.name,
            tags: runInfo.tags,
            metadata: runInfo.metadata,
        }, runInfo);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleCustomEvent(eventName, data, runId) {
        const runInfo = this.runInfoMap.get(runId);
        if (runInfo === undefined) {
            throw new Error(`handleCustomEvent: Run ID ${runId} not found in run map.`);
        }
        await this.send({
            event: "on_custom_event",
            run_id: runId,
            name: eventName,
            tags: runInfo.tags,
            metadata: runInfo.metadata,
            data,
        }, runInfo);
    }
    async finish() {
        const pendingPromises = [...this.tappedPromises.values()];
        void Promise.all(pendingPromises).finally(() => {
            void this.writer.close();
        });
    }
}

const DEFAULT_RECURSION_LIMIT = 25;
async function getCallbackManagerForConfig(config) {
    return CallbackManager._configureSync(config?.callbacks, undefined, config?.tags, undefined, config?.metadata);
}
function mergeConfigs(...configs) {
    // We do not want to call ensureConfig on the empty state here as this may cause
    // double loading of callbacks if async local storage is being used.
    const copy = {};
    for (const options of configs.filter((c) => !!c)) {
        for (const key of Object.keys(options)) {
            if (key === "metadata") {
                copy[key] = { ...copy[key], ...options[key] };
            }
            else if (key === "tags") {
                const baseKeys = copy[key] ?? [];
                copy[key] = [...new Set(baseKeys.concat(options[key] ?? []))];
            }
            else if (key === "configurable") {
                copy[key] = { ...copy[key], ...options[key] };
            }
            else if (key === "timeout") {
                if (copy.timeout === undefined) {
                    copy.timeout = options.timeout;
                }
                else if (options.timeout !== undefined) {
                    copy.timeout = Math.min(copy.timeout, options.timeout);
                }
            }
            else if (key === "signal") {
                if (copy.signal === undefined) {
                    copy.signal = options.signal;
                }
                else if (options.signal !== undefined) {
                    if ("any" in AbortSignal) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        copy.signal = AbortSignal.any([
                            copy.signal,
                            options.signal,
                        ]);
                    }
                    else {
                        copy.signal = options.signal;
                    }
                }
            }
            else if (key === "callbacks") {
                const baseCallbacks = copy.callbacks;
                const providedCallbacks = options.callbacks;
                // callbacks can be either undefined, Array<handler> or manager
                // so merging two callbacks values has 6 cases
                if (Array.isArray(providedCallbacks)) {
                    if (!baseCallbacks) {
                        copy.callbacks = providedCallbacks;
                    }
                    else if (Array.isArray(baseCallbacks)) {
                        copy.callbacks = baseCallbacks.concat(providedCallbacks);
                    }
                    else {
                        // baseCallbacks is a manager
                        const manager = baseCallbacks.copy();
                        for (const callback of providedCallbacks) {
                            manager.addHandler(ensureHandler(callback), true);
                        }
                        copy.callbacks = manager;
                    }
                }
                else if (providedCallbacks) {
                    // providedCallbacks is a manager
                    if (!baseCallbacks) {
                        copy.callbacks = providedCallbacks;
                    }
                    else if (Array.isArray(baseCallbacks)) {
                        const manager = providedCallbacks.copy();
                        for (const callback of baseCallbacks) {
                            manager.addHandler(ensureHandler(callback), true);
                        }
                        copy.callbacks = manager;
                    }
                    else {
                        // baseCallbacks is also a manager
                        copy.callbacks = new CallbackManager(providedCallbacks._parentRunId, {
                            handlers: baseCallbacks.handlers.concat(providedCallbacks.handlers),
                            inheritableHandlers: baseCallbacks.inheritableHandlers.concat(providedCallbacks.inheritableHandlers),
                            tags: Array.from(new Set(baseCallbacks.tags.concat(providedCallbacks.tags))),
                            inheritableTags: Array.from(new Set(baseCallbacks.inheritableTags.concat(providedCallbacks.inheritableTags))),
                            metadata: {
                                ...baseCallbacks.metadata,
                                ...providedCallbacks.metadata,
                            },
                        });
                    }
                }
            }
            else {
                const typedKey = key;
                copy[typedKey] = options[typedKey] ?? copy[typedKey];
            }
        }
    }
    return copy;
}
const PRIMITIVES = new Set(["string", "number", "boolean"]);
/**
 * Ensure that a passed config is an object with all required keys present.
 */
function ensureConfig(config) {
    const implicitConfig = AsyncLocalStorageProviderSingleton.getRunnableConfig();
    let empty = {
        tags: [],
        metadata: {},
        recursionLimit: 25,
        runId: undefined,
    };
    if (implicitConfig) {
        // Don't allow runId and runName to be loaded implicitly, as this can cause
        // child runs to improperly inherit their parents' run ids.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { runId, runName, ...rest } = implicitConfig;
        empty = Object.entries(rest).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentConfig, [key, value]) => {
            if (value !== undefined) {
                // eslint-disable-next-line no-param-reassign
                currentConfig[key] = value;
            }
            return currentConfig;
        }, empty);
    }
    if (config) {
        empty = Object.entries(config).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentConfig, [key, value]) => {
            if (value !== undefined) {
                // eslint-disable-next-line no-param-reassign
                currentConfig[key] = value;
            }
            return currentConfig;
        }, empty);
    }
    if (empty?.configurable) {
        for (const key of Object.keys(empty.configurable)) {
            if (PRIMITIVES.has(typeof empty.configurable[key]) &&
                !empty.metadata?.[key]) {
                if (!empty.metadata) {
                    empty.metadata = {};
                }
                empty.metadata[key] = empty.configurable[key];
            }
        }
    }
    if (empty.timeout !== undefined) {
        if (empty.timeout <= 0) {
            throw new Error("Timeout must be a positive number");
        }
        const timeoutSignal = AbortSignal.timeout(empty.timeout);
        if (empty.signal !== undefined) {
            if ("any" in AbortSignal) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                empty.signal = AbortSignal.any([empty.signal, timeoutSignal]);
            }
        }
        else {
            empty.signal = timeoutSignal;
        }
        delete empty.timeout;
    }
    return empty;
}
/**
 * Helper function that patches runnable configs with updated properties.
 */
function patchConfig(config = {}, { callbacks, maxConcurrency, recursionLimit, runName, configurable, runId, } = {}) {
    const newConfig = ensureConfig(config);
    if (callbacks !== undefined) {
        /**
         * If we're replacing callbacks we need to unset runName
         * since that should apply only to the same run as the original callbacks
         */
        delete newConfig.runName;
        newConfig.callbacks = callbacks;
    }
    if (recursionLimit !== undefined) {
        newConfig.recursionLimit = recursionLimit;
    }
    if (maxConcurrency !== undefined) {
        newConfig.maxConcurrency = maxConcurrency;
    }
    if (runName !== undefined) {
        newConfig.runName = runName;
    }
    if (configurable !== undefined) {
        newConfig.configurable = { ...newConfig.configurable, ...configurable };
    }
    if (runId !== undefined) {
        delete newConfig.runId;
    }
    return newConfig;
}

const STATUS_NO_RETRY = [
    400,
    401,
    402,
    403,
    404,
    405,
    406,
    407,
    409, // Conflict
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultFailedAttemptHandler = (error) => {
    if (error.message.startsWith("Cancel") ||
        error.message.startsWith("AbortError") ||
        error.name === "AbortError") {
        throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (error?.code === "ECONNABORTED") {
        throw error;
    }
    const status = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?.response?.status ?? error?.status;
    if (status && STATUS_NO_RETRY.includes(+status)) {
        throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (error?.error?.code === "insufficient_quota") {
        const err = new Error(error?.message);
        err.name = "InsufficientQuotaError";
        throw err;
    }
};
/**
 * A class that can be used to make async calls with concurrency and retry logic.
 *
 * This is useful for making calls to any kind of "expensive" external resource,
 * be it because it's rate-limited, subject to network issues, etc.
 *
 * Concurrent calls are limited by the `maxConcurrency` parameter, which defaults
 * to `Infinity`. This means that by default, all calls will be made in parallel.
 *
 * Retries are limited by the `maxRetries` parameter, which defaults to 6. This
 * means that by default, each call will be retried up to 6 times, with an
 * exponential backoff between each attempt.
 */
class AsyncCaller {
    constructor(params) {
        Object.defineProperty(this, "maxConcurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxRetries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onFailedAttempt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxConcurrency = params.maxConcurrency ?? Infinity;
        this.maxRetries = params.maxRetries ?? 6;
        this.onFailedAttempt =
            params.onFailedAttempt ?? defaultFailedAttemptHandler;
        const PQueue = "default" in PQueueMod ? PQueueMod.default : PQueueMod;
        this.queue = new PQueue({ concurrency: this.maxConcurrency });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call(callable, ...args) {
        return this.queue.add(() => pRetry(() => callable(...args).catch((error) => {
            // eslint-disable-next-line no-instanceof/no-instanceof
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error(error);
            }
        }), {
            onFailedAttempt: this.onFailedAttempt,
            retries: this.maxRetries,
            randomize: true,
            // If needed we can change some of the defaults here,
            // but they're quite sensible.
        }), { throwOnTimeout: true });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callWithOptions(options, callable, ...args) {
        // Note this doesn't cancel the underlying request,
        // when available prefer to use the signal option of the underlying call
        if (options.signal) {
            return Promise.race([
                this.call(callable, ...args),
                new Promise((_, reject) => {
                    options.signal?.addEventListener("abort", () => {
                        reject(new Error("AbortError"));
                    });
                }),
            ]);
        }
        return this.call(callable, ...args);
    }
    fetch(...args) {
        return this.call(() => fetch(...args).then((res) => (res.ok ? res : Promise.reject(res))));
    }
}

class RootListenersTracer extends BaseTracer {
    constructor({ config, onStart, onEnd, onError, }) {
        super({ _awaitHandler: true });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "RootListenersTracer"
        });
        /** The Run's ID. Type UUID */
        Object.defineProperty(this, "rootId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "argOnStart", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "argOnEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "argOnError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.config = config;
        this.argOnStart = onStart;
        this.argOnEnd = onEnd;
        this.argOnError = onError;
    }
    /**
     * This is a legacy method only called once for an entire run tree
     * therefore not useful here
     * @param {Run} _ Not used
     */
    persistRun(_) {
        return Promise.resolve();
    }
    async onRunCreate(run) {
        if (this.rootId) {
            return;
        }
        this.rootId = run.id;
        if (this.argOnStart) {
            await this.argOnStart(run, this.config);
        }
    }
    async onRunUpdate(run) {
        if (run.id !== this.rootId) {
            return;
        }
        if (!run.error) {
            if (this.argOnEnd) {
                await this.argOnEnd(run, this.config);
            }
        }
        else if (this.argOnError) {
            await this.argOnError(run, this.config);
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRunnableInterface(thing) {
    return thing ? thing.lc_runnable : false;
}
/**
 * Utility to filter the root event in the streamEvents implementation.
 * This is simply binding the arguments to the namespace to make save on
 * a bit of typing in the streamEvents implementation.
 *
 * TODO: Refactor and remove.
 */
class _RootEventFilter {
    constructor(fields) {
        Object.defineProperty(this, "includeNames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "includeTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "includeTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeNames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "excludeTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.includeNames = fields.includeNames;
        this.includeTypes = fields.includeTypes;
        this.includeTags = fields.includeTags;
        this.excludeNames = fields.excludeNames;
        this.excludeTypes = fields.excludeTypes;
        this.excludeTags = fields.excludeTags;
    }
    includeEvent(event, rootType) {
        let include = this.includeNames === undefined &&
            this.includeTypes === undefined &&
            this.includeTags === undefined;
        const eventTags = event.tags ?? [];
        if (this.includeNames !== undefined) {
            include = include || this.includeNames.includes(event.name);
        }
        if (this.includeTypes !== undefined) {
            include = include || this.includeTypes.includes(rootType);
        }
        if (this.includeTags !== undefined) {
            include =
                include || eventTags.some((tag) => this.includeTags?.includes(tag));
        }
        if (this.excludeNames !== undefined) {
            include = include && !this.excludeNames.includes(event.name);
        }
        if (this.excludeTypes !== undefined) {
            include = include && !this.excludeTypes.includes(rootType);
        }
        if (this.excludeTags !== undefined) {
            include =
                include && eventTags.every((tag) => !this.excludeTags?.includes(tag));
        }
        return include;
    }
}

const ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
const defaultOptions = {
    name: undefined,
    $refStrategy: "root",
    basePath: ["#"],
    effectStrategy: "input",
    pipeStrategy: "all",
    dateStrategy: "format:date-time",
    mapStrategy: "entries",
    removeAdditionalStrategy: "passthrough",
    definitionPath: "definitions",
    target: "jsonSchema7",
    strictUnions: false,
    definitions: {},
    errorMessages: false,
    markdownDescription: false,
    patternStrategy: "escape",
    applyRegexFlags: false,
    emailStrategy: "format:email",
    base64Strategy: "contentEncoding:base64",
    nameStrategy: "ref"
};
const getDefaultOptions = (options) => (typeof options === "string"
    ? {
        ...defaultOptions,
        name: options,
    }
    : {
        ...defaultOptions,
        ...options,
    });

const getRefs = (options) => {
    const _options = getDefaultOptions(options);
    const currentPath = _options.name !== undefined
        ? [..._options.basePath, _options.definitionPath, _options.name]
        : _options.basePath;
    return {
        ..._options,
        currentPath: currentPath,
        propertyPath: undefined,
        seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
            def._def,
            {
                def: def._def,
                path: [..._options.basePath, _options.definitionPath, name],
                // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
                jsonSchema: undefined,
            },
        ])),
    };
};

function addErrorMessage(res, key, errorMessage, refs) {
    if (!refs?.errorMessages)
        return;
    if (errorMessage) {
        res.errorMessage = {
            ...res.errorMessage,
            [key]: errorMessage,
        };
    }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
    res[key] = value;
    addErrorMessage(res, key, errorMessage, refs);
}

function parseAnyDef() {
    return {};
}

function parseArrayDef(def, refs) {
    const res = {
        type: "array",
    };
    if (def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
        res.items = parseDef(def.type._def, {
            ...refs,
            currentPath: [...refs.currentPath, "items"],
        });
    }
    if (def.minLength) {
        setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
    }
    if (def.maxLength) {
        setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
    }
    if (def.exactLength) {
        setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
        setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
    }
    return res;
}

function parseBigintDef(def, refs) {
    const res = {
        type: "integer",
        format: "int64",
    };
    if (!def.checks)
        return res;
    for (const check of def.checks) {
        switch (check.kind) {
            case "min":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
                    }
                    else {
                        setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMinimum = true;
                    }
                    setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
                }
                break;
            case "max":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
                    }
                    else {
                        setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMaximum = true;
                    }
                    setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
                }
                break;
            case "multipleOf":
                setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
                break;
        }
    }
    return res;
}

function parseBooleanDef() {
    return {
        type: "boolean",
    };
}

function parseBrandedDef(_def, refs) {
    return parseDef(_def.type._def, refs);
}

const parseCatchDef = (def, refs) => {
    return parseDef(def.innerType._def, refs);
};

function parseDateDef(def, refs, overrideDateStrategy) {
    const strategy = overrideDateStrategy ?? refs.dateStrategy;
    if (Array.isArray(strategy)) {
        return {
            anyOf: strategy.map((item, i) => parseDateDef(def, refs, item)),
        };
    }
    switch (strategy) {
        case "string":
        case "format:date-time":
            return {
                type: "string",
                format: "date-time",
            };
        case "format:date":
            return {
                type: "string",
                format: "date",
            };
        case "integer":
            return integerDateParser(def, refs);
    }
}
const integerDateParser = (def, refs) => {
    const res = {
        type: "integer",
        format: "unix-time",
    };
    if (refs.target === "openApi3") {
        return res;
    }
    for (const check of def.checks) {
        switch (check.kind) {
            case "min":
                setResponseValueAndErrors(res, "minimum", check.value, // This is in milliseconds
                check.message, refs);
                break;
            case "max":
                setResponseValueAndErrors(res, "maximum", check.value, // This is in milliseconds
                check.message, refs);
                break;
        }
    }
    return res;
};

function parseDefaultDef(_def, refs) {
    return {
        ...parseDef(_def.innerType._def, refs),
        default: _def.defaultValue(),
    };
}

function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === "input"
        ? parseDef(_def.schema._def, refs)
        : {};
}

function parseEnumDef(def) {
    return {
        type: "string",
        enum: def.values,
    };
}

const isJsonSchema7AllOfType = (type) => {
    if ("type" in type && type.type === "string")
        return false;
    return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
    const allOf = [
        parseDef(def.left._def, {
            ...refs,
            currentPath: [...refs.currentPath, "allOf", "0"],
        }),
        parseDef(def.right._def, {
            ...refs,
            currentPath: [...refs.currentPath, "allOf", "1"],
        }),
    ].filter((x) => !!x);
    let unevaluatedProperties = refs.target === "jsonSchema2019-09"
        ? { unevaluatedProperties: false }
        : undefined;
    const mergedAllOf = [];
    // If either of the schemas is an allOf, merge them into a single allOf
    allOf.forEach((schema) => {
        if (isJsonSchema7AllOfType(schema)) {
            mergedAllOf.push(...schema.allOf);
            if (schema.unevaluatedProperties === undefined) {
                // If one of the schemas has no unevaluatedProperties set,
                // the merged schema should also have no unevaluatedProperties set
                unevaluatedProperties = undefined;
            }
        }
        else {
            let nestedSchema = schema;
            if ("additionalProperties" in schema &&
                schema.additionalProperties === false) {
                const { additionalProperties, ...rest } = schema;
                nestedSchema = rest;
            }
            else {
                // As soon as one of the schemas has additionalProperties set not to false, we allow unevaluatedProperties
                unevaluatedProperties = undefined;
            }
            mergedAllOf.push(nestedSchema);
        }
    });
    return mergedAllOf.length
        ? {
            allOf: mergedAllOf,
            ...unevaluatedProperties,
        }
        : undefined;
}

function parseLiteralDef(def, refs) {
    const parsedType = typeof def.value;
    if (parsedType !== "bigint" &&
        parsedType !== "number" &&
        parsedType !== "boolean" &&
        parsedType !== "string") {
        return {
            type: Array.isArray(def.value) ? "array" : "object",
        };
    }
    if (refs.target === "openApi3") {
        return {
            type: parsedType === "bigint" ? "integer" : parsedType,
            enum: [def.value],
        };
    }
    return {
        type: parsedType === "bigint" ? "integer" : parsedType,
        const: def.value,
    };
}

let emojiRegex;
/**
 * Generated from the regular expressions found here as of 2024-05-22:
 * https://github.com/colinhacks/zod/blob/master/src/types.ts.
 *
 * Expressions with /i flag have been changed accordingly.
 */
const zodPatterns = {
    /**
     * `c` was changed to `[cC]` to replicate /i flag
     */
    cuid: /^[cC][^\s-]{8,}$/,
    cuid2: /^[0-9a-z]+$/,
    ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    /**
     * `a-z` was added to replicate /i flag
     */
    email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
    /**
     * Constructed a valid Unicode RegExp
     *
     * Lazily instantiate since this type of regex isn't supported
     * in all envs (e.g. React Native).
     *
     * See:
     * https://github.com/colinhacks/zod/issues/2433
     * Fix in Zod:
     * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
     */
    emoji: () => {
        if (emojiRegex === undefined) {
            emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
        }
        return emojiRegex;
    },
    /**
     * Unused
     */
    uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    /**
     * Unused
     */
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    /**
     * Unused
     */
    ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
};
function parseStringDef(def, refs) {
    const res = {
        type: "string",
    };
    function processPattern(value) {
        return refs.patternStrategy === "escape"
            ? escapeNonAlphaNumeric(value)
            : value;
    }
    if (def.checks) {
        for (const check of def.checks) {
            switch (check.kind) {
                case "min":
                    setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number"
                        ? Math.max(res.minLength, check.value)
                        : check.value, check.message, refs);
                    break;
                case "max":
                    setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number"
                        ? Math.min(res.maxLength, check.value)
                        : check.value, check.message, refs);
                    break;
                case "email":
                    switch (refs.emailStrategy) {
                        case "format:email":
                            addFormat(res, "email", check.message, refs);
                            break;
                        case "format:idn-email":
                            addFormat(res, "idn-email", check.message, refs);
                            break;
                        case "pattern:zod":
                            addPattern(res, zodPatterns.email, check.message, refs);
                            break;
                    }
                    break;
                case "url":
                    addFormat(res, "uri", check.message, refs);
                    break;
                case "uuid":
                    addFormat(res, "uuid", check.message, refs);
                    break;
                case "regex":
                    addPattern(res, check.regex, check.message, refs);
                    break;
                case "cuid":
                    addPattern(res, zodPatterns.cuid, check.message, refs);
                    break;
                case "cuid2":
                    addPattern(res, zodPatterns.cuid2, check.message, refs);
                    break;
                case "startsWith":
                    addPattern(res, RegExp(`^${processPattern(check.value)}`), check.message, refs);
                    break;
                case "endsWith":
                    addPattern(res, RegExp(`${processPattern(check.value)}$`), check.message, refs);
                    break;
                case "datetime":
                    addFormat(res, "date-time", check.message, refs);
                    break;
                case "date":
                    addFormat(res, "date", check.message, refs);
                    break;
                case "time":
                    addFormat(res, "time", check.message, refs);
                    break;
                case "duration":
                    addFormat(res, "duration", check.message, refs);
                    break;
                case "length":
                    setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number"
                        ? Math.max(res.minLength, check.value)
                        : check.value, check.message, refs);
                    setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number"
                        ? Math.min(res.maxLength, check.value)
                        : check.value, check.message, refs);
                    break;
                case "includes": {
                    addPattern(res, RegExp(processPattern(check.value)), check.message, refs);
                    break;
                }
                case "ip": {
                    if (check.version !== "v6") {
                        addFormat(res, "ipv4", check.message, refs);
                    }
                    if (check.version !== "v4") {
                        addFormat(res, "ipv6", check.message, refs);
                    }
                    break;
                }
                case "emoji":
                    addPattern(res, zodPatterns.emoji, check.message, refs);
                    break;
                case "ulid": {
                    addPattern(res, zodPatterns.ulid, check.message, refs);
                    break;
                }
                case "base64": {
                    switch (refs.base64Strategy) {
                        case "format:binary": {
                            addFormat(res, "binary", check.message, refs);
                            break;
                        }
                        case "contentEncoding:base64": {
                            setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
                            break;
                        }
                        case "pattern:zod": {
                            addPattern(res, zodPatterns.base64, check.message, refs);
                            break;
                        }
                    }
                    break;
                }
                case "nanoid": {
                    addPattern(res, zodPatterns.nanoid, check.message, refs);
                }
            }
        }
    }
    return res;
}
const escapeNonAlphaNumeric = (value) => Array.from(value)
    .map((c) => (/[a-zA-Z0-9]/.test(c) ? c : `\\${c}`))
    .join("");
const addFormat = (schema, value, message, refs) => {
    if (schema.format || schema.anyOf?.some((x) => x.format)) {
        if (!schema.anyOf) {
            schema.anyOf = [];
        }
        if (schema.format) {
            schema.anyOf.push({
                format: schema.format,
                ...(schema.errorMessage &&
                    refs.errorMessages && {
                    errorMessage: { format: schema.errorMessage.format },
                }),
            });
            delete schema.format;
            if (schema.errorMessage) {
                delete schema.errorMessage.format;
                if (Object.keys(schema.errorMessage).length === 0) {
                    delete schema.errorMessage;
                }
            }
        }
        schema.anyOf.push({
            format: value,
            ...(message &&
                refs.errorMessages && { errorMessage: { format: message } }),
        });
    }
    else {
        setResponseValueAndErrors(schema, "format", value, message, refs);
    }
};
const addPattern = (schema, regex, message, refs) => {
    if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
        if (!schema.allOf) {
            schema.allOf = [];
        }
        if (schema.pattern) {
            schema.allOf.push({
                pattern: schema.pattern,
                ...(schema.errorMessage &&
                    refs.errorMessages && {
                    errorMessage: { pattern: schema.errorMessage.pattern },
                }),
            });
            delete schema.pattern;
            if (schema.errorMessage) {
                delete schema.errorMessage.pattern;
                if (Object.keys(schema.errorMessage).length === 0) {
                    delete schema.errorMessage;
                }
            }
        }
        schema.allOf.push({
            pattern: processRegExp(regex, refs),
            ...(message &&
                refs.errorMessages && { errorMessage: { pattern: message } }),
        });
    }
    else {
        setResponseValueAndErrors(schema, "pattern", processRegExp(regex, refs), message, refs);
    }
};
// Mutate z.string.regex() in a best attempt to accommodate for regex flags when applyRegexFlags is true
const processRegExp = (regexOrFunction, refs) => {
    const regex = typeof regexOrFunction === "function" ? regexOrFunction() : regexOrFunction;
    if (!refs.applyRegexFlags || !regex.flags)
        return regex.source;
    // Currently handled flags
    const flags = {
        i: regex.flags.includes("i"),
        m: regex.flags.includes("m"),
        s: regex.flags.includes("s"), // `.` matches newlines
    };
    // The general principle here is to step through each character, one at a time, applying mutations as flags require. We keep track when the current character is escaped, and when it's inside a group /like [this]/ or (also) a range like /[a-z]/. The following is fairly brittle imperative code; edit at your peril!
    const source = flags.i ? regex.source.toLowerCase() : regex.source;
    let pattern = "";
    let isEscaped = false;
    let inCharGroup = false;
    let inCharRange = false;
    for (let i = 0; i < source.length; i++) {
        if (isEscaped) {
            pattern += source[i];
            isEscaped = false;
            continue;
        }
        if (flags.i) {
            if (inCharGroup) {
                if (source[i].match(/[a-z]/)) {
                    if (inCharRange) {
                        pattern += source[i];
                        pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
                        inCharRange = false;
                    }
                    else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
                        pattern += source[i];
                        inCharRange = true;
                    }
                    else {
                        pattern += `${source[i]}${source[i].toUpperCase()}`;
                    }
                    continue;
                }
            }
            else if (source[i].match(/[a-z]/)) {
                pattern += `[${source[i]}${source[i].toUpperCase()}]`;
                continue;
            }
        }
        if (flags.m) {
            if (source[i] === "^") {
                pattern += `(^|(?<=[\r\n]))`;
                continue;
            }
            else if (source[i] === "$") {
                pattern += `($|(?=[\r\n]))`;
                continue;
            }
        }
        if (flags.s && source[i] === ".") {
            pattern += inCharGroup ? `${source[i]}\r\n` : `[${source[i]}\r\n]`;
            continue;
        }
        pattern += source[i];
        if (source[i] === "\\") {
            isEscaped = true;
        }
        else if (inCharGroup && source[i] === "]") {
            inCharGroup = false;
        }
        else if (!inCharGroup && source[i] === "[") {
            inCharGroup = true;
        }
    }
    try {
        const regexTest = new RegExp(pattern);
    }
    catch {
        console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
        return regex.source;
    }
    return pattern;
};

function parseRecordDef(def, refs) {
    if (refs.target === "openApi3" &&
        def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
        return {
            type: "object",
            required: def.keyType._def.values,
            properties: def.keyType._def.values.reduce((acc, key) => ({
                ...acc,
                [key]: parseDef(def.valueType._def, {
                    ...refs,
                    currentPath: [...refs.currentPath, "properties", key],
                }) ?? {},
            }), {}),
            additionalProperties: false,
        };
    }
    const schema = {
        type: "object",
        additionalProperties: parseDef(def.valueType._def, {
            ...refs,
            currentPath: [...refs.currentPath, "additionalProperties"],
        }) ?? {},
    };
    if (refs.target === "openApi3") {
        return schema;
    }
    if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString &&
        def.keyType._def.checks?.length) {
        const keyType = Object.entries(parseStringDef(def.keyType._def, refs)).reduce((acc, [key, value]) => (key === "type" ? acc : { ...acc, [key]: value }), {});
        return {
            ...schema,
            propertyNames: keyType,
        };
    }
    else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
        return {
            ...schema,
            propertyNames: {
                enum: def.keyType._def.values,
            },
        };
    }
    return schema;
}

function parseMapDef(def, refs) {
    if (refs.mapStrategy === "record") {
        return parseRecordDef(def, refs);
    }
    const keys = parseDef(def.keyType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", "items", "0"],
    }) || {};
    const values = parseDef(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", "items", "1"],
    }) || {};
    return {
        type: "array",
        maxItems: 125,
        items: {
            type: "array",
            items: [keys, values],
            minItems: 2,
            maxItems: 2,
        },
    };
}

function parseNativeEnumDef(def) {
    const object = def.values;
    const actualKeys = Object.keys(def.values).filter((key) => {
        return typeof object[object[key]] !== "number";
    });
    const actualValues = actualKeys.map((key) => object[key]);
    const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
    return {
        type: parsedTypes.length === 1
            ? parsedTypes[0] === "string"
                ? "string"
                : "number"
            : ["string", "number"],
        enum: actualValues,
    };
}

function parseNeverDef() {
    return {
        not: {},
    };
}

function parseNullDef(refs) {
    return refs.target === "openApi3"
        ? {
            enum: ["null"],
            nullable: true,
        }
        : {
            type: "null",
        };
}

const primitiveMappings = {
    ZodString: "string",
    ZodNumber: "number",
    ZodBigInt: "integer",
    ZodBoolean: "boolean",
    ZodNull: "null",
};
function parseUnionDef(def, refs) {
    if (refs.target === "openApi3")
        return asAnyOf(def, refs);
    const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
    // This blocks tries to look ahead a bit to produce nicer looking schemas with type array instead of anyOf.
    if (options.every((x) => x._def.typeName in primitiveMappings &&
        (!x._def.checks || !x._def.checks.length))) {
        // all types in union are primitive and lack checks, so might as well squash into {type: [...]}
        const types = options.reduce((types, x) => {
            const type = primitiveMappings[x._def.typeName]; //Can be safely casted due to row 43
            return type && !types.includes(type) ? [...types, type] : types;
        }, []);
        return {
            type: types.length > 1 ? types : types[0],
        };
    }
    else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
        // all options literals
        const types = options.reduce((acc, x) => {
            const type = typeof x._def.value;
            switch (type) {
                case "string":
                case "number":
                case "boolean":
                    return [...acc, type];
                case "bigint":
                    return [...acc, "integer"];
                case "object":
                    if (x._def.value === null)
                        return [...acc, "null"];
                case "symbol":
                case "undefined":
                case "function":
                default:
                    return acc;
            }
        }, []);
        if (types.length === options.length) {
            // all the literals are primitive, as far as null can be considered primitive
            const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
            return {
                type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
                enum: options.reduce((acc, x) => {
                    return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
                }, []),
            };
        }
    }
    else if (options.every((x) => x._def.typeName === "ZodEnum")) {
        return {
            type: "string",
            enum: options.reduce((acc, x) => [
                ...acc,
                ...x._def.values.filter((x) => !acc.includes(x)),
            ], []),
        };
    }
    return asAnyOf(def, refs);
}
const asAnyOf = (def, refs) => {
    const anyOf = (def.options instanceof Map
        ? Array.from(def.options.values())
        : def.options)
        .map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", `${i}`],
    }))
        .filter((x) => !!x &&
        (!refs.strictUnions ||
            (typeof x === "object" && Object.keys(x).length > 0)));
    return anyOf.length ? { anyOf } : undefined;
};

function parseNullableDef(def, refs) {
    if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) &&
        (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
        if (refs.target === "openApi3") {
            return {
                type: primitiveMappings[def.innerType._def.typeName],
                nullable: true,
            };
        }
        return {
            type: [
                primitiveMappings[def.innerType._def.typeName],
                "null",
            ],
        };
    }
    if (refs.target === "openApi3") {
        const base = parseDef(def.innerType._def, {
            ...refs,
            currentPath: [...refs.currentPath],
        });
        if (base && '$ref' in base)
            return { allOf: [base], nullable: true };
        return base && { ...base, nullable: true };
    }
    const base = parseDef(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", "0"],
    });
    return base && { anyOf: [base, { type: "null" }] };
}

function parseNumberDef(def, refs) {
    const res = {
        type: "number",
    };
    if (!def.checks)
        return res;
    for (const check of def.checks) {
        switch (check.kind) {
            case "int":
                res.type = "integer";
                addErrorMessage(res, "type", check.message, refs);
                break;
            case "min":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
                    }
                    else {
                        setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMinimum = true;
                    }
                    setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
                }
                break;
            case "max":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
                    }
                    else {
                        setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMaximum = true;
                    }
                    setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
                }
                break;
            case "multipleOf":
                setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
                break;
        }
    }
    return res;
}

function decideAdditionalProperties(def, refs) {
    if (refs.removeAdditionalStrategy === "strict") {
        return def.catchall._def.typeName === "ZodNever"
            ? def.unknownKeys !== "strict"
            : parseDef(def.catchall._def, {
                ...refs,
                currentPath: [...refs.currentPath, "additionalProperties"],
            }) ?? true;
    }
    else {
        return def.catchall._def.typeName === "ZodNever"
            ? def.unknownKeys === "passthrough"
            : parseDef(def.catchall._def, {
                ...refs,
                currentPath: [...refs.currentPath, "additionalProperties"],
            }) ?? true;
    }
}
function parseObjectDef(def, refs) {
    const result = {
        type: "object",
        ...Object.entries(def.shape()).reduce((acc, [propName, propDef]) => {
            if (propDef === undefined || propDef._def === undefined)
                return acc;
            const parsedDef = parseDef(propDef._def, {
                ...refs,
                currentPath: [...refs.currentPath, "properties", propName],
                propertyPath: [...refs.currentPath, "properties", propName],
            });
            if (parsedDef === undefined)
                return acc;
            return {
                properties: { ...acc.properties, [propName]: parsedDef },
                required: propDef.isOptional()
                    ? acc.required
                    : [...acc.required, propName],
            };
        }, { properties: {}, required: [] }),
        additionalProperties: decideAdditionalProperties(def, refs),
    };
    if (!result.required.length)
        delete result.required;
    return result;
}

const parseOptionalDef = (def, refs) => {
    if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
        return parseDef(def.innerType._def, refs);
    }
    const innerSchema = parseDef(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", "1"],
    });
    return innerSchema
        ? {
            anyOf: [
                {
                    not: {},
                },
                innerSchema,
            ],
        }
        : {};
};

const parsePipelineDef = (def, refs) => {
    if (refs.pipeStrategy === "input") {
        return parseDef(def.in._def, refs);
    }
    else if (refs.pipeStrategy === "output") {
        return parseDef(def.out._def, refs);
    }
    const a = parseDef(def.in._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "0"],
    });
    const b = parseDef(def.out._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"],
    });
    return {
        allOf: [a, b].filter((x) => x !== undefined),
    };
};

function parsePromiseDef(def, refs) {
    return parseDef(def.type._def, refs);
}

function parseSetDef(def, refs) {
    const items = parseDef(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items"],
    });
    const schema = {
        type: "array",
        uniqueItems: true,
        items,
    };
    if (def.minSize) {
        setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
    }
    if (def.maxSize) {
        setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
    }
    return schema;
}

function parseTupleDef(def, refs) {
    if (def.rest) {
        return {
            type: "array",
            minItems: def.items.length,
            items: def.items
                .map((x, i) => parseDef(x._def, {
                ...refs,
                currentPath: [...refs.currentPath, "items", `${i}`],
            }))
                .reduce((acc, x) => (x === undefined ? acc : [...acc, x]), []),
            additionalItems: parseDef(def.rest._def, {
                ...refs,
                currentPath: [...refs.currentPath, "additionalItems"],
            }),
        };
    }
    else {
        return {
            type: "array",
            minItems: def.items.length,
            maxItems: def.items.length,
            items: def.items
                .map((x, i) => parseDef(x._def, {
                ...refs,
                currentPath: [...refs.currentPath, "items", `${i}`],
            }))
                .reduce((acc, x) => (x === undefined ? acc : [...acc, x]), []),
        };
    }
}

function parseUndefinedDef() {
    return {
        not: {},
    };
}

function parseUnknownDef() {
    return {};
}

const parseReadonlyDef = (def, refs) => {
    return parseDef(def.innerType._def, refs);
};

function parseDef(def, refs, forceResolution = false) {
    const seenItem = refs.seen.get(def);
    if (refs.override) {
        const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
        if (overrideResult !== ignoreOverride) {
            return overrideResult;
        }
    }
    if (seenItem && !forceResolution) {
        const seenSchema = get$ref(seenItem, refs);
        if (seenSchema !== undefined) {
            return seenSchema;
        }
    }
    const newItem = { def, path: refs.currentPath, jsonSchema: undefined };
    refs.seen.set(def, newItem);
    const jsonSchema = selectParser(def, def.typeName, refs);
    if (jsonSchema) {
        addMeta(def, refs, jsonSchema);
    }
    newItem.jsonSchema = jsonSchema;
    return jsonSchema;
}
const get$ref = (item, refs) => {
    switch (refs.$refStrategy) {
        case "root":
            return { $ref: item.path.join("/") };
        case "relative":
            return { $ref: getRelativePath(refs.currentPath, item.path) };
        case "none":
        case "seen": {
            if (item.path.length < refs.currentPath.length &&
                item.path.every((value, index) => refs.currentPath[index] === value)) {
                console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
                return {};
            }
            return refs.$refStrategy === "seen" ? {} : undefined;
        }
    }
};
const getRelativePath = (pathA, pathB) => {
    let i = 0;
    for (; i < pathA.length && i < pathB.length; i++) {
        if (pathA[i] !== pathB[i])
            break;
    }
    return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
const selectParser = (def, typeName, refs) => {
    switch (typeName) {
        case ZodFirstPartyTypeKind.ZodString:
            return parseStringDef(def, refs);
        case ZodFirstPartyTypeKind.ZodNumber:
            return parseNumberDef(def, refs);
        case ZodFirstPartyTypeKind.ZodObject:
            return parseObjectDef(def, refs);
        case ZodFirstPartyTypeKind.ZodBigInt:
            return parseBigintDef(def, refs);
        case ZodFirstPartyTypeKind.ZodBoolean:
            return parseBooleanDef();
        case ZodFirstPartyTypeKind.ZodDate:
            return parseDateDef(def, refs);
        case ZodFirstPartyTypeKind.ZodUndefined:
            return parseUndefinedDef();
        case ZodFirstPartyTypeKind.ZodNull:
            return parseNullDef(refs);
        case ZodFirstPartyTypeKind.ZodArray:
            return parseArrayDef(def, refs);
        case ZodFirstPartyTypeKind.ZodUnion:
        case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
            return parseUnionDef(def, refs);
        case ZodFirstPartyTypeKind.ZodIntersection:
            return parseIntersectionDef(def, refs);
        case ZodFirstPartyTypeKind.ZodTuple:
            return parseTupleDef(def, refs);
        case ZodFirstPartyTypeKind.ZodRecord:
            return parseRecordDef(def, refs);
        case ZodFirstPartyTypeKind.ZodLiteral:
            return parseLiteralDef(def, refs);
        case ZodFirstPartyTypeKind.ZodEnum:
            return parseEnumDef(def);
        case ZodFirstPartyTypeKind.ZodNativeEnum:
            return parseNativeEnumDef(def);
        case ZodFirstPartyTypeKind.ZodNullable:
            return parseNullableDef(def, refs);
        case ZodFirstPartyTypeKind.ZodOptional:
            return parseOptionalDef(def, refs);
        case ZodFirstPartyTypeKind.ZodMap:
            return parseMapDef(def, refs);
        case ZodFirstPartyTypeKind.ZodSet:
            return parseSetDef(def, refs);
        case ZodFirstPartyTypeKind.ZodLazy:
            return parseDef(def.getter()._def, refs);
        case ZodFirstPartyTypeKind.ZodPromise:
            return parsePromiseDef(def, refs);
        case ZodFirstPartyTypeKind.ZodNaN:
        case ZodFirstPartyTypeKind.ZodNever:
            return parseNeverDef();
        case ZodFirstPartyTypeKind.ZodEffects:
            return parseEffectsDef(def, refs);
        case ZodFirstPartyTypeKind.ZodAny:
            return parseAnyDef();
        case ZodFirstPartyTypeKind.ZodUnknown:
            return parseUnknownDef();
        case ZodFirstPartyTypeKind.ZodDefault:
            return parseDefaultDef(def, refs);
        case ZodFirstPartyTypeKind.ZodBranded:
            return parseBrandedDef(def, refs);
        case ZodFirstPartyTypeKind.ZodReadonly:
            return parseReadonlyDef(def, refs);
        case ZodFirstPartyTypeKind.ZodCatch:
            return parseCatchDef(def, refs);
        case ZodFirstPartyTypeKind.ZodPipeline:
            return parsePipelineDef(def, refs);
        case ZodFirstPartyTypeKind.ZodFunction:
        case ZodFirstPartyTypeKind.ZodVoid:
        case ZodFirstPartyTypeKind.ZodSymbol:
            return undefined;
        default:
            /* c8 ignore next */
            return ((_) => undefined)();
    }
};
const addMeta = (def, refs, jsonSchema) => {
    if (def.description) {
        jsonSchema.description = def.description;
        if (refs.markdownDescription) {
            jsonSchema.markdownDescription = def.description;
        }
    }
    return jsonSchema;
};

const zodToJsonSchema = (schema, options) => {
    const refs = getRefs(options);
    const definitions = typeof options === "object" && options.definitions
        ? Object.entries(options.definitions).reduce((acc, [name, schema]) => ({
            ...acc,
            [name]: parseDef(schema._def, {
                ...refs,
                currentPath: [...refs.basePath, refs.definitionPath, name],
            }, true) ?? {},
        }), {})
        : undefined;
    const name = typeof options === "string"
        ? options
        : options?.nameStrategy === "title"
            ? undefined
            : options?.name;
    const main = parseDef(schema._def, name === undefined
        ? refs
        : {
            ...refs,
            currentPath: [...refs.basePath, refs.definitionPath, name],
        }, false) ?? {};
    const title = typeof options === "object" &&
        options.name !== undefined &&
        options.nameStrategy === "title"
        ? options.name
        : undefined;
    if (title !== undefined) {
        main.title = title;
    }
    const combined = name === undefined
        ? definitions
            ? {
                ...main,
                [refs.definitionPath]: definitions,
            }
            : main
        : {
            $ref: [
                ...(refs.$refStrategy === "relative" ? [] : refs.basePath),
                refs.definitionPath,
                name,
            ].join("/"),
            [refs.definitionPath]: {
                ...definitions,
                [name]: main,
            },
        };
    if (refs.target === "jsonSchema7") {
        combined.$schema = "http://json-schema.org/draft-07/schema#";
    }
    else if (refs.target === "jsonSchema2019-09") {
        combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
    }
    return combined;
};

function _escapeNodeLabel(nodeLabel) {
    // Escapes the node label for Mermaid syntax.
    return nodeLabel.replace(/[^a-zA-Z-_0-9]/g, "_");
}
const MARKDOWN_SPECIAL_CHARS = ["*", "_", "`"];
function _generateMermaidGraphStyles(nodeColors) {
    let styles = "";
    for (const [className, color] of Object.entries(nodeColors)) {
        styles += `\tclassDef ${className} ${color};\n`;
    }
    return styles;
}
/**
 * Draws a Mermaid graph using the provided graph data
 */
function drawMermaid(nodes, edges, config) {
    const { firstNode, lastNode, nodeColors, withStyles = true, curveStyle = "linear", wrapLabelNWords = 9, } = config ?? {};
    // Initialize Mermaid graph configuration
    let mermaidGraph = withStyles
        ? `%%{init: {'flowchart': {'curve': '${curveStyle}'}}}%%\ngraph TD;\n`
        : "graph TD;\n";
    if (withStyles) {
        // Node formatting templates
        const defaultClassLabel = "default";
        const formatDict = {
            [defaultClassLabel]: "{0}({1})",
        };
        if (firstNode !== undefined) {
            formatDict[firstNode] = "{0}([{1}]):::first";
        }
        if (lastNode !== undefined) {
            formatDict[lastNode] = "{0}([{1}]):::last";
        }
        // Add nodes to the graph
        for (const [key, node] of Object.entries(nodes)) {
            const nodeName = node.name.split(":").pop() ?? "";
            const label = MARKDOWN_SPECIAL_CHARS.some((char) => nodeName.startsWith(char) && nodeName.endsWith(char))
                ? `<p>${nodeName}</p>`
                : nodeName;
            let finalLabel = label;
            if (Object.keys(node.metadata ?? {}).length) {
                finalLabel += `<hr/><small><em>${Object.entries(node.metadata ?? {})
                    .map(([k, v]) => `${k} = ${v}`)
                    .join("\n")}</em></small>`;
            }
            const nodeLabel = (formatDict[key] ?? formatDict[defaultClassLabel])
                .replace("{0}", _escapeNodeLabel(key))
                .replace("{1}", finalLabel);
            mermaidGraph += `\t${nodeLabel}\n`;
        }
    }
    // Group edges by their common prefixes
    const edgeGroups = {};
    for (const edge of edges) {
        const srcParts = edge.source.split(":");
        const tgtParts = edge.target.split(":");
        const commonPrefix = srcParts
            .filter((src, i) => src === tgtParts[i])
            .join(":");
        if (!edgeGroups[commonPrefix]) {
            edgeGroups[commonPrefix] = [];
        }
        edgeGroups[commonPrefix].push(edge);
    }
    const seenSubgraphs = new Set();
    function addSubgraph(edges, prefix) {
        const selfLoop = edges.length === 1 && edges[0].source === edges[0].target;
        if (prefix && !selfLoop) {
            const subgraph = prefix.split(":").pop();
            if (seenSubgraphs.has(subgraph)) {
                throw new Error(`Found duplicate subgraph '${subgraph}' -- this likely means that ` +
                    "you're reusing a subgraph node with the same name. " +
                    "Please adjust your graph to have subgraph nodes with unique names.");
            }
            seenSubgraphs.add(subgraph);
            mermaidGraph += `\tsubgraph ${subgraph}\n`;
        }
        for (const edge of edges) {
            const { source, target, data, conditional } = edge;
            let edgeLabel = "";
            if (data !== undefined) {
                let edgeData = data;
                const words = edgeData.split(" ");
                if (words.length > wrapLabelNWords) {
                    edgeData = Array.from({ length: Math.ceil(words.length / wrapLabelNWords) }, (_, i) => words
                        .slice(i * wrapLabelNWords, (i + 1) * wrapLabelNWords)
                        .join(" ")).join("&nbsp;<br>&nbsp;");
                }
                edgeLabel = conditional
                    ? ` -. &nbsp;${edgeData}&nbsp; .-> `
                    : ` -- &nbsp;${edgeData}&nbsp; --> `;
            }
            else {
                edgeLabel = conditional ? " -.-> " : " --> ";
            }
            mermaidGraph += `\t${_escapeNodeLabel(source)}${edgeLabel}${_escapeNodeLabel(target)};\n`;
        }
        // Recursively add nested subgraphs
        for (const nestedPrefix in edgeGroups) {
            if (nestedPrefix.startsWith(`${prefix}:`) && nestedPrefix !== prefix) {
                addSubgraph(edgeGroups[nestedPrefix], nestedPrefix);
            }
        }
        if (prefix && !selfLoop) {
            mermaidGraph += "\tend\n";
        }
    }
    // Start with the top-level edges (no common prefix)
    addSubgraph(edgeGroups[""] ?? [], "");
    // Add remaining subgraphs
    for (const prefix in edgeGroups) {
        if (!prefix.includes(":") && prefix !== "") {
            addSubgraph(edgeGroups[prefix], prefix);
        }
    }
    // Add custom styles for nodes
    if (withStyles) {
        mermaidGraph += _generateMermaidGraphStyles(nodeColors ?? {});
    }
    return mermaidGraph;
}
/**
 * Renders Mermaid graph using the Mermaid.INK API.
 */
async function drawMermaidPng(mermaidSyntax, config) {
    let { backgroundColor = "white" } = config ?? {};
    // Use btoa for compatibility, assume ASCII
    const mermaidSyntaxEncoded = btoa(mermaidSyntax);
    // Check if the background color is a hexadecimal color code using regex
    if (backgroundColor !== undefined) {
        const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
        if (!hexColorPattern.test(backgroundColor)) {
            backgroundColor = `!${backgroundColor}`;
        }
    }
    const imageUrl = `https://mermaid.ink/img/${mermaidSyntaxEncoded}?bgColor=${backgroundColor}`;
    const res = await fetch(imageUrl);
    if (!res.ok) {
        throw new Error([
            `Failed to render the graph using the Mermaid.INK API.`,
            `Status code: ${res.status}`,
            `Status text: ${res.statusText}`,
        ].join("\n"));
    }
    const content = await res.blob();
    return content;
}

function nodeDataStr(id, data) {
    if (id !== undefined && !validate$1(id)) {
        return id;
    }
    else if (isRunnableInterface(data)) {
        try {
            let dataStr = data.getName();
            dataStr = dataStr.startsWith("Runnable")
                ? dataStr.slice("Runnable".length)
                : dataStr;
            return dataStr;
        }
        catch (error) {
            return data.getName();
        }
    }
    else {
        return data.name ?? "UnknownSchema";
    }
}
function nodeDataJson(node) {
    // if node.data implements Runnable
    if (isRunnableInterface(node.data)) {
        return {
            type: "runnable",
            data: {
                id: node.data.lc_id,
                name: node.data.getName(),
            },
        };
    }
    else {
        return {
            type: "schema",
            data: { ...zodToJsonSchema(node.data.schema), title: node.data.name },
        };
    }
}
class Graph {
    constructor(params) {
        Object.defineProperty(this, "nodes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "edges", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.nodes = params?.nodes ?? this.nodes;
        this.edges = params?.edges ?? this.edges;
    }
    // Convert the graph to a JSON-serializable format.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toJSON() {
        const stableNodeIds = {};
        Object.values(this.nodes).forEach((node, i) => {
            stableNodeIds[node.id] = validate$1(node.id) ? i : node.id;
        });
        return {
            nodes: Object.values(this.nodes).map((node) => ({
                id: stableNodeIds[node.id],
                ...nodeDataJson(node),
            })),
            edges: this.edges.map((edge) => {
                const item = {
                    source: stableNodeIds[edge.source],
                    target: stableNodeIds[edge.target],
                };
                if (typeof edge.data !== "undefined") {
                    item.data = edge.data;
                }
                if (typeof edge.conditional !== "undefined") {
                    item.conditional = edge.conditional;
                }
                return item;
            }),
        };
    }
    addNode(data, id, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata) {
        if (id !== undefined && this.nodes[id] !== undefined) {
            throw new Error(`Node with id ${id} already exists`);
        }
        const nodeId = id ?? v4();
        const node = {
            id: nodeId,
            data,
            name: nodeDataStr(id, data),
            metadata,
        };
        this.nodes[nodeId] = node;
        return node;
    }
    removeNode(node) {
        // Remove the node from the nodes map
        delete this.nodes[node.id];
        // Filter out edges connected to the node
        this.edges = this.edges.filter((edge) => edge.source !== node.id && edge.target !== node.id);
    }
    addEdge(source, target, data, conditional) {
        if (this.nodes[source.id] === undefined) {
            throw new Error(`Source node ${source.id} not in graph`);
        }
        if (this.nodes[target.id] === undefined) {
            throw new Error(`Target node ${target.id} not in graph`);
        }
        const edge = {
            source: source.id,
            target: target.id,
            data,
            conditional,
        };
        this.edges.push(edge);
        return edge;
    }
    firstNode() {
        return _firstNode(this);
    }
    lastNode() {
        return _lastNode(this);
    }
    /**
     * Add all nodes and edges from another graph.
     * Note this doesn't check for duplicates, nor does it connect the graphs.
     */
    extend(graph, prefix = "") {
        let finalPrefix = prefix;
        const nodeIds = Object.values(graph.nodes).map((node) => node.id);
        if (nodeIds.every(validate$1)) {
            finalPrefix = "";
        }
        const prefixed = (id) => {
            return finalPrefix ? `${finalPrefix}:${id}` : id;
        };
        Object.entries(graph.nodes).forEach(([key, value]) => {
            this.nodes[prefixed(key)] = { ...value, id: prefixed(key) };
        });
        const newEdges = graph.edges.map((edge) => {
            return {
                ...edge,
                source: prefixed(edge.source),
                target: prefixed(edge.target),
            };
        });
        // Add all edges from the other graph
        this.edges = [...this.edges, ...newEdges];
        const first = graph.firstNode();
        const last = graph.lastNode();
        return [
            first ? { id: prefixed(first.id), data: first.data } : undefined,
            last ? { id: prefixed(last.id), data: last.data } : undefined,
        ];
    }
    trimFirstNode() {
        const firstNode = this.firstNode();
        if (firstNode && _firstNode(this, [firstNode.id])) {
            this.removeNode(firstNode);
        }
    }
    trimLastNode() {
        const lastNode = this.lastNode();
        if (lastNode && _lastNode(this, [lastNode.id])) {
            this.removeNode(lastNode);
        }
    }
    /**
     * Return a new graph with all nodes re-identified,
     * using their unique, readable names where possible.
     */
    reid() {
        const nodeLabels = Object.fromEntries(Object.values(this.nodes).map((node) => [node.id, node.name]));
        const nodeLabelCounts = new Map();
        Object.values(nodeLabels).forEach((label) => {
            nodeLabelCounts.set(label, (nodeLabelCounts.get(label) || 0) + 1);
        });
        const getNodeId = (nodeId) => {
            const label = nodeLabels[nodeId];
            if (validate$1(nodeId) && nodeLabelCounts.get(label) === 1) {
                return label;
            }
            else {
                return nodeId;
            }
        };
        return new Graph({
            nodes: Object.fromEntries(Object.entries(this.nodes).map(([id, node]) => [
                getNodeId(id),
                { ...node, id: getNodeId(id) },
            ])),
            edges: this.edges.map((edge) => ({
                ...edge,
                source: getNodeId(edge.source),
                target: getNodeId(edge.target),
            })),
        });
    }
    drawMermaid(params) {
        const { withStyles, curveStyle, nodeColors = {
            default: "fill:#f2f0ff,line-height:1.2",
            first: "fill-opacity:0",
            last: "fill:#bfb6fc",
        }, wrapLabelNWords, } = params ?? {};
        const graph = this.reid();
        const firstNode = graph.firstNode();
        const lastNode = graph.lastNode();
        return drawMermaid(graph.nodes, graph.edges, {
            firstNode: firstNode?.id,
            lastNode: lastNode?.id,
            withStyles,
            curveStyle,
            nodeColors,
            wrapLabelNWords,
        });
    }
    async drawMermaidPng(params) {
        const mermaidSyntax = this.drawMermaid(params);
        return drawMermaidPng(mermaidSyntax, {
            backgroundColor: params?.backgroundColor,
        });
    }
}
/**
 * Find the single node that is not a target of any edge.
 * Exclude nodes/sources with ids in the exclude list.
 * If there is no such node, or there are multiple, return undefined.
 * When drawing the graph, this node would be the origin.
 */
function _firstNode(graph, exclude = []) {
    const targets = new Set(graph.edges
        .filter((edge) => !exclude.includes(edge.source))
        .map((edge) => edge.target));
    const found = [];
    for (const node of Object.values(graph.nodes)) {
        if (!exclude.includes(node.id) && !targets.has(node.id)) {
            found.push(node);
        }
    }
    return found.length === 1 ? found[0] : undefined;
}
/**
 * Find the single node that is not a source of any edge.
 * Exclude nodes/targets with ids in the exclude list.
 * If there is no such node, or there are multiple, return undefined.
 * When drawing the graph, this node would be the destination.
 */
function _lastNode(graph, exclude = []) {
    const sources = new Set(graph.edges
        .filter((edge) => !exclude.includes(edge.target))
        .map((edge) => edge.source));
    const found = [];
    for (const node of Object.values(graph.nodes)) {
        if (!exclude.includes(node.id) && !sources.has(node.id)) {
            found.push(node);
        }
    }
    return found.length === 1 ? found[0] : undefined;
}

function convertToHttpEventStream(stream) {
    const encoder = new TextEncoder();
    const finalStream = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                controller.enqueue(encoder.encode(`event: data\ndata: ${JSON.stringify(chunk)}\n\n`));
            }
            controller.enqueue(encoder.encode("event: end\n\n"));
            controller.close();
        },
    });
    return IterableReadableStream.fromReadableStream(finalStream);
}

function isIterableIterator(thing) {
    return (typeof thing === "object" &&
        thing !== null &&
        typeof thing[Symbol.iterator] === "function" &&
        // avoid detecting array/set as iterator
        typeof thing.next === "function");
}
const isIterator = (x) => x != null &&
    typeof x === "object" &&
    "next" in x &&
    typeof x.next === "function";
function isAsyncIterable(thing) {
    return (typeof thing === "object" &&
        thing !== null &&
        typeof thing[Symbol.asyncIterator] ===
            "function");
}
function* consumeIteratorInContext(context, iter) {
    while (true) {
        const { value, done } = AsyncLocalStorageProviderSingleton.runWithConfig(context, iter.next.bind(iter), true);
        if (done) {
            break;
        }
        else {
            yield value;
        }
    }
}
async function* consumeAsyncIterableInContext(context, iter) {
    const iterator = iter[Symbol.asyncIterator]();
    while (true) {
        const { value, done } = await AsyncLocalStorageProviderSingleton.runWithConfig(context, iterator.next.bind(iter), true);
        if (done) {
            break;
        }
        else {
            yield value;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _coerceToDict(value, defaultKey) {
    return value &&
        !Array.isArray(value) &&
        // eslint-disable-next-line no-instanceof/no-instanceof
        !(value instanceof Date) &&
        typeof value === "object"
        ? value
        : { [defaultKey]: value };
}
/**
 * A Runnable is a generic unit of work that can be invoked, batched, streamed, and/or
 * transformed.
 */
class Runnable extends Serializable {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "lc_runnable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    getName(suffix) {
        const name = 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.name ?? this.constructor.lc_name() ?? this.constructor.name;
        return suffix ? `${name}${suffix}` : name;
    }
    /**
     * Bind arguments to a Runnable, returning a new Runnable.
     * @param kwargs
     * @returns A new RunnableBinding that, when invoked, will apply the bound args.
     */
    bind(kwargs) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableBinding({ bound: this, kwargs, config: {} });
    }
    /**
     * Return a new Runnable that maps a list of inputs to a list of outputs,
     * by calling invoke() with each input.
     */
    map() {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableEach({ bound: this });
    }
    /**
     * Add retry logic to an existing runnable.
     * @param kwargs
     * @returns A new RunnableRetry that, when invoked, will retry according to the parameters.
     */
    withRetry(fields) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableRetry({
            bound: this,
            kwargs: {},
            config: {},
            maxAttemptNumber: fields?.stopAfterAttempt,
            ...fields,
        });
    }
    /**
     * Bind config to a Runnable, returning a new Runnable.
     * @param config New configuration parameters to attach to the new runnable.
     * @returns A new RunnableBinding with a config matching what's passed.
     */
    withConfig(config) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableBinding({
            bound: this,
            config,
            kwargs: {},
        });
    }
    /**
     * Create a new runnable from the current one that will try invoking
     * other passed fallback runnables if the initial invocation fails.
     * @param fields.fallbacks Other runnables to call if the runnable errors.
     * @returns A new RunnableWithFallbacks.
     */
    withFallbacks(fields) {
        const fallbacks = Array.isArray(fields) ? fields : fields.fallbacks;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableWithFallbacks({
            runnable: this,
            fallbacks,
        });
    }
    _getOptionsList(options, length = 0) {
        if (Array.isArray(options) && options.length !== length) {
            throw new Error(`Passed "options" must be an array with the same length as the inputs, but got ${options.length} options for ${length} inputs`);
        }
        if (Array.isArray(options)) {
            return options.map(ensureConfig);
        }
        if (length > 1 && !Array.isArray(options) && options.runId) {
            console.warn("Provided runId will be used only for the first element of the batch.");
            const subsequent = Object.fromEntries(Object.entries(options).filter(([key]) => key !== "runId"));
            return Array.from({ length }, (_, i) => ensureConfig(i === 0 ? options : subsequent));
        }
        return Array.from({ length }, () => ensureConfig(options));
    }
    async batch(inputs, options, batchOptions) {
        const configList = this._getOptionsList(options ?? {}, inputs.length);
        const maxConcurrency = configList[0]?.maxConcurrency ?? batchOptions?.maxConcurrency;
        const caller = new AsyncCaller({
            maxConcurrency,
            onFailedAttempt: (e) => {
                throw e;
            },
        });
        const batchCalls = inputs.map((input, i) => caller.call(async () => {
            try {
                const result = await this.invoke(input, configList[i]);
                return result;
            }
            catch (e) {
                if (batchOptions?.returnExceptions) {
                    return e;
                }
                throw e;
            }
        }));
        return Promise.all(batchCalls);
    }
    /**
     * Default streaming implementation.
     * Subclasses should override this method if they support streaming output.
     * @param input
     * @param options
     */
    async *_streamIterator(input, options) {
        yield this.invoke(input, options);
    }
    /**
     * Stream output in chunks.
     * @param input
     * @param options
     * @returns A readable stream that is also an iterable.
     */
    async stream(input, options) {
        // Buffer the first streamed chunk to allow for initial errors
        // to surface immediately.
        const config = ensureConfig(options);
        const wrappedGenerator = new AsyncGeneratorWithSetup({
            generator: this._streamIterator(input, config),
            config,
        });
        await wrappedGenerator.setup;
        return IterableReadableStream.fromAsyncGenerator(wrappedGenerator);
    }
    _separateRunnableConfigFromCallOptions(options) {
        let runnableConfig;
        if (options === undefined) {
            runnableConfig = ensureConfig(options);
        }
        else {
            runnableConfig = ensureConfig({
                callbacks: options.callbacks,
                tags: options.tags,
                metadata: options.metadata,
                runName: options.runName,
                configurable: options.configurable,
                recursionLimit: options.recursionLimit,
                maxConcurrency: options.maxConcurrency,
                runId: options.runId,
                timeout: options.timeout,
                signal: options.signal,
            });
        }
        const callOptions = { ...options };
        delete callOptions.callbacks;
        delete callOptions.tags;
        delete callOptions.metadata;
        delete callOptions.runName;
        delete callOptions.configurable;
        delete callOptions.recursionLimit;
        delete callOptions.maxConcurrency;
        delete callOptions.runId;
        delete callOptions.timeout;
        delete callOptions.signal;
        return [runnableConfig, callOptions];
    }
    async _callWithConfig(func, input, options) {
        const config = ensureConfig(options);
        const callbackManager_ = await getCallbackManagerForConfig(config);
        const runManager = await callbackManager_?.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), config.runId, config?.runType, undefined, undefined, config?.runName ?? this.getName());
        delete config.runId;
        let output;
        try {
            const promise = func.call(this, input, config, runManager);
            output = await raceWithSignal(promise, options?.signal);
        }
        catch (e) {
            await runManager?.handleChainError(e);
            throw e;
        }
        await runManager?.handleChainEnd(_coerceToDict(output, "output"));
        return output;
    }
    /**
     * Internal method that handles batching and configuration for a runnable
     * It takes a function, input values, and optional configuration, and
     * returns a promise that resolves to the output values.
     * @param func The function to be executed for each input value.
     * @param input The input values to be processed.
     * @param config Optional configuration for the function execution.
     * @returns A promise that resolves to the output values.
     */
    async _batchWithConfig(func, inputs, options, batchOptions) {
        const optionsList = this._getOptionsList(options ?? {}, inputs.length);
        const callbackManagers = await Promise.all(optionsList.map(getCallbackManagerForConfig));
        const runManagers = await Promise.all(callbackManagers.map(async (callbackManager, i) => {
            const handleStartRes = await callbackManager?.handleChainStart(this.toJSON(), _coerceToDict(inputs[i], "input"), optionsList[i].runId, optionsList[i].runType, undefined, undefined, optionsList[i].runName ?? this.getName());
            delete optionsList[i].runId;
            return handleStartRes;
        }));
        let outputs;
        try {
            const promise = func.call(this, inputs, optionsList, runManagers, batchOptions);
            outputs = await raceWithSignal(promise, optionsList?.[0]?.signal);
        }
        catch (e) {
            await Promise.all(runManagers.map((runManager) => runManager?.handleChainError(e)));
            throw e;
        }
        await Promise.all(runManagers.map((runManager) => runManager?.handleChainEnd(_coerceToDict(outputs, "output"))));
        return outputs;
    }
    /**
     * Helper method to transform an Iterator of Input values into an Iterator of
     * Output values, with callbacks.
     * Use this to implement `stream()` or `transform()` in Runnable subclasses.
     */
    async *_transformStreamWithConfig(inputGenerator, transformer, options) {
        let finalInput;
        let finalInputSupported = true;
        let finalOutput;
        let finalOutputSupported = true;
        const config = ensureConfig(options);
        const callbackManager_ = await getCallbackManagerForConfig(config);
        async function* wrapInputForTracing() {
            for await (const chunk of inputGenerator) {
                if (finalInputSupported) {
                    if (finalInput === undefined) {
                        finalInput = chunk;
                    }
                    else {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            finalInput = concat(finalInput, chunk);
                        }
                        catch {
                            finalInput = undefined;
                            finalInputSupported = false;
                        }
                    }
                }
                yield chunk;
            }
        }
        let runManager;
        try {
            const pipe = await pipeGeneratorWithSetup(transformer.bind(this), wrapInputForTracing(), async () => callbackManager_?.handleChainStart(this.toJSON(), { input: "" }, config.runId, config.runType, undefined, undefined, config.runName ?? this.getName()), options?.signal, config);
            delete config.runId;
            runManager = pipe.setup;
            const streamEventsHandler = runManager?.handlers.find(isStreamEventsHandler);
            let iterator = pipe.output;
            if (streamEventsHandler !== undefined && runManager !== undefined) {
                iterator = streamEventsHandler.tapOutputIterable(runManager.runId, iterator);
            }
            const streamLogHandler = runManager?.handlers.find(isLogStreamHandler);
            if (streamLogHandler !== undefined && runManager !== undefined) {
                iterator = streamLogHandler.tapOutputIterable(runManager.runId, iterator);
            }
            for await (const chunk of iterator) {
                yield chunk;
                if (finalOutputSupported) {
                    if (finalOutput === undefined) {
                        finalOutput = chunk;
                    }
                    else {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            finalOutput = concat(finalOutput, chunk);
                        }
                        catch {
                            finalOutput = undefined;
                            finalOutputSupported = false;
                        }
                    }
                }
            }
        }
        catch (e) {
            await runManager?.handleChainError(e, undefined, undefined, undefined, {
                inputs: _coerceToDict(finalInput, "input"),
            });
            throw e;
        }
        await runManager?.handleChainEnd(finalOutput ?? {}, undefined, undefined, undefined, { inputs: _coerceToDict(finalInput, "input") });
    }
    getGraph(_) {
        const graph = new Graph();
        // TODO: Add input schema for runnables
        const inputNode = graph.addNode({
            name: `${this.getName()}Input`,
            schema: z.any(),
        });
        const runnableNode = graph.addNode(this);
        // TODO: Add output schemas for runnables
        const outputNode = graph.addNode({
            name: `${this.getName()}Output`,
            schema: z.any(),
        });
        graph.addEdge(inputNode, runnableNode);
        graph.addEdge(runnableNode, outputNode);
        return graph;
    }
    /**
     * Create a new runnable sequence that runs each individual runnable in series,
     * piping the output of one runnable into another runnable or runnable-like.
     * @param coerceable A runnable, function, or object whose values are functions or runnables.
     * @returns A new runnable sequence.
     */
    pipe(coerceable) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableSequence({
            first: this,
            last: _coerceToRunnable(coerceable),
        });
    }
    /**
     * Pick keys from the dict output of this runnable. Returns a new runnable.
     */
    pick(keys) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return this.pipe(new RunnablePick(keys));
    }
    /**
     * Assigns new fields to the dict output of this runnable. Returns a new runnable.
     */
    assign(mapping) {
        return this.pipe(
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        new RunnableAssign(
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        new RunnableMap({ steps: mapping })));
    }
    /**
     * Default implementation of transform, which buffers input and then calls stream.
     * Subclasses should override this method if they can start producing output while
     * input is still being generated.
     * @param generator
     * @param options
     */
    async *transform(generator, options) {
        let finalChunk;
        for await (const chunk of generator) {
            if (finalChunk === undefined) {
                finalChunk = chunk;
            }
            else {
                // Make a best effort to gather, for any type that supports concat.
                // This method should throw an error if gathering fails.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                finalChunk = concat(finalChunk, chunk);
            }
        }
        yield* this._streamIterator(finalChunk, ensureConfig(options));
    }
    /**
     * Stream all output from a runnable, as reported to the callback system.
     * This includes all inner runs of LLMs, Retrievers, Tools, etc.
     * Output is streamed as Log objects, which include a list of
     * jsonpatch ops that describe how the state of the run has changed in each
     * step, and the final state of the run.
     * The jsonpatch ops can be applied in order to construct state.
     * @param input
     * @param options
     * @param streamOptions
     */
    async *streamLog(input, options, streamOptions) {
        const logStreamCallbackHandler = new LogStreamCallbackHandler({
            ...streamOptions,
            autoClose: false,
            _schemaFormat: "original",
        });
        const config = ensureConfig(options);
        yield* this._streamLog(input, logStreamCallbackHandler, config);
    }
    async *_streamLog(input, logStreamCallbackHandler, config) {
        const { callbacks } = config;
        if (callbacks === undefined) {
            // eslint-disable-next-line no-param-reassign
            config.callbacks = [logStreamCallbackHandler];
        }
        else if (Array.isArray(callbacks)) {
            // eslint-disable-next-line no-param-reassign
            config.callbacks = callbacks.concat([logStreamCallbackHandler]);
        }
        else {
            const copiedCallbacks = callbacks.copy();
            copiedCallbacks.addHandler(logStreamCallbackHandler, true);
            // eslint-disable-next-line no-param-reassign
            config.callbacks = copiedCallbacks;
        }
        const runnableStreamPromise = this.stream(input, config);
        async function consumeRunnableStream() {
            try {
                const runnableStream = await runnableStreamPromise;
                for await (const chunk of runnableStream) {
                    const patch = new RunLogPatch({
                        ops: [
                            {
                                op: "add",
                                path: "/streamed_output/-",
                                value: chunk,
                            },
                        ],
                    });
                    await logStreamCallbackHandler.writer.write(patch);
                }
            }
            finally {
                await logStreamCallbackHandler.writer.close();
            }
        }
        const runnableStreamConsumePromise = consumeRunnableStream();
        try {
            for await (const log of logStreamCallbackHandler) {
                yield log;
            }
        }
        finally {
            await runnableStreamConsumePromise;
        }
    }
    streamEvents(input, options, streamOptions) {
        let stream;
        if (options.version === "v1") {
            stream = this._streamEventsV1(input, options, streamOptions);
        }
        else if (options.version === "v2") {
            stream = this._streamEventsV2(input, options, streamOptions);
        }
        else {
            throw new Error(`Only versions "v1" and "v2" of the schema are currently supported.`);
        }
        if (options.encoding === "text/event-stream") {
            return convertToHttpEventStream(stream);
        }
        else {
            return IterableReadableStream.fromAsyncGenerator(stream);
        }
    }
    async *_streamEventsV2(input, options, streamOptions) {
        const eventStreamer = new EventStreamCallbackHandler({
            ...streamOptions,
            autoClose: false,
        });
        const config = ensureConfig(options);
        const runId = config.runId ?? v4();
        config.runId = runId;
        const callbacks = config.callbacks;
        if (callbacks === undefined) {
            config.callbacks = [eventStreamer];
        }
        else if (Array.isArray(callbacks)) {
            config.callbacks = callbacks.concat(eventStreamer);
        }
        else {
            const copiedCallbacks = callbacks.copy();
            copiedCallbacks.addHandler(eventStreamer, true);
            // eslint-disable-next-line no-param-reassign
            config.callbacks = copiedCallbacks;
        }
        // Call the runnable in streaming mode,
        // add each chunk to the output stream
        const outerThis = this;
        async function consumeRunnableStream() {
            try {
                const runnableStream = await outerThis.stream(input, config);
                const tappedStream = eventStreamer.tapOutputIterable(runId, runnableStream);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _ of tappedStream) {
                    // Just iterate so that the callback handler picks up events
                }
            }
            finally {
                await eventStreamer.finish();
            }
        }
        const runnableStreamConsumePromise = consumeRunnableStream();
        let firstEventSent = false;
        let firstEventRunId;
        try {
            for await (const event of eventStreamer) {
                // This is a work-around an issue where the inputs into the
                // chain are not available until the entire input is consumed.
                // As a temporary solution, we'll modify the input to be the input
                // that was passed into the chain.
                if (!firstEventSent) {
                    event.data.input = input;
                    firstEventSent = true;
                    firstEventRunId = event.run_id;
                    yield event;
                    continue;
                }
                if (event.run_id === firstEventRunId && event.event.endsWith("_end")) {
                    // If it's the end event corresponding to the root runnable
                    // we dont include the input in the event since it's guaranteed
                    // to be included in the first event.
                    if (event.data?.input) {
                        delete event.data.input;
                    }
                }
                yield event;
            }
        }
        finally {
            await runnableStreamConsumePromise;
        }
    }
    async *_streamEventsV1(input, options, streamOptions) {
        let runLog;
        let hasEncounteredStartEvent = false;
        const config = ensureConfig(options);
        const rootTags = config.tags ?? [];
        const rootMetadata = config.metadata ?? {};
        const rootName = config.runName ?? this.getName();
        const logStreamCallbackHandler = new LogStreamCallbackHandler({
            ...streamOptions,
            autoClose: false,
            _schemaFormat: "streaming_events",
        });
        const rootEventFilter = new _RootEventFilter({
            ...streamOptions,
        });
        const logStream = this._streamLog(input, logStreamCallbackHandler, config);
        for await (const log of logStream) {
            if (!runLog) {
                runLog = RunLog.fromRunLogPatch(log);
            }
            else {
                runLog = runLog.concat(log);
            }
            if (runLog.state === undefined) {
                throw new Error(`Internal error: "streamEvents" state is missing. Please open a bug report.`);
            }
            // Yield the start event for the root runnable if it hasn't been seen.
            // The root run is never filtered out
            if (!hasEncounteredStartEvent) {
                hasEncounteredStartEvent = true;
                const state = { ...runLog.state };
                const event = {
                    run_id: state.id,
                    event: `on_${state.type}_start`,
                    name: rootName,
                    tags: rootTags,
                    metadata: rootMetadata,
                    data: {
                        input,
                    },
                };
                if (rootEventFilter.includeEvent(event, state.type)) {
                    yield event;
                }
            }
            const paths = log.ops
                .filter((op) => op.path.startsWith("/logs/"))
                .map((op) => op.path.split("/")[2]);
            const dedupedPaths = [...new Set(paths)];
            for (const path of dedupedPaths) {
                let eventType;
                let data = {};
                const logEntry = runLog.state.logs[path];
                if (logEntry.end_time === undefined) {
                    if (logEntry.streamed_output.length > 0) {
                        eventType = "stream";
                    }
                    else {
                        eventType = "start";
                    }
                }
                else {
                    eventType = "end";
                }
                if (eventType === "start") {
                    // Include the inputs with the start event if they are available.
                    // Usually they will NOT be available for components that operate
                    // on streams, since those components stream the input and
                    // don't know its final value until the end of the stream.
                    if (logEntry.inputs !== undefined) {
                        data.input = logEntry.inputs;
                    }
                }
                else if (eventType === "end") {
                    if (logEntry.inputs !== undefined) {
                        data.input = logEntry.inputs;
                    }
                    data.output = logEntry.final_output;
                }
                else if (eventType === "stream") {
                    const chunkCount = logEntry.streamed_output.length;
                    if (chunkCount !== 1) {
                        throw new Error(`Expected exactly one chunk of streamed output, got ${chunkCount} instead. Encountered in: "${logEntry.name}"`);
                    }
                    data = { chunk: logEntry.streamed_output[0] };
                    // Clean up the stream, we don't need it anymore.
                    // And this avoids duplicates as well!
                    logEntry.streamed_output = [];
                }
                yield {
                    event: `on_${logEntry.type}_${eventType}`,
                    name: logEntry.name,
                    run_id: logEntry.id,
                    tags: logEntry.tags,
                    metadata: logEntry.metadata,
                    data,
                };
            }
            // Finally, we take care of the streaming output from the root chain
            // if there is any.
            const { state } = runLog;
            if (state.streamed_output.length > 0) {
                const chunkCount = state.streamed_output.length;
                if (chunkCount !== 1) {
                    throw new Error(`Expected exactly one chunk of streamed output, got ${chunkCount} instead. Encountered in: "${state.name}"`);
                }
                const data = { chunk: state.streamed_output[0] };
                // Clean up the stream, we don't need it anymore.
                state.streamed_output = [];
                const event = {
                    event: `on_${state.type}_stream`,
                    run_id: state.id,
                    tags: rootTags,
                    metadata: rootMetadata,
                    name: rootName,
                    data,
                };
                if (rootEventFilter.includeEvent(event, state.type)) {
                    yield event;
                }
            }
        }
        const state = runLog?.state;
        if (state !== undefined) {
            // Finally, yield the end event for the root runnable.
            const event = {
                event: `on_${state.type}_end`,
                name: rootName,
                run_id: state.id,
                tags: rootTags,
                metadata: rootMetadata,
                data: {
                    output: state.final_output,
                },
            };
            if (rootEventFilter.includeEvent(event, state.type))
                yield event;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static isRunnable(thing) {
        return isRunnableInterface(thing);
    }
    /**
     * Bind lifecycle listeners to a Runnable, returning a new Runnable.
     * The Run object contains information about the run, including its id,
     * type, input, output, error, startTime, endTime, and any tags or metadata
     * added to the run.
     *
     * @param {Object} params - The object containing the callback functions.
     * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
     * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
     * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
     */
    withListeners({ onStart, onEnd, onError, }) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return new RunnableBinding({
            bound: this,
            config: {},
            configFactories: [
                (config) => ({
                    callbacks: [
                        new RootListenersTracer({
                            config,
                            onStart,
                            onEnd,
                            onError,
                        }),
                    ],
                }),
            ],
        });
    }
    /**
     * Convert a runnable to a tool. Return a new instance of `RunnableToolLike`
     * which contains the runnable, name, description and schema.
     *
     * @template {T extends RunInput = RunInput} RunInput - The input type of the runnable. Should be the same as the `RunInput` type of the runnable.
     *
     * @param fields
     * @param {string | undefined} [fields.name] The name of the tool. If not provided, it will default to the name of the runnable.
     * @param {string | undefined} [fields.description] The description of the tool. Falls back to the description on the Zod schema if not provided, or undefined if neither are provided.
     * @param {z.ZodType<T>} [fields.schema] The Zod schema for the input of the tool. Infers the Zod type from the input type of the runnable.
     * @returns {RunnableToolLike<z.ZodType<T>, RunOutput>} An instance of `RunnableToolLike` which is a runnable that can be used as a tool.
     */
    asTool(fields) {
        return convertRunnableToTool(this, fields);
    }
}
/**
 * A runnable that delegates calls to another runnable with a set of kwargs.
 * @example
 * ```typescript
 * import {
 *   type RunnableConfig,
 *   RunnableLambda,
 * } from "@langchain/core/runnables";
 *
 * const enhanceProfile = (
 *   profile: Record<string, any>,
 *   config?: RunnableConfig
 * ) => {
 *   if (config?.configurable?.role) {
 *     return { ...profile, role: config.configurable.role };
 *   }
 *   return profile;
 * };
 *
 * const runnable = RunnableLambda.from(enhanceProfile);
 *
 * // Bind configuration to the runnable to set the user's role dynamically
 * const adminRunnable = runnable.bind({ configurable: { role: "Admin" } });
 * const userRunnable = runnable.bind({ configurable: { role: "User" } });
 *
 * const result1 = await adminRunnable.invoke({
 *   name: "Alice",
 *   email: "alice@example.com"
 * });
 *
 * // { name: "Alice", email: "alice@example.com", role: "Admin" }
 *
 * const result2 = await userRunnable.invoke({
 *   name: "Bob",
 *   email: "bob@example.com"
 * });
 *
 * // { name: "Bob", email: "bob@example.com", role: "User" }
 * ```
 */
class RunnableBinding extends Runnable {
    static lc_name() {
        return "RunnableBinding";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "bound", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "kwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "configFactories", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.bound = fields.bound;
        this.kwargs = fields.kwargs;
        this.config = fields.config;
        this.configFactories = fields.configFactories;
    }
    getName(suffix) {
        return this.bound.getName(suffix);
    }
    async _mergeConfig(...options) {
        const config = mergeConfigs(this.config, ...options);
        return mergeConfigs(config, ...(this.configFactories
            ? await Promise.all(this.configFactories.map(async (configFactory) => await configFactory(config)))
            : []));
    }
    bind(kwargs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new this.constructor({
            bound: this.bound,
            kwargs: { ...this.kwargs, ...kwargs },
            config: this.config,
        });
    }
    withConfig(config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new this.constructor({
            bound: this.bound,
            kwargs: this.kwargs,
            config: { ...this.config, ...config },
        });
    }
    withRetry(fields) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new this.constructor({
            bound: this.bound.withRetry(fields),
            kwargs: this.kwargs,
            config: this.config,
        });
    }
    async invoke(input, options) {
        return this.bound.invoke(input, await this._mergeConfig(ensureConfig(options), this.kwargs));
    }
    async batch(inputs, options, batchOptions) {
        const mergedOptions = Array.isArray(options)
            ? await Promise.all(options.map(async (individualOption) => this._mergeConfig(ensureConfig(individualOption), this.kwargs)))
            : await this._mergeConfig(ensureConfig(options), this.kwargs);
        return this.bound.batch(inputs, mergedOptions, batchOptions);
    }
    async *_streamIterator(input, options) {
        yield* this.bound._streamIterator(input, await this._mergeConfig(ensureConfig(options), this.kwargs));
    }
    async stream(input, options) {
        return this.bound.stream(input, await this._mergeConfig(ensureConfig(options), this.kwargs));
    }
    async *transform(generator, options) {
        yield* this.bound.transform(generator, await this._mergeConfig(ensureConfig(options), this.kwargs));
    }
    streamEvents(input, options, streamOptions) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const outerThis = this;
        const generator = async function* () {
            yield* outerThis.bound.streamEvents(input, {
                ...(await outerThis._mergeConfig(ensureConfig(options), outerThis.kwargs)),
                version: options.version,
            }, streamOptions);
        };
        return IterableReadableStream.fromAsyncGenerator(generator());
    }
    static isRunnableBinding(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
        return thing.bound && Runnable.isRunnable(thing.bound);
    }
    /**
     * Bind lifecycle listeners to a Runnable, returning a new Runnable.
     * The Run object contains information about the run, including its id,
     * type, input, output, error, startTime, endTime, and any tags or metadata
     * added to the run.
     *
     * @param {Object} params - The object containing the callback functions.
     * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
     * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
     * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
     */
    withListeners({ onStart, onEnd, onError, }) {
        return new RunnableBinding({
            bound: this.bound,
            kwargs: this.kwargs,
            config: this.config,
            configFactories: [
                (config) => ({
                    callbacks: [
                        new RootListenersTracer({
                            config,
                            onStart,
                            onEnd,
                            onError,
                        }),
                    ],
                }),
            ],
        });
    }
}
/**
 * A runnable that delegates calls to another runnable
 * with each element of the input sequence.
 * @example
 * ```typescript
 * import { RunnableEach, RunnableLambda } from "@langchain/core/runnables";
 *
 * const toUpperCase = (input: string): string => input.toUpperCase();
 * const addGreeting = (input: string): string => `Hello, ${input}!`;
 *
 * const upperCaseLambda = RunnableLambda.from(toUpperCase);
 * const greetingLambda = RunnableLambda.from(addGreeting);
 *
 * const chain = new RunnableEach({
 *   bound: upperCaseLambda.pipe(greetingLambda),
 * });
 *
 * const result = await chain.invoke(["alice", "bob", "carol"])
 *
 * // ["Hello, ALICE!", "Hello, BOB!", "Hello, CAROL!"]
 * ```
 */
class RunnableEach extends Runnable {
    static lc_name() {
        return "RunnableEach";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "bound", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.bound = fields.bound;
    }
    /**
     * Binds the runnable with the specified arguments.
     * @param kwargs The arguments to bind the runnable with.
     * @returns A new instance of the `RunnableEach` class that is bound with the specified arguments.
     */
    bind(kwargs) {
        return new RunnableEach({
            bound: this.bound.bind(kwargs),
        });
    }
    /**
     * Invokes the runnable with the specified input and configuration.
     * @param input The input to invoke the runnable with.
     * @param config The configuration to invoke the runnable with.
     * @returns A promise that resolves to the output of the runnable.
     */
    async invoke(inputs, config) {
        return this._callWithConfig(this._invoke.bind(this), inputs, config);
    }
    /**
     * A helper method that is used to invoke the runnable with the specified input and configuration.
     * @param input The input to invoke the runnable with.
     * @param config The configuration to invoke the runnable with.
     * @returns A promise that resolves to the output of the runnable.
     */
    async _invoke(inputs, config, runManager) {
        return this.bound.batch(inputs, patchConfig(config, { callbacks: runManager?.getChild() }));
    }
    /**
     * Bind lifecycle listeners to a Runnable, returning a new Runnable.
     * The Run object contains information about the run, including its id,
     * type, input, output, error, startTime, endTime, and any tags or metadata
     * added to the run.
     *
     * @param {Object} params - The object containing the callback functions.
     * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
     * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
     * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
     */
    withListeners({ onStart, onEnd, onError, }) {
        return new RunnableEach({
            bound: this.bound.withListeners({ onStart, onEnd, onError }),
        });
    }
}
/**
 * Base class for runnables that can be retried a
 * specified number of times.
 * @example
 * ```typescript
 * import {
 *   RunnableLambda,
 *   RunnableRetry,
 * } from "@langchain/core/runnables";
 *
 * // Simulate an API call that fails
 * const simulateApiCall = (input: string): string => {
 *   console.log(`Attempting API call with input: ${input}`);
 *   throw new Error("API call failed due to network issue");
 * };
 *
 * const apiCallLambda = RunnableLambda.from(simulateApiCall);
 *
 * // Apply retry logic using the .withRetry() method
 * const apiCallWithRetry = apiCallLambda.withRetry({ stopAfterAttempt: 3 });
 *
 * // Alternatively, create a RunnableRetry instance manually
 * const manualRetry = new RunnableRetry({
 *   bound: apiCallLambda,
 *   maxAttemptNumber: 3,
 *   config: {},
 * });
 *
 * // Example invocation using the .withRetry() method
 * const res = await apiCallWithRetry
 *   .invoke("Request 1")
 *   .catch((error) => {
 *     console.error("Failed after multiple retries:", error.message);
 *   });
 *
 * // Example invocation using the manual retry instance
 * const res2 = await manualRetry
 *   .invoke("Request 2")
 *   .catch((error) => {
 *     console.error("Failed after multiple retries:", error.message);
 *   });
 * ```
 */
class RunnableRetry extends RunnableBinding {
    static lc_name() {
        return "RunnableRetry";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "maxAttemptNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.defineProperty(this, "onFailedAttempt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => { }
        });
        this.maxAttemptNumber = fields.maxAttemptNumber ?? this.maxAttemptNumber;
        this.onFailedAttempt = fields.onFailedAttempt ?? this.onFailedAttempt;
    }
    _patchConfigForRetry(attempt, config, runManager) {
        const tag = attempt > 1 ? `retry:attempt:${attempt}` : undefined;
        return patchConfig(config, { callbacks: runManager?.getChild(tag) });
    }
    async _invoke(input, config, runManager) {
        return pRetry((attemptNumber) => super.invoke(input, this._patchConfigForRetry(attemptNumber, config, runManager)), {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFailedAttempt: (error) => this.onFailedAttempt(error, input),
            retries: Math.max(this.maxAttemptNumber - 1, 0),
            randomize: true,
        });
    }
    /**
     * Method that invokes the runnable with the specified input, run manager,
     * and config. It handles the retry logic by catching any errors and
     * recursively invoking itself with the updated config for the next retry
     * attempt.
     * @param input The input for the runnable.
     * @param runManager The run manager for the runnable.
     * @param config The config for the runnable.
     * @returns A promise that resolves to the output of the runnable.
     */
    async invoke(input, config) {
        return this._callWithConfig(this._invoke.bind(this), input, config);
    }
    async _batch(inputs, configs, runManagers, batchOptions) {
        const resultsMap = {};
        try {
            await pRetry(async (attemptNumber) => {
                const remainingIndexes = inputs
                    .map((_, i) => i)
                    .filter((i) => resultsMap[i.toString()] === undefined ||
                    // eslint-disable-next-line no-instanceof/no-instanceof
                    resultsMap[i.toString()] instanceof Error);
                const remainingInputs = remainingIndexes.map((i) => inputs[i]);
                const patchedConfigs = remainingIndexes.map((i) => this._patchConfigForRetry(attemptNumber, configs?.[i], runManagers?.[i]));
                const results = await super.batch(remainingInputs, patchedConfigs, {
                    ...batchOptions,
                    returnExceptions: true,
                });
                let firstException;
                for (let i = 0; i < results.length; i += 1) {
                    const result = results[i];
                    const resultMapIndex = remainingIndexes[i];
                    // eslint-disable-next-line no-instanceof/no-instanceof
                    if (result instanceof Error) {
                        if (firstException === undefined) {
                            firstException = result;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            firstException.input = remainingInputs[i];
                        }
                    }
                    resultsMap[resultMapIndex.toString()] = result;
                }
                if (firstException) {
                    throw firstException;
                }
                return results;
            }, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onFailedAttempt: (error) => this.onFailedAttempt(error, error.input),
                retries: Math.max(this.maxAttemptNumber - 1, 0),
                randomize: true,
            });
        }
        catch (e) {
            if (batchOptions?.returnExceptions !== true) {
                throw e;
            }
        }
        return Object.keys(resultsMap)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .map((key) => resultsMap[parseInt(key, 10)]);
    }
    async batch(inputs, options, batchOptions) {
        return this._batchWithConfig(this._batch.bind(this), inputs, options, batchOptions);
    }
}
/**
 * A sequence of runnables, where the output of each is the input of the next.
 * @example
 * ```typescript
 * const promptTemplate = PromptTemplate.fromTemplate(
 *   "Tell me a joke about {topic}",
 * );
 * const chain = RunnableSequence.from([promptTemplate, new ChatOpenAI({})]);
 * const result = await chain.invoke({ topic: "bears" });
 * ```
 */
class RunnableSequence extends Runnable {
    static lc_name() {
        return "RunnableSequence";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "first", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "middle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.defineProperty(this, "last", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "omitSequenceTags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        this.first = fields.first;
        this.middle = fields.middle ?? this.middle;
        this.last = fields.last;
        this.name = fields.name;
        this.omitSequenceTags = fields.omitSequenceTags ?? this.omitSequenceTags;
    }
    get steps() {
        return [this.first, ...this.middle, this.last];
    }
    async invoke(input, options) {
        const config = ensureConfig(options);
        const callbackManager_ = await getCallbackManagerForConfig(config);
        const runManager = await callbackManager_?.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), config.runId, undefined, undefined, undefined, config?.runName);
        delete config.runId;
        let nextStepInput = input;
        let finalOutput;
        try {
            const initialSteps = [this.first, ...this.middle];
            for (let i = 0; i < initialSteps.length; i += 1) {
                const step = initialSteps[i];
                const promise = step.invoke(nextStepInput, patchConfig(config, {
                    callbacks: runManager?.getChild(this.omitSequenceTags ? undefined : `seq:step:${i + 1}`),
                }));
                nextStepInput = await raceWithSignal(promise, options?.signal);
            }
            // TypeScript can't detect that the last output of the sequence returns RunOutput, so call it out of the loop here
            if (options?.signal?.aborted) {
                throw new Error("Aborted");
            }
            finalOutput = await this.last.invoke(nextStepInput, patchConfig(config, {
                callbacks: runManager?.getChild(this.omitSequenceTags ? undefined : `seq:step:${this.steps.length}`),
            }));
        }
        catch (e) {
            await runManager?.handleChainError(e);
            throw e;
        }
        await runManager?.handleChainEnd(_coerceToDict(finalOutput, "output"));
        return finalOutput;
    }
    async batch(inputs, options, batchOptions) {
        const configList = this._getOptionsList(options ?? {}, inputs.length);
        const callbackManagers = await Promise.all(configList.map(getCallbackManagerForConfig));
        const runManagers = await Promise.all(callbackManagers.map(async (callbackManager, i) => {
            const handleStartRes = await callbackManager?.handleChainStart(this.toJSON(), _coerceToDict(inputs[i], "input"), configList[i].runId, undefined, undefined, undefined, configList[i].runName);
            delete configList[i].runId;
            return handleStartRes;
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let nextStepInputs = inputs;
        try {
            for (let i = 0; i < this.steps.length; i += 1) {
                const step = this.steps[i];
                const promise = step.batch(nextStepInputs, runManagers.map((runManager, j) => {
                    const childRunManager = runManager?.getChild(this.omitSequenceTags ? undefined : `seq:step:${i + 1}`);
                    return patchConfig(configList[j], { callbacks: childRunManager });
                }), batchOptions);
                nextStepInputs = await raceWithSignal(promise, configList[0]?.signal);
            }
        }
        catch (e) {
            await Promise.all(runManagers.map((runManager) => runManager?.handleChainError(e)));
            throw e;
        }
        await Promise.all(runManagers.map((runManager) => runManager?.handleChainEnd(_coerceToDict(nextStepInputs, "output"))));
        return nextStepInputs;
    }
    async *_streamIterator(input, options) {
        const callbackManager_ = await getCallbackManagerForConfig(options);
        const { runId, ...otherOptions } = options ?? {};
        const runManager = await callbackManager_?.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), runId, undefined, undefined, undefined, otherOptions?.runName);
        const steps = [this.first, ...this.middle, this.last];
        let concatSupported = true;
        let finalOutput;
        async function* inputGenerator() {
            yield input;
        }
        try {
            let finalGenerator = steps[0].transform(inputGenerator(), patchConfig(otherOptions, {
                callbacks: runManager?.getChild(this.omitSequenceTags ? undefined : `seq:step:1`),
            }));
            for (let i = 1; i < steps.length; i += 1) {
                const step = steps[i];
                finalGenerator = await step.transform(finalGenerator, patchConfig(otherOptions, {
                    callbacks: runManager?.getChild(this.omitSequenceTags ? undefined : `seq:step:${i + 1}`),
                }));
            }
            for await (const chunk of finalGenerator) {
                options?.signal?.throwIfAborted();
                yield chunk;
                if (concatSupported) {
                    if (finalOutput === undefined) {
                        finalOutput = chunk;
                    }
                    else {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            finalOutput = concat(finalOutput, chunk);
                        }
                        catch (e) {
                            finalOutput = undefined;
                            concatSupported = false;
                        }
                    }
                }
            }
        }
        catch (e) {
            await runManager?.handleChainError(e);
            throw e;
        }
        await runManager?.handleChainEnd(_coerceToDict(finalOutput, "output"));
    }
    getGraph(config) {
        const graph = new Graph();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let currentLastNode = null;
        this.steps.forEach((step, index) => {
            const stepGraph = step.getGraph(config);
            if (index !== 0) {
                stepGraph.trimFirstNode();
            }
            if (index !== this.steps.length - 1) {
                stepGraph.trimLastNode();
            }
            graph.extend(stepGraph);
            const stepFirstNode = stepGraph.firstNode();
            if (!stepFirstNode) {
                throw new Error(`Runnable ${step} has no first node`);
            }
            if (currentLastNode) {
                graph.addEdge(currentLastNode, stepFirstNode);
            }
            currentLastNode = stepGraph.lastNode();
        });
        return graph;
    }
    pipe(coerceable) {
        if (RunnableSequence.isRunnableSequence(coerceable)) {
            return new RunnableSequence({
                first: this.first,
                middle: this.middle.concat([
                    this.last,
                    coerceable.first,
                    ...coerceable.middle,
                ]),
                last: coerceable.last,
                name: this.name ?? coerceable.name,
            });
        }
        else {
            return new RunnableSequence({
                first: this.first,
                middle: [...this.middle, this.last],
                last: _coerceToRunnable(coerceable),
                name: this.name,
            });
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static isRunnableSequence(thing) {
        return Array.isArray(thing.middle) && Runnable.isRunnable(thing);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static from([first, ...runnables], nameOrFields) {
        let extra = {};
        if (typeof nameOrFields === "string") {
            extra.name = nameOrFields;
        }
        else if (nameOrFields !== undefined) {
            extra = nameOrFields;
        }
        return new RunnableSequence({
            ...extra,
            first: _coerceToRunnable(first),
            middle: runnables.slice(0, -1).map(_coerceToRunnable),
            last: _coerceToRunnable(runnables[runnables.length - 1]),
        });
    }
}
/**
 * A runnable that runs a mapping of runnables in parallel,
 * and returns a mapping of their outputs.
 * @example
 * ```typescript
 * const mapChain = RunnableMap.from({
 *   joke: PromptTemplate.fromTemplate("Tell me a joke about {topic}").pipe(
 *     new ChatAnthropic({}),
 *   ),
 *   poem: PromptTemplate.fromTemplate("write a 2-line poem about {topic}").pipe(
 *     new ChatAnthropic({}),
 *   ),
 * });
 * const result = await mapChain.invoke({ topic: "bear" });
 * ```
 */
class RunnableMap extends Runnable {
    static lc_name() {
        return "RunnableMap";
    }
    getStepsKeys() {
        return Object.keys(this.steps);
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "steps", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.steps = {};
        for (const [key, value] of Object.entries(fields.steps)) {
            this.steps[key] = _coerceToRunnable(value);
        }
    }
    static from(steps) {
        return new RunnableMap({ steps });
    }
    async invoke(input, options) {
        const config = ensureConfig(options);
        const callbackManager_ = await getCallbackManagerForConfig(config);
        const runManager = await callbackManager_?.handleChainStart(this.toJSON(), {
            input,
        }, config.runId, undefined, undefined, undefined, config?.runName);
        delete config.runId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = {};
        try {
            const promises = Object.entries(this.steps).map(async ([key, runnable]) => {
                output[key] = await runnable.invoke(input, patchConfig(config, {
                    callbacks: runManager?.getChild(`map:key:${key}`),
                }));
            });
            await raceWithSignal(Promise.all(promises), options?.signal);
        }
        catch (e) {
            await runManager?.handleChainError(e);
            throw e;
        }
        await runManager?.handleChainEnd(output);
        return output;
    }
    async *_transform(generator, runManager, options) {
        // shallow copy steps to ignore changes while iterating
        const steps = { ...this.steps };
        // each step gets a copy of the input iterator
        const inputCopies = atee(generator, Object.keys(steps).length);
        // start the first iteration of each output iterator
        const tasks = new Map(Object.entries(steps).map(([key, runnable], i) => {
            const gen = runnable.transform(inputCopies[i], patchConfig(options, {
                callbacks: runManager?.getChild(`map:key:${key}`),
            }));
            return [key, gen.next().then((result) => ({ key, gen, result }))];
        }));
        // yield chunks as they become available,
        // starting new iterations as needed,
        // until all iterators are done
        while (tasks.size) {
            const promise = Promise.race(tasks.values());
            const { key, result, gen } = await raceWithSignal(promise, options?.signal);
            tasks.delete(key);
            if (!result.done) {
                yield { [key]: result.value };
                tasks.set(key, gen.next().then((result) => ({ key, gen, result })));
            }
        }
    }
    transform(generator, options) {
        return this._transformStreamWithConfig(generator, this._transform.bind(this), options);
    }
    async stream(input, options) {
        async function* generator() {
            yield input;
        }
        const config = ensureConfig(options);
        const wrappedGenerator = new AsyncGeneratorWithSetup({
            generator: this.transform(generator(), config),
            config,
        });
        await wrappedGenerator.setup;
        return IterableReadableStream.fromAsyncGenerator(wrappedGenerator);
    }
}
/**
 * A runnable that wraps a traced LangSmith function.
 */
class RunnableTraceable extends Runnable {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "func", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (!isTraceableFunction(fields.func)) {
            throw new Error("RunnableTraceable requires a function that is wrapped in traceable higher-order function");
        }
        this.func = fields.func;
    }
    async invoke(input, options) {
        const [config] = this._getOptionsList(options ?? {}, 1);
        const callbacks = await getCallbackManagerForConfig(config);
        const promise = this.func(patchConfig(config, { callbacks }), input);
        return raceWithSignal(promise, config?.signal);
    }
    async *_streamIterator(input, options) {
        const [config] = this._getOptionsList(options ?? {}, 1);
        const result = await this.invoke(input, options);
        if (isAsyncIterable(result)) {
            for await (const item of result) {
                config?.signal?.throwIfAborted();
                yield item;
            }
            return;
        }
        if (isIterator(result)) {
            while (true) {
                config?.signal?.throwIfAborted();
                const state = result.next();
                if (state.done)
                    break;
                yield state.value;
            }
            return;
        }
        yield result;
    }
    static from(func) {
        return new RunnableTraceable({ func });
    }
}
function assertNonTraceableFunction(func) {
    if (isTraceableFunction(func)) {
        throw new Error("RunnableLambda requires a function that is not wrapped in traceable higher-order function. This shouldn't happen.");
    }
}
/**
 * A runnable that wraps an arbitrary function that takes a single argument.
 * @example
 * ```typescript
 * import { RunnableLambda } from "@langchain/core/runnables";
 *
 * const add = (input: { x: number; y: number }) => input.x + input.y;
 *
 * const multiply = (input: { value: number; multiplier: number }) =>
 *   input.value * input.multiplier;
 *
 * // Create runnables for the functions
 * const addLambda = RunnableLambda.from(add);
 * const multiplyLambda = RunnableLambda.from(multiply);
 *
 * // Chain the lambdas for a mathematical operation
 * const chainedLambda = addLambda.pipe((result) =>
 *   multiplyLambda.invoke({ value: result, multiplier: 2 })
 * );
 *
 * // Example invocation of the chainedLambda
 * const result = await chainedLambda.invoke({ x: 2, y: 3 });
 *
 * // Will log "10" (since (2 + 3) * 2 = 10)
 * ```
 */
class RunnableLambda extends Runnable {
    static lc_name() {
        return "RunnableLambda";
    }
    constructor(fields) {
        if (isTraceableFunction(fields.func)) {
            // eslint-disable-next-line no-constructor-return
            return RunnableTraceable.from(fields.func);
        }
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "func", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        assertNonTraceableFunction(fields.func);
        this.func = fields.func;
    }
    static from(func) {
        return new RunnableLambda({
            func,
        });
    }
    async _invoke(input, config, runManager) {
        return new Promise((resolve, reject) => {
            const childConfig = patchConfig(config, {
                callbacks: runManager?.getChild(),
                recursionLimit: (config?.recursionLimit ?? DEFAULT_RECURSION_LIMIT) - 1,
            });
            void AsyncLocalStorageProviderSingleton.runWithConfig(childConfig, async () => {
                try {
                    let output = await this.func(input, {
                        ...childConfig,
                    });
                    if (output && Runnable.isRunnable(output)) {
                        if (config?.recursionLimit === 0) {
                            throw new Error("Recursion limit reached.");
                        }
                        output = await output.invoke(input, {
                            ...childConfig,
                            recursionLimit: (childConfig.recursionLimit ?? DEFAULT_RECURSION_LIMIT) - 1,
                        });
                    }
                    else if (isAsyncIterable(output)) {
                        let finalOutput;
                        for await (const chunk of consumeAsyncIterableInContext(childConfig, output)) {
                            config?.signal?.throwIfAborted();
                            if (finalOutput === undefined) {
                                finalOutput = chunk;
                            }
                            else {
                                // Make a best effort to gather, for any type that supports concat.
                                try {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    finalOutput = concat(finalOutput, chunk);
                                }
                                catch (e) {
                                    finalOutput = chunk;
                                }
                            }
                        }
                        output = finalOutput;
                    }
                    else if (isIterableIterator(output)) {
                        let finalOutput;
                        for (const chunk of consumeIteratorInContext(childConfig, output)) {
                            config?.signal?.throwIfAborted();
                            if (finalOutput === undefined) {
                                finalOutput = chunk;
                            }
                            else {
                                // Make a best effort to gather, for any type that supports concat.
                                try {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    finalOutput = concat(finalOutput, chunk);
                                }
                                catch (e) {
                                    finalOutput = chunk;
                                }
                            }
                        }
                        output = finalOutput;
                    }
                    resolve(output);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    async invoke(input, options) {
        return this._callWithConfig(this._invoke.bind(this), input, options);
    }
    async *_transform(generator, runManager, config) {
        let finalChunk;
        for await (const chunk of generator) {
            if (finalChunk === undefined) {
                finalChunk = chunk;
            }
            else {
                // Make a best effort to gather, for any type that supports concat.
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    finalChunk = concat(finalChunk, chunk);
                }
                catch (e) {
                    finalChunk = chunk;
                }
            }
        }
        const childConfig = patchConfig(config, {
            callbacks: runManager?.getChild(),
            recursionLimit: (config?.recursionLimit ?? DEFAULT_RECURSION_LIMIT) - 1,
        });
        const output = await new Promise((resolve, reject) => {
            void AsyncLocalStorageProviderSingleton.runWithConfig(childConfig, async () => {
                try {
                    const res = await this.func(finalChunk, {
                        ...childConfig,
                        config: childConfig,
                    });
                    resolve(res);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        if (output && Runnable.isRunnable(output)) {
            if (config?.recursionLimit === 0) {
                throw new Error("Recursion limit reached.");
            }
            const stream = await output.stream(finalChunk, childConfig);
            for await (const chunk of stream) {
                yield chunk;
            }
        }
        else if (isAsyncIterable(output)) {
            for await (const chunk of consumeAsyncIterableInContext(childConfig, output)) {
                config?.signal?.throwIfAborted();
                yield chunk;
            }
        }
        else if (isIterableIterator(output)) {
            for (const chunk of consumeIteratorInContext(childConfig, output)) {
                config?.signal?.throwIfAborted();
                yield chunk;
            }
        }
        else {
            yield output;
        }
    }
    transform(generator, options) {
        return this._transformStreamWithConfig(generator, this._transform.bind(this), options);
    }
    async stream(input, options) {
        async function* generator() {
            yield input;
        }
        const config = ensureConfig(options);
        const wrappedGenerator = new AsyncGeneratorWithSetup({
            generator: this.transform(generator(), config),
            config,
        });
        await wrappedGenerator.setup;
        return IterableReadableStream.fromAsyncGenerator(wrappedGenerator);
    }
}
/**
 * A Runnable that can fallback to other Runnables if it fails.
 * External APIs (e.g., APIs for a language model) may at times experience
 * degraded performance or even downtime.
 *
 * In these cases, it can be useful to have a fallback Runnable that can be
 * used in place of the original Runnable (e.g., fallback to another LLM provider).
 *
 * Fallbacks can be defined at the level of a single Runnable, or at the level
 * of a chain of Runnables. Fallbacks are tried in order until one succeeds or
 * all fail.
 *
 * While you can instantiate a `RunnableWithFallbacks` directly, it is usually
 * more convenient to use the `withFallbacks` method on an existing Runnable.
 *
 * When streaming, fallbacks will only be called on failures during the initial
 * stream creation. Errors that occur after a stream starts will not fallback
 * to the next Runnable.
 *
 * @example
 * ```typescript
 * import {
 *   RunnableLambda,
 *   RunnableWithFallbacks,
 * } from "@langchain/core/runnables";
 *
 * const primaryOperation = (input: string): string => {
 *   if (input !== "safe") {
 *     throw new Error("Primary operation failed due to unsafe input");
 *   }
 *   return `Processed: ${input}`;
 * };
 *
 * // Define a fallback operation that processes the input differently
 * const fallbackOperation = (input: string): string =>
 *   `Fallback processed: ${input}`;
 *
 * const primaryRunnable = RunnableLambda.from(primaryOperation);
 * const fallbackRunnable = RunnableLambda.from(fallbackOperation);
 *
 * // Apply the fallback logic using the .withFallbacks() method
 * const runnableWithFallback = primaryRunnable.withFallbacks([fallbackRunnable]);
 *
 * // Alternatively, create a RunnableWithFallbacks instance manually
 * const manualFallbackChain = new RunnableWithFallbacks({
 *   runnable: primaryRunnable,
 *   fallbacks: [fallbackRunnable],
 * });
 *
 * // Example invocation using .withFallbacks()
 * const res = await runnableWithFallback
 *   .invoke("unsafe input")
 *   .catch((error) => {
 *     console.error("Failed after all attempts:", error.message);
 *   });
 *
 * // "Fallback processed: unsafe input"
 *
 * // Example invocation using manual instantiation
 * const res = await manualFallbackChain
 *   .invoke("safe")
 *   .catch((error) => {
 *     console.error("Failed after all attempts:", error.message);
 *   });
 *
 * // "Processed: safe"
 * ```
 */
class RunnableWithFallbacks extends Runnable {
    static lc_name() {
        return "RunnableWithFallbacks";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "runnable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.runnable = fields.runnable;
        this.fallbacks = fields.fallbacks;
    }
    *runnables() {
        yield this.runnable;
        for (const fallback of this.fallbacks) {
            yield fallback;
        }
    }
    async invoke(input, options) {
        const config = ensureConfig(options);
        const callbackManager_ = await getCallbackManagerForConfig(options);
        const { runId, ...otherConfigFields } = config;
        const runManager = await callbackManager_?.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), runId, undefined, undefined, undefined, otherConfigFields?.runName);
        let firstError;
        for (const runnable of this.runnables()) {
            config?.signal?.throwIfAborted();
            try {
                const output = await runnable.invoke(input, patchConfig(otherConfigFields, { callbacks: runManager?.getChild() }));
                await runManager?.handleChainEnd(_coerceToDict(output, "output"));
                return output;
            }
            catch (e) {
                if (firstError === undefined) {
                    firstError = e;
                }
            }
        }
        if (firstError === undefined) {
            throw new Error("No error stored at end of fallback.");
        }
        await runManager?.handleChainError(firstError);
        throw firstError;
    }
    async *_streamIterator(input, options) {
        const config = ensureConfig(options);
        const callbackManager_ = await getCallbackManagerForConfig(options);
        const { runId, ...otherConfigFields } = config;
        const runManager = await callbackManager_?.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), runId, undefined, undefined, undefined, otherConfigFields?.runName);
        let firstError;
        let stream;
        for (const runnable of this.runnables()) {
            config?.signal?.throwIfAborted();
            const childConfig = patchConfig(otherConfigFields, {
                callbacks: runManager?.getChild(),
            });
            try {
                stream = await runnable.stream(input, childConfig);
                break;
            }
            catch (e) {
                if (firstError === undefined) {
                    firstError = e;
                }
            }
        }
        if (stream === undefined) {
            const error = firstError ?? new Error("No error stored at end of fallback.");
            await runManager?.handleChainError(error);
            throw error;
        }
        let output;
        try {
            for await (const chunk of stream) {
                yield chunk;
                try {
                    output = output === undefined ? output : concat(output, chunk);
                }
                catch (e) {
                    output = undefined;
                }
            }
        }
        catch (e) {
            await runManager?.handleChainError(e);
            throw e;
        }
        await runManager?.handleChainEnd(_coerceToDict(output, "output"));
    }
    async batch(inputs, options, batchOptions) {
        if (batchOptions?.returnExceptions) {
            throw new Error("Not implemented.");
        }
        const configList = this._getOptionsList(options ?? {}, inputs.length);
        const callbackManagers = await Promise.all(configList.map((config) => getCallbackManagerForConfig(config)));
        const runManagers = await Promise.all(callbackManagers.map(async (callbackManager, i) => {
            const handleStartRes = await callbackManager?.handleChainStart(this.toJSON(), _coerceToDict(inputs[i], "input"), configList[i].runId, undefined, undefined, undefined, configList[i].runName);
            delete configList[i].runId;
            return handleStartRes;
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let firstError;
        for (const runnable of this.runnables()) {
            configList[0].signal?.throwIfAborted();
            try {
                const outputs = await runnable.batch(inputs, runManagers.map((runManager, j) => patchConfig(configList[j], {
                    callbacks: runManager?.getChild(),
                })), batchOptions);
                await Promise.all(runManagers.map((runManager, i) => runManager?.handleChainEnd(_coerceToDict(outputs[i], "output"))));
                return outputs;
            }
            catch (e) {
                if (firstError === undefined) {
                    firstError = e;
                }
            }
        }
        if (!firstError) {
            throw new Error("No error stored at end of fallbacks.");
        }
        await Promise.all(runManagers.map((runManager) => runManager?.handleChainError(firstError)));
        throw firstError;
    }
}
// TODO: Figure out why the compiler needs help eliminating Error as a RunOutput type
function _coerceToRunnable(coerceable) {
    if (typeof coerceable === "function") {
        return new RunnableLambda({ func: coerceable });
    }
    else if (Runnable.isRunnable(coerceable)) {
        return coerceable;
    }
    else if (!Array.isArray(coerceable) && typeof coerceable === "object") {
        const runnables = {};
        for (const [key, value] of Object.entries(coerceable)) {
            runnables[key] = _coerceToRunnable(value);
        }
        return new RunnableMap({
            steps: runnables,
        });
    }
    else {
        throw new Error(`Expected a Runnable, function or object.\nInstead got an unsupported type.`);
    }
}
/**
 * A runnable that assigns key-value pairs to inputs of type `Record<string, unknown>`.
 * @example
 * ```typescript
 * import {
 *   RunnableAssign,
 *   RunnableLambda,
 *   RunnableParallel,
 * } from "@langchain/core/runnables";
 *
 * const calculateAge = (x: { birthYear: number }): { age: number } => {
 *   const currentYear = new Date().getFullYear();
 *   return { age: currentYear - x.birthYear };
 * };
 *
 * const createGreeting = (x: { name: string }): { greeting: string } => {
 *   return { greeting: `Hello, ${x.name}!` };
 * };
 *
 * const mapper = RunnableParallel.from({
 *   age_step: RunnableLambda.from(calculateAge),
 *   greeting_step: RunnableLambda.from(createGreeting),
 * });
 *
 * const runnableAssign = new RunnableAssign({ mapper });
 *
 * const res = await runnableAssign.invoke({ name: "Alice", birthYear: 1990 });
 *
 * // { name: "Alice", birthYear: 1990, age_step: { age: 34 }, greeting_step: { greeting: "Hello, Alice!" } }
 * ```
 */
class RunnableAssign extends Runnable {
    static lc_name() {
        return "RunnableAssign";
    }
    constructor(fields) {
        // eslint-disable-next-line no-instanceof/no-instanceof
        if (fields instanceof RunnableMap) {
            // eslint-disable-next-line no-param-reassign
            fields = { mapper: fields };
        }
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "mapper", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.mapper = fields.mapper;
    }
    async invoke(input, options) {
        const mapperResult = await this.mapper.invoke(input, options);
        return {
            ...input,
            ...mapperResult,
        };
    }
    async *_transform(generator, runManager, options) {
        // collect mapper keys
        const mapperKeys = this.mapper.getStepsKeys();
        // create two input gens, one for the mapper, one for the input
        const [forPassthrough, forMapper] = atee(generator);
        // create mapper output gen
        const mapperOutput = this.mapper.transform(forMapper, patchConfig(options, { callbacks: runManager?.getChild() }));
        // start the mapper
        const firstMapperChunkPromise = mapperOutput.next();
        // yield the passthrough
        for await (const chunk of forPassthrough) {
            if (typeof chunk !== "object" || Array.isArray(chunk)) {
                throw new Error(`RunnableAssign can only be used with objects as input, got ${typeof chunk}`);
            }
            const filtered = Object.fromEntries(Object.entries(chunk).filter(([key]) => !mapperKeys.includes(key)));
            if (Object.keys(filtered).length > 0) {
                yield filtered;
            }
        }
        // yield the mapper output
        yield (await firstMapperChunkPromise).value;
        for await (const chunk of mapperOutput) {
            yield chunk;
        }
    }
    transform(generator, options) {
        return this._transformStreamWithConfig(generator, this._transform.bind(this), options);
    }
    async stream(input, options) {
        async function* generator() {
            yield input;
        }
        const config = ensureConfig(options);
        const wrappedGenerator = new AsyncGeneratorWithSetup({
            generator: this.transform(generator(), config),
            config,
        });
        await wrappedGenerator.setup;
        return IterableReadableStream.fromAsyncGenerator(wrappedGenerator);
    }
}
/**
 * A runnable that assigns key-value pairs to inputs of type `Record<string, unknown>`.
 * Useful for streaming, can be automatically created and chained by calling `runnable.pick();`.
 * @example
 * ```typescript
 * import { RunnablePick } from "@langchain/core/runnables";
 *
 * const inputData = {
 *   name: "John",
 *   age: 30,
 *   city: "New York",
 *   country: "USA",
 *   email: "john.doe@example.com",
 *   phone: "+1234567890",
 * };
 *
 * const basicInfoRunnable = new RunnablePick(["name", "city"]);
 *
 * // Example invocation
 * const res = await basicInfoRunnable.invoke(inputData);
 *
 * // { name: 'John', city: 'New York' }
 * ```
 */
class RunnablePick extends Runnable {
    static lc_name() {
        return "RunnablePick";
    }
    constructor(fields) {
        if (typeof fields === "string" || Array.isArray(fields)) {
            // eslint-disable-next-line no-param-reassign
            fields = { keys: fields };
        }
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "keys", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.keys = fields.keys;
    }
    async _pick(input) {
        if (typeof this.keys === "string") {
            return input[this.keys];
        }
        else {
            const picked = this.keys
                .map((key) => [key, input[key]])
                .filter((v) => v[1] !== undefined);
            return picked.length === 0 ? undefined : Object.fromEntries(picked);
        }
    }
    async invoke(input, options) {
        return this._callWithConfig(this._pick.bind(this), input, options);
    }
    async *_transform(generator) {
        for await (const chunk of generator) {
            const picked = await this._pick(chunk);
            if (picked !== undefined) {
                yield picked;
            }
        }
    }
    transform(generator, options) {
        return this._transformStreamWithConfig(generator, this._transform.bind(this), options);
    }
    async stream(input, options) {
        async function* generator() {
            yield input;
        }
        const config = ensureConfig(options);
        const wrappedGenerator = new AsyncGeneratorWithSetup({
            generator: this.transform(generator(), config),
            config,
        });
        await wrappedGenerator.setup;
        return IterableReadableStream.fromAsyncGenerator(wrappedGenerator);
    }
}
class RunnableToolLike extends RunnableBinding {
    constructor(fields) {
        const sequence = RunnableSequence.from([
            RunnableLambda.from(async (input) => {
                let toolInput;
                if (_isToolCall(input)) {
                    try {
                        toolInput = await this.schema.parseAsync(input.args);
                    }
                    catch (e) {
                        throw new ToolInputParsingException(`Received tool input did not match expected schema`, JSON.stringify(input.args));
                    }
                }
                else {
                    toolInput = input;
                }
                return toolInput;
            }).withConfig({ runName: `${fields.name}:parse_input` }),
            fields.bound,
        ]).withConfig({ runName: fields.name });
        super({
            bound: sequence,
            config: fields.config ?? {},
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "description", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "schema", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = fields.name;
        this.description = fields.description;
        this.schema = fields.schema;
    }
    static lc_name() {
        return "RunnableToolLike";
    }
}
/**
 * Given a runnable and a Zod schema, convert the runnable to a tool.
 *
 * @template RunInput The input type for the runnable.
 * @template RunOutput The output type for the runnable.
 *
 * @param {Runnable<RunInput, RunOutput>} runnable The runnable to convert to a tool.
 * @param fields
 * @param {string | undefined} [fields.name] The name of the tool. If not provided, it will default to the name of the runnable.
 * @param {string | undefined} [fields.description] The description of the tool. Falls back to the description on the Zod schema if not provided, or undefined if neither are provided.
 * @param {z.ZodType<RunInput>} [fields.schema] The Zod schema for the input of the tool. Infers the Zod type from the input type of the runnable.
 * @returns {RunnableToolLike<z.ZodType<RunInput>, RunOutput>} An instance of `RunnableToolLike` which is a runnable that can be used as a tool.
 */
function convertRunnableToTool(runnable, fields) {
    const name = fields.name ?? runnable.getName();
    const description = fields.description ?? fields.schema?.description;
    if (fields.schema.constructor === z.ZodString) {
        return new RunnableToolLike({
            name,
            description,
            schema: z
                .object({
                input: z.string(),
            })
                .transform((input) => input.input),
            bound: runnable,
        });
    }
    return new RunnableToolLike({
        name,
        description,
        schema: fields.schema,
        bound: runnable,
    });
}

/**
 * Abstract base class for document transformation systems.
 *
 * A document transformation system takes an array of Documents and returns an
 * array of transformed Documents. These arrays do not necessarily have to have
 * the same length.
 *
 * One example of this is a text splitter that splits a large document into
 * many smaller documents.
 */
class BaseDocumentTransformer extends Runnable {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "documents", "transformers"]
        });
    }
    /**
     * Method to invoke the document transformation. This method calls the
     * transformDocuments method with the provided input.
     * @param input The input documents to be transformed.
     * @param _options Optional configuration object to customize the behavior of callbacks.
     * @returns A Promise that resolves to the transformed documents.
     */
    invoke(input, _options) {
        return this.transformDocuments(input);
    }
}

var base64Js = {};

var hasRequiredBase64Js;

function requireBase64Js () {
	if (hasRequiredBase64Js) return base64Js;
	hasRequiredBase64Js = 1;

	base64Js.byteLength = byteLength;
	base64Js.toByteArray = toByteArray;
	base64Js.fromByteArray = fromByteArray;

	var lookup = [];
	var revLookup = [];
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i];
	  revLookup[code.charCodeAt(i)] = i;
	}

	// Support decoding URL-safe base64 strings, as Node.js does.
	// See: https://en.wikipedia.org/wiki/Base64#URL_applications
	revLookup['-'.charCodeAt(0)] = 62;
	revLookup['_'.charCodeAt(0)] = 63;

	function getLens (b64) {
	  var len = b64.length;

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // Trim off extra bytes after placeholder bytes are found
	  // See: https://github.com/beatgammit/base64-js/issues/42
	  var validLen = b64.indexOf('=');
	  if (validLen === -1) validLen = len;

	  var placeHoldersLen = validLen === len
	    ? 0
	    : 4 - (validLen % 4);

	  return [validLen, placeHoldersLen]
	}

	// base64 is 4/3 + up to two characters of the original data
	function byteLength (b64) {
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function _byteLength (b64, validLen, placeHoldersLen) {
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function toByteArray (b64) {
	  var tmp;
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];

	  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

	  var curByte = 0;

	  // if there are placeholders, only get up to the last complete 4 chars
	  var len = placeHoldersLen > 0
	    ? validLen - 4
	    : validLen;

	  var i;
	  for (i = 0; i < len; i += 4) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 18) |
	      (revLookup[b64.charCodeAt(i + 1)] << 12) |
	      (revLookup[b64.charCodeAt(i + 2)] << 6) |
	      revLookup[b64.charCodeAt(i + 3)];
	    arr[curByte++] = (tmp >> 16) & 0xFF;
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 2) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 2) |
	      (revLookup[b64.charCodeAt(i + 1)] >> 4);
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 1) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 10) |
	      (revLookup[b64.charCodeAt(i + 1)] << 4) |
	      (revLookup[b64.charCodeAt(i + 2)] >> 2);
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] +
	    lookup[num >> 12 & 0x3F] +
	    lookup[num >> 6 & 0x3F] +
	    lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp;
	  var output = [];
	  for (var i = start; i < end; i += 3) {
	    tmp =
	      ((uint8[i] << 16) & 0xFF0000) +
	      ((uint8[i + 1] << 8) & 0xFF00) +
	      (uint8[i + 2] & 0xFF);
	    output.push(tripletToBase64(tmp));
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp;
	  var len = uint8.length;
	  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
	  var parts = [];
	  var maxChunkLength = 16383; // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 2] +
	      lookup[(tmp << 4) & 0x3F] +
	      '=='
	    );
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 10] +
	      lookup[(tmp >> 4) & 0x3F] +
	      lookup[(tmp << 2) & 0x3F] +
	      '='
	    );
	  }

	  return parts.join('')
	}
	return base64Js;
}

var base64JsExports = requireBase64Js();
var base64 = /*@__PURE__*/getDefaultExportFromCjs(base64JsExports);

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, key + "" , value);
  return value;
};
function bytePairMerge(piece, ranks) {
  let parts = Array.from(
    { length: piece.length },
    (_, i) => ({ start: i, end: i + 1 })
  );
  while (parts.length > 1) {
    let minRank = null;
    for (let i = 0; i < parts.length - 1; i++) {
      const slice = piece.slice(parts[i].start, parts[i + 1].end);
      const rank = ranks.get(slice.join(","));
      if (rank == null)
        continue;
      if (minRank == null || rank < minRank[0]) {
        minRank = [rank, i];
      }
    }
    if (minRank != null) {
      const i = minRank[1];
      parts[i] = { start: parts[i].start, end: parts[i + 1].end };
      parts.splice(i + 1, 1);
    } else {
      break;
    }
  }
  return parts;
}
function bytePairEncode(piece, ranks) {
  if (piece.length === 1)
    return [ranks.get(piece.join(","))];
  return bytePairMerge(piece, ranks).map((p) => ranks.get(piece.slice(p.start, p.end).join(","))).filter((x) => x != null);
}
function escapeRegex(str) {
  return str.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
}
var _Tiktoken = class {
  /** @internal */
  specialTokens;
  /** @internal */
  inverseSpecialTokens;
  /** @internal */
  patStr;
  /** @internal */
  textEncoder = new TextEncoder();
  /** @internal */
  textDecoder = new TextDecoder("utf-8");
  /** @internal */
  rankMap = /* @__PURE__ */ new Map();
  /** @internal */
  textMap = /* @__PURE__ */ new Map();
  constructor(ranks, extendedSpecialTokens) {
    this.patStr = ranks.pat_str;
    const uncompressed = ranks.bpe_ranks.split("\n").filter(Boolean).reduce((memo, x) => {
      const [_, offsetStr, ...tokens] = x.split(" ");
      const offset = Number.parseInt(offsetStr, 10);
      tokens.forEach((token, i) => memo[token] = offset + i);
      return memo;
    }, {});
    for (const [token, rank] of Object.entries(uncompressed)) {
      const bytes = base64.toByteArray(token);
      this.rankMap.set(bytes.join(","), rank);
      this.textMap.set(rank, bytes);
    }
    this.specialTokens = { ...ranks.special_tokens, ...extendedSpecialTokens };
    this.inverseSpecialTokens = Object.entries(this.specialTokens).reduce((memo, [text, rank]) => {
      memo[rank] = this.textEncoder.encode(text);
      return memo;
    }, {});
  }
  encode(text, allowedSpecial = [], disallowedSpecial = "all") {
    const regexes = new RegExp(this.patStr, "ug");
    const specialRegex = _Tiktoken.specialTokenRegex(
      Object.keys(this.specialTokens)
    );
    const ret = [];
    const allowedSpecialSet = new Set(
      allowedSpecial === "all" ? Object.keys(this.specialTokens) : allowedSpecial
    );
    const disallowedSpecialSet = new Set(
      disallowedSpecial === "all" ? Object.keys(this.specialTokens).filter(
        (x) => !allowedSpecialSet.has(x)
      ) : disallowedSpecial
    );
    if (disallowedSpecialSet.size > 0) {
      const disallowedSpecialRegex = _Tiktoken.specialTokenRegex([
        ...disallowedSpecialSet
      ]);
      const specialMatch = text.match(disallowedSpecialRegex);
      if (specialMatch != null) {
        throw new Error(
          `The text contains a special token that is not allowed: ${specialMatch[0]}`
        );
      }
    }
    let start = 0;
    while (true) {
      let nextSpecial = null;
      let startFind = start;
      while (true) {
        specialRegex.lastIndex = startFind;
        nextSpecial = specialRegex.exec(text);
        if (nextSpecial == null || allowedSpecialSet.has(nextSpecial[0]))
          break;
        startFind = nextSpecial.index + 1;
      }
      const end = nextSpecial?.index ?? text.length;
      for (const match of text.substring(start, end).matchAll(regexes)) {
        const piece = this.textEncoder.encode(match[0]);
        const token2 = this.rankMap.get(piece.join(","));
        if (token2 != null) {
          ret.push(token2);
          continue;
        }
        ret.push(...bytePairEncode(piece, this.rankMap));
      }
      if (nextSpecial == null)
        break;
      let token = this.specialTokens[nextSpecial[0]];
      ret.push(token);
      start = nextSpecial.index + nextSpecial[0].length;
    }
    return ret;
  }
  decode(tokens) {
    const res = [];
    let length = 0;
    for (let i2 = 0; i2 < tokens.length; ++i2) {
      const token = tokens[i2];
      const bytes = this.textMap.get(token) ?? this.inverseSpecialTokens[token];
      if (bytes != null) {
        res.push(bytes);
        length += bytes.length;
      }
    }
    const mergedArray = new Uint8Array(length);
    let i = 0;
    for (const bytes of res) {
      mergedArray.set(bytes, i);
      i += bytes.length;
    }
    return this.textDecoder.decode(mergedArray);
  }
};
var Tiktoken = _Tiktoken;
__publicField(Tiktoken, "specialTokenRegex", (tokens) => {
  return new RegExp(tokens.map((i) => escapeRegex(i)).join("|"), "g");
});

class TextSplitter extends BaseDocumentTransformer {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain", "document_transformers", "text_splitters"]
        });
        Object.defineProperty(this, "chunkSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1000
        });
        Object.defineProperty(this, "chunkOverlap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 200
        });
        Object.defineProperty(this, "keepSeparator", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lengthFunction", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.chunkSize = fields?.chunkSize ?? this.chunkSize;
        this.chunkOverlap = fields?.chunkOverlap ?? this.chunkOverlap;
        this.keepSeparator = fields?.keepSeparator ?? this.keepSeparator;
        this.lengthFunction =
            fields?.lengthFunction ?? ((text) => text.length);
        if (this.chunkOverlap >= this.chunkSize) {
            throw new Error("Cannot have chunkOverlap >= chunkSize");
        }
    }
    async transformDocuments(documents, chunkHeaderOptions = {}) {
        return this.splitDocuments(documents, chunkHeaderOptions);
    }
    splitOnSeparator(text, separator) {
        let splits;
        if (separator) {
            if (this.keepSeparator) {
                const regexEscapedSeparator = separator.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
                splits = text.split(new RegExp(`(?=${regexEscapedSeparator})`));
            }
            else {
                splits = text.split(separator);
            }
        }
        else {
            splits = text.split("");
        }
        return splits.filter((s) => s !== "");
    }
    async createDocuments(texts, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadatas = [], chunkHeaderOptions = {}) {
        // if no metadata is provided, we create an empty one for each text
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const _metadatas = metadatas.length > 0
            ? metadatas
            : [...Array(texts.length)].map(() => ({}));
        const { chunkHeader = "", chunkOverlapHeader = "(cont'd) ", appendChunkOverlapHeader = false, } = chunkHeaderOptions;
        const documents = new Array();
        for (let i = 0; i < texts.length; i += 1) {
            const text = texts[i];
            let lineCounterIndex = 1;
            let prevChunk = null;
            let indexPrevChunk = -1;
            for (const chunk of await this.splitText(text)) {
                let pageContent = chunkHeader;
                // we need to count the \n that are in the text before getting removed by the splitting
                const indexChunk = text.indexOf(chunk, indexPrevChunk + 1);
                if (prevChunk === null) {
                    const newLinesBeforeFirstChunk = this.numberOfNewLines(text, 0, indexChunk);
                    lineCounterIndex += newLinesBeforeFirstChunk;
                }
                else {
                    const indexEndPrevChunk = indexPrevChunk + (await this.lengthFunction(prevChunk));
                    if (indexEndPrevChunk < indexChunk) {
                        const numberOfIntermediateNewLines = this.numberOfNewLines(text, indexEndPrevChunk, indexChunk);
                        lineCounterIndex += numberOfIntermediateNewLines;
                    }
                    else if (indexEndPrevChunk > indexChunk) {
                        const numberOfIntermediateNewLines = this.numberOfNewLines(text, indexChunk, indexEndPrevChunk);
                        lineCounterIndex -= numberOfIntermediateNewLines;
                    }
                    if (appendChunkOverlapHeader) {
                        pageContent += chunkOverlapHeader;
                    }
                }
                const newLinesCount = this.numberOfNewLines(chunk);
                const loc = _metadatas[i].loc && typeof _metadatas[i].loc === "object"
                    ? { ..._metadatas[i].loc }
                    : {};
                loc.lines = {
                    from: lineCounterIndex,
                    to: lineCounterIndex + newLinesCount,
                };
                const metadataWithLinesNumber = {
                    ..._metadatas[i],
                    loc,
                };
                pageContent += chunk;
                documents.push(new Document({
                    pageContent,
                    metadata: metadataWithLinesNumber,
                }));
                lineCounterIndex += newLinesCount;
                prevChunk = chunk;
                indexPrevChunk = indexChunk;
            }
        }
        return documents;
    }
    numberOfNewLines(text, start, end) {
        const textSection = text.slice(start, end);
        return (textSection.match(/\n/g) || []).length;
    }
    async splitDocuments(documents, chunkHeaderOptions = {}) {
        const selectedDocuments = documents.filter((doc) => doc.pageContent !== undefined);
        const texts = selectedDocuments.map((doc) => doc.pageContent);
        const metadatas = selectedDocuments.map((doc) => doc.metadata);
        return this.createDocuments(texts, metadatas, chunkHeaderOptions);
    }
    joinDocs(docs, separator) {
        const text = docs.join(separator).trim();
        return text === "" ? null : text;
    }
    async mergeSplits(splits, separator) {
        const docs = [];
        const currentDoc = [];
        let total = 0;
        for (const d of splits) {
            const _len = await this.lengthFunction(d);
            if (total + _len + currentDoc.length * separator.length >
                this.chunkSize) {
                if (total > this.chunkSize) {
                    console.warn(`Created a chunk of size ${total}, +
which is longer than the specified ${this.chunkSize}`);
                }
                if (currentDoc.length > 0) {
                    const doc = this.joinDocs(currentDoc, separator);
                    if (doc !== null) {
                        docs.push(doc);
                    }
                    // Keep on popping if:
                    // - we have a larger chunk than in the chunk overlap
                    // - or if we still have any chunks and the length is long
                    while (total > this.chunkOverlap ||
                        (total + _len + currentDoc.length * separator.length >
                            this.chunkSize &&
                            total > 0)) {
                        total -= await this.lengthFunction(currentDoc[0]);
                        currentDoc.shift();
                    }
                }
            }
            currentDoc.push(d);
            total += _len;
        }
        const doc = this.joinDocs(currentDoc, separator);
        if (doc !== null) {
            docs.push(doc);
        }
        return docs;
    }
}
class RecursiveCharacterTextSplitter extends TextSplitter {
    static lc_name() {
        return "RecursiveCharacterTextSplitter";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "separators", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["\n\n", "\n", " ", ""]
        });
        this.separators = fields?.separators ?? this.separators;
        this.keepSeparator = fields?.keepSeparator ?? true;
    }
    async _splitText(text, separators) {
        const finalChunks = [];
        // Get appropriate separator to use
        let separator = separators[separators.length - 1];
        let newSeparators;
        for (let i = 0; i < separators.length; i += 1) {
            const s = separators[i];
            if (s === "") {
                separator = s;
                break;
            }
            if (text.includes(s)) {
                separator = s;
                newSeparators = separators.slice(i + 1);
                break;
            }
        }
        // Now that we have the separator, split the text
        const splits = this.splitOnSeparator(text, separator);
        // Now go merging things, recursively splitting longer texts.
        let goodSplits = [];
        const _separator = this.keepSeparator ? "" : separator;
        for (const s of splits) {
            if ((await this.lengthFunction(s)) < this.chunkSize) {
                goodSplits.push(s);
            }
            else {
                if (goodSplits.length) {
                    const mergedText = await this.mergeSplits(goodSplits, _separator);
                    finalChunks.push(...mergedText);
                    goodSplits = [];
                }
                if (!newSeparators) {
                    finalChunks.push(s);
                }
                else {
                    const otherInfo = await this._splitText(s, newSeparators);
                    finalChunks.push(...otherInfo);
                }
            }
        }
        if (goodSplits.length) {
            const mergedText = await this.mergeSplits(goodSplits, _separator);
            finalChunks.push(...mergedText);
        }
        return finalChunks;
    }
    async splitText(text) {
        return this._splitText(text, this.separators);
    }
    static fromLanguage(language, options) {
        return new RecursiveCharacterTextSplitter({
            ...options,
            separators: RecursiveCharacterTextSplitter.getSeparatorsForLanguage(language),
        });
    }
    static getSeparatorsForLanguage(language) {
        if (language === "cpp") {
            return [
                // Split along class definitions
                "\nclass ",
                // Split along function definitions
                "\nvoid ",
                "\nint ",
                "\nfloat ",
                "\ndouble ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nwhile ",
                "\nswitch ",
                "\ncase ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "go") {
            return [
                // Split along function definitions
                "\nfunc ",
                "\nvar ",
                "\nconst ",
                "\ntype ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nswitch ",
                "\ncase ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "java") {
            return [
                // Split along class definitions
                "\nclass ",
                // Split along method definitions
                "\npublic ",
                "\nprotected ",
                "\nprivate ",
                "\nstatic ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nwhile ",
                "\nswitch ",
                "\ncase ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "js") {
            return [
                // Split along function definitions
                "\nfunction ",
                "\nconst ",
                "\nlet ",
                "\nvar ",
                "\nclass ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nwhile ",
                "\nswitch ",
                "\ncase ",
                "\ndefault ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "php") {
            return [
                // Split along function definitions
                "\nfunction ",
                // Split along class definitions
                "\nclass ",
                // Split along control flow statements
                "\nif ",
                "\nforeach ",
                "\nwhile ",
                "\ndo ",
                "\nswitch ",
                "\ncase ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "proto") {
            return [
                // Split along message definitions
                "\nmessage ",
                // Split along service definitions
                "\nservice ",
                // Split along enum definitions
                "\nenum ",
                // Split along option definitions
                "\noption ",
                // Split along import statements
                "\nimport ",
                // Split along syntax declarations
                "\nsyntax ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "python") {
            return [
                // First, try to split along class definitions
                "\nclass ",
                "\ndef ",
                "\n\tdef ",
                // Now split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "rst") {
            return [
                // Split along section titles
                "\n===\n",
                "\n---\n",
                "\n***\n",
                // Split along directive markers
                "\n.. ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "ruby") {
            return [
                // Split along method definitions
                "\ndef ",
                "\nclass ",
                // Split along control flow statements
                "\nif ",
                "\nunless ",
                "\nwhile ",
                "\nfor ",
                "\ndo ",
                "\nbegin ",
                "\nrescue ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "rust") {
            return [
                // Split along function definitions
                "\nfn ",
                "\nconst ",
                "\nlet ",
                // Split along control flow statements
                "\nif ",
                "\nwhile ",
                "\nfor ",
                "\nloop ",
                "\nmatch ",
                "\nconst ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "scala") {
            return [
                // Split along class definitions
                "\nclass ",
                "\nobject ",
                // Split along method definitions
                "\ndef ",
                "\nval ",
                "\nvar ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nwhile ",
                "\nmatch ",
                "\ncase ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "swift") {
            return [
                // Split along function definitions
                "\nfunc ",
                // Split along class definitions
                "\nclass ",
                "\nstruct ",
                "\nenum ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nwhile ",
                "\ndo ",
                "\nswitch ",
                "\ncase ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "markdown") {
            return [
                // First, try to split along Markdown headings (starting with level 2)
                "\n## ",
                "\n### ",
                "\n#### ",
                "\n##### ",
                "\n###### ",
                // Note the alternative syntax for headings (below) is not handled here
                // Heading level 2
                // ---------------
                // End of code block
                "```\n\n",
                // Horizontal lines
                "\n\n***\n\n",
                "\n\n---\n\n",
                "\n\n___\n\n",
                // Note that this splitter doesn't handle horizontal lines defined
                // by *three or more* of ***, ---, or ___, but this is not handled
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "latex") {
            return [
                // First, try to split along Latex sections
                "\n\\chapter{",
                "\n\\section{",
                "\n\\subsection{",
                "\n\\subsubsection{",
                // Now split by environments
                "\n\\begin{enumerate}",
                "\n\\begin{itemize}",
                "\n\\begin{description}",
                "\n\\begin{list}",
                "\n\\begin{quote}",
                "\n\\begin{quotation}",
                "\n\\begin{verse}",
                "\n\\begin{verbatim}",
                // Now split by math environments
                "\n\\begin{align}",
                "$$",
                "$",
                // Now split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else if (language === "html") {
            return [
                // First, try to split along HTML tags
                "<body>",
                "<div>",
                "<p>",
                "<br>",
                "<li>",
                "<h1>",
                "<h2>",
                "<h3>",
                "<h4>",
                "<h5>",
                "<h6>",
                "<span>",
                "<table>",
                "<tr>",
                "<td>",
                "<th>",
                "<ul>",
                "<ol>",
                "<header>",
                "<footer>",
                "<nav>",
                // Head
                "<head>",
                "<style>",
                "<script>",
                "<meta>",
                "<title>",
                // Normal type of lines
                " ",
                "",
            ];
        }
        else if (language === "sol") {
            return [
                // Split along compiler informations definitions
                "\npragma ",
                "\nusing ",
                // Split along contract definitions
                "\ncontract ",
                "\ninterface ",
                "\nlibrary ",
                // Split along method definitions
                "\nconstructor ",
                "\ntype ",
                "\nfunction ",
                "\nevent ",
                "\nmodifier ",
                "\nerror ",
                "\nstruct ",
                "\nenum ",
                // Split along control flow statements
                "\nif ",
                "\nfor ",
                "\nwhile ",
                "\ndo while ",
                "\nassembly ",
                // Split by the normal type of lines
                "\n\n",
                "\n",
                " ",
                "",
            ];
        }
        else {
            throw new Error(`Language ${language} is not supported.`);
        }
    }
}

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 0,
});

async function getChunks(content) {
    return await splitter.splitText(content);}

export { getChunks };
