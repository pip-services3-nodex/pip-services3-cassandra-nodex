"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultCassandraFactory = void 0;
/** @module build */
const pip_services3_components_nodex_1 = require("pip-services3-components-nodex");
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const CassandraConnection_1 = require("../connect/CassandraConnection");
/**
 * Creates Cassandra components by their descriptors.
 *
 * @see [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/classes/build.factory.html Factory]]
 * @see [[CassandraConnection]]
 */
class DefaultCassandraFactory extends pip_services3_components_nodex_1.Factory {
    /**
     * Create a new instance of the factory.
     */
    constructor() {
        super();
        this.registerAsType(DefaultCassandraFactory.CassandraConnectionDescriptor, CassandraConnection_1.CassandraConnection);
    }
}
exports.DefaultCassandraFactory = DefaultCassandraFactory;
DefaultCassandraFactory.CassandraConnectionDescriptor = new pip_services3_commons_nodex_1.Descriptor("pip-services", "connection", "cassandra", "*", "1.0");
//# sourceMappingURL=DefaultCassandraFactory.js.map