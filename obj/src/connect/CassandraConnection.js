"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CassandraConnection = void 0;
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_2 = require("pip-services3-commons-nodex");
const pip_services3_components_nodex_1 = require("pip-services3-components-nodex");
const CassandraConnectionResolver_1 = require("./CassandraConnectionResolver");
/**
 * Cassandra connection using plain driver.
 *
 * By defining a connection and sharing it through multiple persistence components
 * you can reduce number of used database connections.
 *
 * ### Configuration parameters ###
 *
 * - connection(s):
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 9042)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                  user name
 *   - password:                  user password
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
 */
class CassandraConnection {
    /**
     * Creates a new instance of the connection component.
     */
    constructor() {
        this._defaultConfig = pip_services3_commons_nodex_1.ConfigParams.fromTuples(
        // connections.*
        // credential.*
        "options.connect_timeout", 0, "options.idle_timeout", 10000, "options.max_pool_size", 3);
        /**
         * The logger.
         */
        this._logger = new pip_services3_components_nodex_1.CompositeLogger();
        /**
         * The connection resolver.
         */
        this._connectionResolver = new CassandraConnectionResolver_1.CassandraConnectionResolver();
        /**
         * The configuration options.
         */
        this._options = new pip_services3_commons_nodex_1.ConfigParams();
    }
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config) {
        config = config.setDefaults(this._defaultConfig);
        this._connectionResolver.configure(config);
        this._options = this._options.override(config.getSection("options"));
    }
    /**
     * Sets references to dependent components.
     *
     * @param references 	references to locate the component dependencies.
     */
    setReferences(references) {
        this._logger.setReferences(references);
        this._connectionResolver.setReferences(references);
    }
    /**
     * Checks if the component is opened.
     *
     * @returns true if the component has been opened and false otherwise.
     */
    isOpen() {
        return this._connection != null;
    }
    composeOptions(config) {
        let maxPoolSize = this._options.getAsNullableInteger("max_pool_size");
        let connectTimeoutMS = this._options.getAsNullableInteger("connect_timeout");
        let idleTimeoutMS = this._options.getAsNullableInteger("idle_timeout");
        let host = config.getAsStringWithDefault("host", "");
        let datacenter = config.getAsNullableString("datacenter");
        let options = {
            contactPoints: host.split(','),
            localDataCenter: datacenter
        };
        let keyspace = config.getAsNullableString("keyspace");
        if (keyspace != null) {
            options.keyspace = keyspace;
        }
        let username = config.getAsNullableString("username");
        let password = config.getAsNullableString("password");
        if (username != null) {
            options.credentials = {
                username: username,
                password: password
            };
        }
        let port = config.getAsIntegerWithDefault("port", 9042);
        options.protocolOptions = {
            port: port
        };
        return options;
    }
    /**
     * Opens the component.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    open(correlationId) {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield this._connectionResolver.resolve(correlationId);
            this._logger.debug(correlationId, "Connecting to cassandra");
            try {
                let options = this.composeOptions(config);
                const cassandra = require('cassandra-driver');
                let client = new cassandra.Client(options);
                // Try to connect
                yield client.connect();
                this._connection = client;
                this._datacenter = options.localDataCenter;
                this._keyspace = options.keyspace;
            }
            catch (ex) {
                throw new pip_services3_commons_nodex_2.ConnectionException(correlationId, "CONNECT_FAILED", "Connection to Cassandra failed").withCause(ex);
            }
        });
    }
    /**
     * Closes component and frees used resources.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     */
    close(correlationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._connection == null) {
                return;
            }
            try {
                yield this._connection.shutdown();
                this._connection = null;
                this._datacenter = null;
            }
            catch (ex) {
                throw new pip_services3_commons_nodex_2.ConnectionException(correlationId, 'DISCONNECT_FAILED', 'Disconnect from Cassandra failed: ').withCause(ex);
            }
        });
    }
    getConnection() {
        return this._connection;
    }
    getDatacenter() {
        return this._datacenter;
    }
    getKeyspace() {
        return this._keyspace;
    }
}
exports.CassandraConnection = CassandraConnection;
//# sourceMappingURL=CassandraConnection.js.map