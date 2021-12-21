/** @module persistence */
import { table } from 'console';
import { IReferenceable } from 'pip-services3-commons-nodex';
import { IUnreferenceable } from 'pip-services3-commons-nodex';
import { IReferences } from 'pip-services3-commons-nodex';
import { IConfigurable } from 'pip-services3-commons-nodex';
import { IOpenable } from 'pip-services3-commons-nodex';
import { ICleanable } from 'pip-services3-commons-nodex';
import { ConfigParams } from 'pip-services3-commons-nodex';
import { PagingParams } from 'pip-services3-commons-nodex';
import { DataPage } from 'pip-services3-commons-nodex';
import { ConnectionException } from 'pip-services3-commons-nodex';
import { InvalidStateException } from 'pip-services3-commons-nodex';
import { DependencyResolver } from 'pip-services3-commons-nodex';
import { LongConverter } from 'pip-services3-commons-nodex';
import { CompositeLogger } from 'pip-services3-components-nodex';

import { CassandraConnection } from '../connect/CassandraConnection';

/**
 * Abstract persistence component that stores data in Cassandra using plain driver.
 * 
 * This is the most basic persistence component that is only
 * able to store data items of any type. Specific CRUD operations
 * over the data items must be implemented in child classes by
 * accessing <code>this._db</code> or <code>this._collection</code> properties.
 * 
 * ### Configuration parameters ###
 * 
 * - table:                       (optional) Cassandra table name
 * - keyspace:                    (optional) Cassandra keyspace name
 * - connection(s):    
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):    
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                  (optional) user name
 *   - password:                  (optional) user password
 * - options:
 *   - connect_timeout:      (optional) number of milliseconds to wait before timing out when connecting a new client (default: 0)
 *   - idle_timeout:         (optional) number of milliseconds a client must sit idle in the pool and not be checked out (default: 10000)
 *   - max_pool_size:        (optional) maximum number of clients the pool should contain (default: 10)
 * 
 * ### References ###
 * 
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/log.ilogger.html ILogger]] components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 * 
 * ### Example ###
 * 
 *     class MyCassandraPersistence extends CassandraPersistence<MyData> {
 *    
 *       public constructor() {
 *           base("mydata");
 *       }
 * 
 *       public getByName(correlationId: string, name: string): Promise<MyData> {
 *         let criteria = { name: name };
 *         return new Promise((resolve, reject) => {
 *           this._model.findOne(criteria, (err, item) => {
 *             if (err != null) {
 *               reject(err);
 *               return;
 *             }
 * 
 *             item = this.convertToPublic(item);
 *             resolve(item);
 *           });
 *          });
 *       }); 
 * 
 *       public set(correlatonId: string, item: MyData): Promise<MyData> {
 *         let criteria = { name: item.name };
 *         let options = { upsert: true, new: true };
 *         return new Promise((resolve, reject) => {
 *           this.findOneAndUpdate(criteria, item, options, (err, item) => {
 *             if (err != null) {
 *               reject(err);
 *               return;
 *             }
 * 
 *             item = this.convertToPublic(item);
 *             resolve(item);
 *           });
 *          });
 *       }
 * 
 *     }
 * 
 *     let persistence = new MyCassandraPersistence();
 *     persistence.configure(ConfigParams.fromTuples(
 *         "host", "localhost",
 *         "port", 27017
 *     ));
 * 
 *     await persitence.open("123");
 * 
 *     let item = await persistence.set("123", { name: "ABC" });
 *     item = await persistence.getByName("123", "ABC");
 *     console.log(item);   // Result: { name: "ABC" }
 */
export class CassandraPersistence<T> implements IReferenceable, IUnreferenceable, IConfigurable, IOpenable, ICleanable {

    private static _defaultConfig: ConfigParams = ConfigParams.fromTuples(
        "collection", null,
        "dependencies.connection", "*:connection:cassandra:*:1.0",

        // connections.*
        // credential.*

        "options.max_pool_size", 2,
        "options.keep_alive", 1,
        "options.connect_timeout", 5000,
        "options.auto_reconnect", true,
        "options.max_page_size", 100,
        "options.debug", true
    );

