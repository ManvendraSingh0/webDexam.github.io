"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Db = void 0;
const admin_1 = require("./admin");
const bson_1 = require("./bson");
const change_stream_1 = require("./change_stream");
const collection_1 = require("./collection");
const CONSTANTS = require("./constants");
const aggregation_cursor_1 = require("./cursor/aggregation_cursor");
const list_collections_cursor_1 = require("./cursor/list_collections_cursor");
const error_1 = require("./error");
const add_user_1 = require("./operations/add_user");
const collections_1 = require("./operations/collections");
const create_collection_1 = require("./operations/create_collection");
const drop_1 = require("./operations/drop");
const execute_operation_1 = require("./operations/execute_operation");
const indexes_1 = require("./operations/indexes");
const profiling_level_1 = require("./operations/profiling_level");
const remove_user_1 = require("./operations/remove_user");
const rename_1 = require("./operations/rename");
const run_command_1 = require("./operations/run_command");
const set_profiling_level_1 = require("./operations/set_profiling_level");
const stats_1 = require("./operations/stats");
const read_concern_1 = require("./read_concern");
const read_preference_1 = require("./read_preference");
const utils_1 = require("./utils");
const write_concern_1 = require("./write_concern");
// Allowed parameters
const DB_OPTIONS_ALLOW_LIST = [
    'writeConcern',
    'readPreference',
    'readPreferenceTags',
    'native_parser',
    'forceServerObjectId',
    'pkFactory',
    'serializeFunctions',
    'raw',
    'authSource',
    'ignoreUndefined',
    'readConcern',
    'retryMiliSeconds',
    'numberOfRetries',
    'useBigInt64',
    'promoteBuffers',
    'promoteLongs',
    'bsonRegExp',
    'enableUtf8Validation',
    'promoteValues',
    'compression',
    'retryWrites'
];
/**
 * The **Db** class is a class that represents a MongoDB Database.
 * @public
 *
 * @example
 * ```ts
 * import { MongoClient } from 'mongodb';
 *
 * interface Pet {
 *   name: string;
 *   kind: 'dog' | 'cat' | 'fish';
 * }
 *
 * const client = new MongoClient('mongodb://localhost:27017');
 * const db = client.db();
 *
 * // Create a collection that validates our union
 * await db.createCollection<Pet>('pets', {
 *   validator: { $expr: { $in: ['$kind', ['dog', 'cat', 'fish']] } }
 * })
 * ```
 */
