/** @module connect */
import { IReferenceable } from 'pip-services3-commons-nodex';
import { IReferences } from 'pip-services3-commons-nodex';
import { IConfigurable } from 'pip-services3-commons-nodex';
import { ConfigParams } from 'pip-services3-commons-nodex';
import { ConfigException } from 'pip-services3-commons-nodex';
import { CompositeConnectionResolver } from 'pip-services3-components-nodex';
import { ConnectionParams } from 'pip-services3-components-nodex';
import { CredentialParams } from 'pip-services3-components-nodex';
import { ConnectionUtils } from 'pip-services3-components-nodex';

/**
 * Helper class that resolves Cassandra connection and credential parameters,
 * validates them and generates a connection URI.
 * 
 * It is able to process multiple connections to Cassandra cluster nodes.
 * 
 *  ### Configuration parameters ###
 * 
 * - connection(s):
 *   - discovery_key:               (optional) a key to retrieve the connection from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                        host name or IP address
 *   - port:                        port number (default: 27017)
 *   - database:                    database name
 *   - uri:                         resource URI or connection string with all parameters in it
 * - credential(s):
 *   - store_key:                   (optional) a key to retrieve the credentials from [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                    user name
 *   - password:                    user password
 * 
 * ### References ###
 * 
 * - <code>\*:discovery:\*:\*:1.0</code>             (optional) [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code>      (optional) Credential stores to resolve credentials
 */
export class CassandraConnectionResolver extends CompositeConnectionResolver {

    /**
     * Creates instance of this class.
     */
    public constructor() {
        super();

        this._supportedProtocols = ["cassandra"];
        this._defaultProtocol = "cassandra";
        this._defaultPort = 9042;
    }

    /**
     * Merges connection options with connection parameters
     * This method can be overriden in child classes.
     * 
     * @param options connection options
     * @param connection connection parameters to be merged
     * @returns merged connection options.
     */
     protected mergeConnection(options: ConfigParams, connection: ConnectionParams): ConfigParams {
        let originalOptions: ConfigParams = connection;

        // Process uri if it is set.
        let uri = connection.getUri();
        if (uri != null && uri != "") {
            originalOptions = ConnectionUtils.parseUri(uri, this._defaultProtocol, this._defaultPort);
            originalOptions = ConnectionUtils.rename(originalOptions, "path", "datacenter");
        }

        // Rename common parameters
        originalOptions = ConnectionUtils.rename(originalOptions, "database", "datacenter");

        let mergedOptions = ConnectionUtils.concat(options, originalOptions, "host", "port");
        return mergedOptions;
    }

}