    private _config: ConfigParams;
    private _references: IReferences;
    private _opened: boolean;
    private _localConnection: boolean;
    private _schemaStatements: string[] = [];

    /**
     * The dependency resolver.
     */
    protected _dependencyResolver: DependencyResolver = new DependencyResolver(CassandraPersistence._defaultConfig);
    /** 
     * The logger.
     */
    protected _logger: CompositeLogger = new CompositeLogger();

    /**
     * The Cassandra connection component.
     */
    protected _connection: CassandraConnection;

    /**
     * The Cassandra connection pool object.
     */
    protected _client: any;
    /**
     * The Cassandra datacenter name.
     */
    protected _datacenter: string;
    /**
     * The Cassandra table object.
     */
    protected _tableName: string;
    /**
     * The Cassandra keyspace name.
     */
    protected _keyspaceName: string;
    /**
     * The maximum number of objects in data pages
     */
    protected _maxPageSize: number = 100;

    /**
     * Creates a new instance of the persistence component.
     * 
     * @param tableName    (optional) a table name.
     * @param keyspaceName    (optional) a keyspace name.
     */
    public constructor(tableName?: string, keyspaceName?: string) {
        this._tableName = tableName;
        this._keyspaceName = keyspaceName;
    }

    /**
     * Configures component by passing configuration parameters.
     * 
     * @param config    configuration parameters to be set.
     */
    public configure(config: ConfigParams): void {
        config = config.setDefaults(CassandraPersistence._defaultConfig);
        this._config = config;

        this._dependencyResolver.configure(config);

        this._maxPageSize = config.getAsIntegerWithDefault("options.max_page_size", this._maxPageSize);

        this._tableName = config.getAsStringWithDefault("collection", this._tableName);
        this._tableName = config.getAsStringWithDefault("table", this._tableName);
        this._keyspaceName = config.getAsStringWithDefault("keyspace", this._keyspaceName);
    }