class Db {
    /**
     * Creates a new Db instance
     *
     * @param client - The MongoClient for the database.
     * @param databaseName - The name of the database this instance represents.
     * @param options - Optional settings for Db construction
     */
    constructor(client, databaseName, options) {
        options = options ?? {};
        // Filter the options
        options = (0, utils_1.filterOptions)(options, DB_OPTIONS_ALLOW_LIST);
        // Ensure we have a valid db name
        validateDatabaseName(databaseName);
        // Internal state of the db object
        this.s = {
            // Client
            client,
            // Options
            options,
            // Unpack read preference
            readPreference: read_preference_1.ReadPreference.fromOptions(options),
            // Merge bson options
            bsonOptions: (0, bson_1.resolveBSONOptions)(options, client),
            // Set up the primary key factory or fallback to ObjectId
            pkFactory: options?.pkFactory ?? utils_1.DEFAULT_PK_FACTORY,
            // ReadConcern
            readConcern: read_concern_1.ReadConcern.fromOptions(options),
            writeConcern: write_concern_1.WriteConcern.fromOptions(options),
            // Namespace
            namespace: new utils_1.MongoDBNamespace(databaseName)
        };
    }
    get databaseName() {
        return this.s.namespace.db;
    }
    // Options
    get options() {
        return this.s.options;
    }
    /**
     * Check if a secondary can be used (because the read preference is *not* set to primary)
     */
    get secondaryOk() {
        return this.s.readPreference?.preference !== 'primary' || false;
    }
    get readConcern() {
        return this.s.readConcern;
    }
    /**
     * The current readPreference of the Db. If not explicitly defined for
     * this Db, will be inherited from the parent MongoClient
     */
    get readPreference() {
        if (this.s.readPreference == null) {
            return this.s.client.readPreference;
        }
        return this.s.readPreference;
    }
    get bsonOptions() {
        return this.s.bsonOptions;
    }
    // get the write Concern
    get writeConcern() {
        return this.s.writeConcern;
    }
    get namespace() {
        return this.s.namespace.toString();
    }
    /**
     * Create a new collection on a server with the specified options. Use this to create capped collections.
     * More information about command options available at https://docs.mongodb.com/manual/reference/command/create/
     *
     * @param name - The name of the collection to create
     * @param options - Optional settings for the command
     */
    async createCollection(name, options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new create_collection_1.CreateCollectionOperation(this, name, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Execute a command
     *
     * @remarks
     * This command does not inherit options from the MongoClient.
     *
     * @param command - The command to run
     * @param options - Optional settings for the command
     */
    async command(command, options) {
        // Intentionally, we do not inherit options from parent for this operation.
        return (0, execute_operation_1.executeOperation)(this.s.client, new run_command_1.RunCommandOperation(this, command, options));
    }
    /**
     * Execute an aggregation framework pipeline against the database, needs MongoDB \>= 3.6
     *
     * @param pipeline - An array of aggregation stages to be executed
     * @param options - Optional settings for the command
     */
    aggregate(pipeline = [], options) {
        return new aggregation_cursor_1.AggregationCursor(this.s.client, this.s.namespace, pipeline, (0, utils_1.resolveOptions)(this, options));
    }
    /** Return the Admin db instance */
    admin() {
        return new admin_1.Admin(this);
    }
    /**
     * Returns a reference to a MongoDB Collection. If it does not exist it will be created implicitly.
     *
     * @param name - the collection name we wish to access.
     * @returns return the new Collection instance
     */
    collection(name, options = {}) {
        if (typeof options === 'function') {
            throw new error_1.MongoInvalidArgumentError('The callback form of this helper has been removed.');
        }
        return new collection_1.Collection(this, name, (0, utils_1.resolveOptions)(this, options));
    }
    /**
     * Get all the db statistics.
     *
     * @param options - Optional settings for the command
     */
    async stats(options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new stats_1.DbStatsOperation(this, (0, utils_1.resolveOptions)(this, options)));
    }
    listCollections(filter = {}, options = {}) {
        return new list_collections_cursor_1.ListCollectionsCursor(this, filter, (0, utils_1.resolveOptions)(this, options));
    }
    /**
     * Rename a collection.
     *
     * @remarks
     * This operation does not inherit options from the MongoClient.
     *
     * @param fromCollection - Name of current collection to rename
     * @param toCollection - New name of of the collection
     * @param options - Optional settings for the command
     */
    async renameCollection(fromCollection, toCollection, options) {
        // Intentionally, we do not inherit options from parent for this operation.
        return (0, execute_operation_1.executeOperation)(this.s.client, new rename_1.RenameOperation(this.collection(fromCollection), toCollection, { ...options, new_collection: true, readPreference: read_preference_1.ReadPreference.primary }));
    }
    /**
     * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
     *
     * @param name - Name of collection to drop
     * @param options - Optional settings for the command
     */
    async dropCollection(name, options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new drop_1.DropCollectionOperation(this, name, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Drop a database, removing it permanently from the server.
     *
     * @param options - Optional settings for the command
     */
    async dropDatabase(options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new drop_1.DropDatabaseOperation(this, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Fetch all collections for the current db.
     *
     * @param options - Optional settings for the command
     */
    async collections(options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new collections_1.CollectionsOperation(this, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Creates an index on the db and collection.
     *
     * @param name - Name of the collection to create the index on.
     * @param indexSpec - Specify the field to index, or an index specification
     * @param options - Optional settings for the command
     */
    async createIndex(name, indexSpec, options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new indexes_1.CreateIndexOperation(this, name, indexSpec, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Add a user to the database
     *
     * @param username - The username for the new user
     * @param passwordOrOptions - An optional password for the new user, or the options for the command
     * @param options - Optional settings for the command
     */
    async addUser(username, passwordOrOptions, options) {
        options =
            options != null && typeof options === 'object'
                ? options
                : passwordOrOptions != null && typeof passwordOrOptions === 'object'
                    ? passwordOrOptions
                    : undefined;
        const password = typeof passwordOrOptions === 'string' ? passwordOrOptions : undefined;
        return (0, execute_operation_1.executeOperation)(this.s.client, new add_user_1.AddUserOperation(this, username, password, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Remove a user from a database
     *
     * @param username - The username to remove
     * @param options - Optional settings for the command
     */
    async removeUser(username, options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new remove_user_1.RemoveUserOperation(this, username, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Set the current profiling level of MongoDB
     *
     * @param level - The new profiling level (off, slow_only, all).
     * @param options - Optional settings for the command
     */
    async setProfilingLevel(level, options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new set_profiling_level_1.SetProfilingLevelOperation(this, level, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Retrieve the current profiling Level for MongoDB
     *
     * @param options - Optional settings for the command
     */
    async profilingLevel(options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new profiling_level_1.ProfilingLevelOperation(this, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Retrieves this collections index info.
     *
     * @param name - The name of the collection.
     * @param options - Optional settings for the command
     */
    async indexInformation(name, options) {
        return (0, execute_operation_1.executeOperation)(this.s.client, new indexes_1.IndexInformationOperation(this, name, (0, utils_1.resolveOptions)(this, options)));
    }
    /**
     * Create a new Change Stream, watching for new changes (insertions, updates,
     * replacements, deletions, and invalidations) in this database. Will ignore all
     * changes to system collections.
     *
     * @remarks
     * watch() accepts two generic arguments for distinct use cases:
     * - The first is to provide the schema that may be defined for all the collections within this database
     * - The second is to override the shape of the change stream document entirely, if it is not provided the type will default to ChangeStreamDocument of the first argument
     *
     * @param pipeline - An array of {@link https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
     * @param options - Optional settings for the command
     * @typeParam TSchema - Type of the data being detected by the change stream
     * @typeParam TChange - Type of the whole change stream document emitted
     */
    watch(pipeline = [], options = {}) {
        // Allow optionally not specifying a pipeline
        if (!Array.isArray(pipeline)) {
            options = pipeline;
            pipeline = [];
        }
        return new change_stream_1.ChangeStream(this, pipeline, (0, utils_1.resolveOptions)(this, options));
    }
}
exports.Db = Db;
Db.SYSTEM_NAMESPACE_COLLECTION = CONSTANTS.SYSTEM_NAMESPACE_COLLECTION;
Db.SYSTEM_INDEX_COLLECTION = CONSTANTS.SYSTEM_INDEX_COLLECTION;
Db.SYSTEM_PROFILE_COLLECTION = CONSTANTS.SYSTEM_PROFILE_COLLECTION;
Db.SYSTEM_USER_COLLECTION = CONSTANTS.SYSTEM_USER_COLLECTION;
Db.SYSTEM_COMMAND_COLLECTION = CONSTANTS.SYSTEM_COMMAND_COLLECTION;
Db.SYSTEM_JS_COLLECTION = CONSTANTS.SYSTEM_JS_COLLECTION;
// TODO(NODE-3484): Refactor into MongoDBNamespace
// Validate the database name
function validateDatabaseName(databaseName) {
    if (typeof databaseName !== 'string')
        throw new error_1.MongoInvalidArgumentError('Database name must be a string');
    if (databaseName.length === 0)
        throw new error_1.MongoInvalidArgumentError('Database name cannot be the empty string');
    if (databaseName === '$external')
        return;
    const invalidChars = [' ', '.', '$', '/', '\\'];
    for (let i = 0; i < invalidChars.length; i++) {
        if (databaseName.indexOf(invalidChars[i]) !== -1)
            throw new error_1.MongoAPIError(`database names cannot contain the character '${invalidChars[i]}'`);
    }
}
//# sourceMappingURL=db.js.map