    /**
     * Sets references to dependent components.
     * 
     * @param references 	references to locate the component dependencies. 
     */
    public setReferences(references: IReferences): void {
        this._references = references;
        this._logger.setReferences(references);

        // Get connection
        this._dependencyResolver.setReferences(references);
        this._connection = this._dependencyResolver.getOneOptional('connection');
        // Or create a local one
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        } else {
            this._localConnection = false;
        }
    }

    /**
     * Unsets (clears) previously set references to dependent components. 
     */
    public unsetReferences(): void {
        this._connection = null;
    }

    private createConnection(): CassandraConnection {
        let connection = new CassandraConnection();

        if (this._config) {
            connection.configure(this._config);
        }

        if (this._references) {
            connection.setReferences(this._references);
        }

        return connection;
    }

    /**
     * Adds index definition to create it on opening
     * @param keys index keys (fields)
     * @param options index options
     */
    protected ensureIndex(name: string, keys: any, options?: any): void {
        let builder = "CREATE";
        options = options || {};

        // This feature is not supported
        // if (options.unique) {
        //     builder += " UNIQUE";
        // }

        let indexName = this.quoteIdentifier(name);
        if (indexName != null) {
            indexName = this.quoteIdentifier(this._keyspaceName + '_' + indexName.slice(1, -1));
        }

        builder += " INDEX IF NOT EXISTS " + indexName + " ON " + this.quotedTableName();

        if (options.type) {
            builder += " " + options.type;
        }

        let fields = "";
        for (let key in keys) {
            if (fields != "") fields += ", ";
            fields += key
            // This feature is not supported
            // let asc = keys[key];
            // if (!asc) fields += " DESC";
        }

        builder += " (" + fields + ")";

        this.ensureSchema(builder);
    }

    /**
     * Adds a statement to schema definition
     * @param schemaStatement a statement to be added to the schema
     */
    protected ensureSchema(schemaStatement: string): void {
        this._schemaStatements.push(schemaStatement);
    }

    /**
     * Clears all auto-created objects
     */
    protected clearSchema(): void {
        this._schemaStatements = [];
    }

    /**
     * Defines database schema via auto create objects or convenience methods.
     */
    protected defineSchema(): void {
        // Todo: override in chile classes
        this.clearSchema();
    }

    /** 
     * Converts object value from internal to public format.
     * 
     * @param value     an object in internal format to convert.
     * @returns converted object in public format.
     */
    protected convertToPublic(value: any): any {
        if (value == null) return null;
        // Convert to plain object and remove special fields
        value = Object.assign({}, value);
        return value;
    }

    /** 
     * Convert object value from public to internal format.
     * 
     * @param value     an object in public format to convert.
     * @returns converted object in internal format.
     */
    protected convertFromPublic(value: any): any {
        return value;
    }

    protected quoteIdentifier(value: string): string {
        if (value == null || value == "") return value;

        if (value[0] == '"') return value;

        return '"' + value + '"';
    }

    protected quotedTableName(): string {
        if (this._tableName == null) {
            return null;
        }

        let builder = this.quoteIdentifier(this._tableName);
        if (this._keyspaceName != null) {
            builder = this.quoteIdentifier(this._keyspaceName) + "." + this._tableName;
        }
        return builder;
    }

    /**
     * Checks if the component is opened.
     * 
     * @returns true if the component has been opened and false otherwise.
     */
    public isOpen(): boolean {
        return this._opened;
    }

    /**
     * Opens the component.
     * 
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    public async open(correlationId: string): Promise<void> {
        if (this._opened) {
            return;
        }

        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        }

        if (this._localConnection) {
            await this._connection.open(correlationId);
        }

        if (this._connection == null) {
            throw new InvalidStateException(
                correlationId,
                'NO_CONNECTION',
                'Cassandra connection is missing'
            );
        }

        if (!this._connection.isOpen()) {
            throw new ConnectionException(
                correlationId,
                "CONNECT_FAILED",
                "Cassandra connection is not opened"
            );
        }

        this._opened = false;

        this._client = this._connection.getConnection();
        this._datacenter = this._connection.getDatacenter();

        // Define database schema
        this.defineSchema();

        // Recreate objects
        await this.createSchema(correlationId);

        this._opened = true;
        this._logger.debug(correlationId, "Connected to Cassandra cluster %s, table %s", this._datacenter, this.quotedTableName());
    }

    /**
     * Closes component and frees used resources.
     * 
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    public async close(correlationId: string): Promise<void> {
        if (!this._opened) {
            return;
        }

        if (this._connection == null) {
            throw new InvalidStateException(
                correlationId,
                'NO_CONNECTION',
                'Cassandra connection is missing'
            );
        }

        if (this._localConnection) {
            await this._connection.close(correlationId);
        }

        this._opened = false;
        this._client = null;
    }

    /**
     * Clears component state.
     * 
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    public async clear(correlationId: string): Promise<void> {
        // Return error if collection is not set
        if (this._tableName == null) {
            throw new Error('Table name is not defined');
        }

        let query = "TRUNCATE " + this.quotedTableName();
        await this._client.execute(query);
    }

    protected async createSchema(correlationId: string): Promise<void> {
        if (this._schemaStatements == null || this._schemaStatements.length == 0) {
            return null;
        }

        // Check if table exist to determine weither to auto create objects
        let query = "SELECT * FROM " + this.quotedTableName() + " LIMIT 1";
        let keyspaceExist = true;
        let tableExist = true;
        try {
            await this._client.execute(query);
            // If there are no exception, then table already exist and we shall skill the schema creation
            return;
        } catch (ex) {
            let originalMsg: string = ex.message;
            ex.message = ex.message.toLowerCase();

            if (ex.message && ex.message.indexOf("keyspace") >= 0 && ex.message.indexOf("does not exist") > 0) {
                keyspaceExist = false;
            }
            if (ex.message && ex.message.indexOf("table") >= 0 && ex.message.indexOf("does not exist") > 0) {
                tableExist = false;
            }
            if (ex.message && ex.message.indexOf("unconfigured table") >= 0) {
                tableExist = false;
            }

            if (keyspaceExist && tableExist) {
                ex.message = originalMsg;
                throw ex;
            }
        }

        // Create keyspace if it doesn't exist\
        if (!keyspaceExist) {
            query = "CREATE KEYSPACE IF NOT EXISTS " + this._keyspaceName + " WITH replication={'class': 'SimpleStrategy', 'replication_factor': 3}";
            await this._client.execute(query);
        }

        this._logger.debug(correlationId, 'Table ' + this._tableName + ' does not exist. Creating database objects...');

        try {
            // Run all DML commands
            for (let dml of this._schemaStatements) {
                await this._client.execute(dml);
            }
        } catch (ex) {
            this._logger.error(correlationId, ex, 'Failed to autocreate database object');
            throw ex;
        }
    }

    /**
     * Generates a list of column names to use in SQL statements like: "column1,column2,column3"
     * @param values an array with column values or a key-value map
     * @returns a generated list of column names
     */
    protected generateColumns(values: any): string {
        values = !Array.isArray(values) ? Object.keys(values) : values;

        let result = "";
        for (let value of values) {
            if (result != "") result += ",";
            result += this.quoteIdentifier(value);
        }

        return result;
    }

    /**
     * Generates a list of value parameters to use in SQL statements like: "$1,$2,$3"
     * @param values an array with values or a key-value map
     * @returns a generated list of value parameters
     */
    protected generateParameters(values: any): string {
        values = !Array.isArray(values) ? Object.keys(values) : values;

        let index = 1;
        let result = "";
        for (let value of values) {
            if (result != "") result += ",";
            result += "?";
            index++;
        }

        return result;
    }

    /**
     * Generates a list of column sets to use in UPDATE statements like: column1=$1,column2=$2
     * @param values a key-value map with columns and values
     * @returns a generated list of column sets
     */
    protected generateSetParameters(values: any): string {
        let result = "";
        for (let column in values) {
            if (result != "") result += ",";
            result += this.quoteIdentifier(column) + "=?";
        }

        return result;
    }

    /**
     * Generates a list of column parameters
     * @param values a key-value map with columns and values
     * @returns a generated list of column values
     */
    protected generateValues(values: any): any[] {
        return Object.values(values);
    }

    /**
     * Gets a page of data items retrieved by a given filter and sorted according to sort parameters.
     * 
     * This method shall be called by a public getPageByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @param paging            (optional) paging parameters
     * @param sort              (optional) sorting JSON object
     * @param select            (optional) projection JSON object
     * @returns                 the requested data page
     */
    protected async getPageByFilter(correlationId: string, filter: any, paging: PagingParams,
        sort: any, select: any): Promise<DataPage<T>> {

        select = select != null ? select : "*"
        let query = "SELECT " + select + " FROM " + this.quotedTableName();

        // Adjust max item count based on configuration
        paging = paging || new PagingParams();
        let skip = paging.getSkip(-1);
        let take = paging.getTake(this._maxPageSize);
        let pagingEnabled = paging.total;

        if (filter && filter != "") {
            query += " WHERE " + filter;
        }

        if (sort != null) {
            query += " ORDER BY " + sort;
        }

        query += " LIMIT " + (skip + take);

        // Stream for efficiency to quickly skip without retaining rows
        let items = await new Promise<any[]>((resolve, reject) => {
            let items = [];
            this._client.eachRow(
                query, [], { autoPage: true },
                (n, row) => {
                    if (skip > 0) {
                        skip--;
                        return;
                    }
                    if (take == 0) {
                        return;
                    }

                    items.push(row);
                    take--;
                },
                (err) => {
                    if (err != null) reject(err);
                    else resolve(items);
                }
            );
        });

        this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._tableName);

        items = items.map(this.convertToPublic);

        if (pagingEnabled) {
            let query = 'SELECT COUNT(*) FROM ' + this.quotedTableName();
            if (filter != null && filter != "") {
                query += " WHERE " + filter;
            }

            let result = await this._client.execute(query);
            let count = result.rows && result.rows.length == 1
                ? LongConverter.toLong(result.rows[0].count) : 0;

            return new DataPage<T>(items, count);
        } else {
            return new DataPage<T>(items);
        }
    }

    /**
     * Gets a number of data items retrieved by a given filter.
     * 
     * This method shall be called by a public getCountByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @returns                 a number of items that satisfy the filter.
     */
    protected async getCountByFilter(correlationId: string, filter: any): Promise<number> {
        let query = 'SELECT COUNT(*) FROM ' + this.quotedTableName();

        if (filter != null) {
            query += " WHERE " + filter;
        }

        let result = await this._client.execute(query);
        let count = result.rows && result.rows.length == 1
            ? LongConverter.toLong(result.rows[0].count) : 0;

        this._logger.trace(correlationId, "Counted %d items in %s", count, this._tableName);

        return count;
    }

    /**
     * Gets a list of data items retrieved by a given filter and sorted according to sort parameters.
     * 
     * This method shall be called by a public getListByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId    (optional) transaction id to trace execution through call chain.
     * @param filter           (optional) a filter JSON object
     * @param paging           (optional) paging parameters
     * @param sort             (optional) sorting JSON object
     * @param select           (optional) projection JSON object
     * @returns                a list with requested data items.
     */
    protected async getListByFilter(correlationId: string, filter: any,
        sort: any, select: any): Promise<T[]> {

        select = select != null ? select : "*"
        let query = "SELECT " + select + " FROM " + this.quotedTableName();

        if (filter != null) {
            query += " WHERE " + filter;
        }

        if (sort != null) {
            query += " ORDER BY " + sort;
        }

        let result = await this._client.execute(query);
        let items = result.rows;

        this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._tableName);

        items = items.map(this.convertToPublic);
        return items;
    }

    /**
     * Gets a random item from items that match to a given filter.
     * 
     * This method shall be called by a public getOneRandom method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @returns                 a random item that satisfies the filter.
     */
    protected async getOneRandom(correlationId: string, filter: any): Promise<T> {
        let query = 'SELECT COUNT(*) FROM ' + this.quotedTableName();
        if (filter != null) {
            query += " WHERE " + filter;
        }

        let result = await this._client.execute(query);
        let count = result.rows && result.rows.length == 1 ? result.rows[0].count : 0;

        query = "SELECT * FROM " + this.quotedTableName();
        if (filter != null) {
            query += " WHERE " + filter;
        }

        let pos = Math.trunc(Math.random() * count);
        // Limit search a reasonable number
        pos = Math.min(pos, this._maxPageSize);
        query += " LIMIT " + (pos + 1);

        let item = await new Promise<any>((resolve, reject) => {
            let item: any = null;
            this._client.eachRow(
                query, [], { autoPage: true },
                (n, row) => {
                    item = row;
                },
                (err) => {
                    if (err != null) reject(err);
                    else resolve(item);
                }
            );
        });

        if (item == null) {
            this._logger.trace(correlationId, "Random item wasn't found from %s", this._tableName);
        } else {
            this._logger.trace(correlationId, "Retrieved random item from %s", this._tableName);
        }

        item = this.convertToPublic(item);
        return item;
    }

    /**
     * Creates a data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @returns                 the created item.
     */
    public async create(correlationId: string, item: T): Promise<T> {
        if (item == null) {
            return;
        }

        let row = this.convertFromPublic(item);
        let columns = this.generateColumns(row);
        let params = this.generateParameters(row);
        let values = this.generateValues(row);

        let query = "INSERT INTO " + this.quotedTableName()
            + " (" + columns + ") VALUES (" + params + ")";

        await this._client.execute(query, values);

        this._logger.trace(correlationId, "Created in %s with id = %s", this._tableName, row.id);

        return item;
    }

    /**
     * Deletes data items that match to a given filter.
     * 
     * This method shall be called by a public deleteByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object.
     */
    public async deleteByFilter(correlationId: string, filter: any): Promise<void> {
        let query = "DELETE FROM " + this.quotedTableName();
        if (filter != null) {
            query += " WHERE " + filter;
        }

        await this._client.execute(query);

        // We can't optimally determine how many records were deleted.
        this._logger.trace(correlationId, "Deleted a few items from %s", this._tableName);
    }

}
